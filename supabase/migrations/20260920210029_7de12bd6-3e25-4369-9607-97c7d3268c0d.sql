ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_ip_location jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_blocked_identifiers_kind_value
  ON public.blocked_identifiers (kind, value);

CREATE OR REPLACE FUNCTION public.storefront_security_check(
  _ip text DEFAULT NULL,
  _fingerprint text DEFAULT NULL,
  _phone text DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.blocked_identifiers b
    WHERE (b.kind = 'ip' AND NULLIF(btrim(_ip), '') IS NOT NULL AND b.value = btrim(_ip))
       OR (b.kind = 'fingerprint' AND NULLIF(btrim(_fingerprint), '') IS NOT NULL AND b.value = btrim(_fingerprint))
       OR (b.kind = 'phone' AND NULLIF(btrim(_phone), '') IS NOT NULL AND b.value = btrim(_phone))
  );
$$;

REVOKE ALL ON FUNCTION public.storefront_security_check(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storefront_security_check(text, text, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.checkout_place_order(_order jsonb, _items jsonb, _coupon_id uuid DEFAULT NULL::uuid, _discount numeric DEFAULT 0)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE new_id uuid; new_number text; it jsonb; item_count int := 0;
BEGIN
  IF _items IS NULL OR jsonb_array_length(_items) = 0 THEN RAISE EXCEPTION 'NO_ITEMS'; END IF;
  IF public.storefront_security_check(
    _order->>'customer_ip',
    _order->>'device_fingerprint',
    _order->>'customer_phone'
  ) THEN
    RAISE EXCEPTION 'ORDER_BLOCKED';
  END IF;

  INSERT INTO public.orders (
    customer_name, customer_phone, customer_email, address_line, city,
    division, district, upazila, delivery_area, note,
    subtotal, delivery_charge, discount, total,
    payment_method, status, source, customer_ip, customer_user_agent,
    device_fingerprint, customer_ip_location, attribution
  ) VALUES (
    _order->>'customer_name', _order->>'customer_phone', _order->>'customer_email',
    _order->>'address_line', _order->>'city',
    _order->>'division', _order->>'district', _order->>'upazila',
    _order->>'delivery_area', _order->>'note',
    COALESCE((_order->>'subtotal')::numeric,0), COALESCE((_order->>'delivery_charge')::numeric,0),
    COALESCE((_order->>'discount')::numeric,0), COALESCE((_order->>'total')::numeric,0),
    'cod', 'processing'::order_status, COALESCE(_order->>'source','website'), _order->>'customer_ip',
    left(COALESCE(_order->>'customer_user_agent',''), 500),
    NULLIF(_order->>'device_fingerprint', ''),
    COALESCE(_order->'customer_ip_location', '{}'::jsonb),
    COALESCE(_order->'attribution', '{}'::jsonb)
  ) RETURNING id, order_number INTO new_id, new_number;

  FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
    INSERT INTO public.order_items (order_id, product_id, product_name, product_slug, variant_label, sku, unit_price, quantity, line_total, combo_selections)
    VALUES (new_id, (it->>'product_id')::uuid, it->>'product_name', it->>'product_slug',
            it->>'variant_label', it->>'sku', COALESCE((it->>'unit_price')::numeric,0),
            COALESCE((it->>'quantity')::int,1), COALESCE((it->>'line_total')::numeric,0),
            COALESCE(it->'combo_selections', '[]'::jsonb));
    item_count := item_count + 1;
  END LOOP;

  IF _coupon_id IS NOT NULL THEN
    INSERT INTO public.coupon_redemptions (coupon_id, order_id, phone, discount_amount)
    VALUES (_coupon_id, new_id, _order->>'customer_phone', COALESCE(_discount,0));
  END IF;

  INSERT INTO public.order_activity (order_id, kind, message, meta)
  VALUES (
    new_id, 'status',
    'Order placed by customer · ' || item_count::text || ' item(s) · Total '
      || COALESCE((_order->>'total'), '0')
      || ' · Source ' || COALESCE(_order->>'source','website')
      || COALESCE(' · Customer note: ' || NULLIF(btrim(COALESCE(_order->>'note','')), ''), ''),
    jsonb_build_object(
      'actor', COALESCE(_order->>'customer_name','Customer'),
      'from', NULL, 'to', 'processing',
      'source', COALESCE(_order->>'source','website'),
      'customer_note', NULLIF(btrim(COALESCE(_order->>'note','')), ''),
      'customer_ip', _order->>'customer_ip',
      'device_fingerprint', _order->>'device_fingerprint',
      'customer_ip_location', COALESCE(_order->'customer_ip_location', '{}'::jsonb),
      'attribution', COALESCE(_order->'attribution', '{}'::jsonb),
      'total', COALESCE((_order->>'total')::numeric,0),
      'items', item_count)
  );

  DELETE FROM public.orders
   WHERE customer_phone = _order->>'customer_phone' AND status = 'incomplete'::order_status;

  RETURN jsonb_build_object('id', new_id, 'order_number', new_number);
END $function$;

CREATE OR REPLACE FUNCTION public.checkout_save_incomplete(_existing_id uuid, _order jsonb, _items jsonb, _replace_items boolean, _activity_kind text, _activity_message text, _activity_meta jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE target uuid; it jsonb;
BEGIN
  IF public.storefront_security_check(
    _order->>'customer_ip',
    _order->>'device_fingerprint',
    _order->>'customer_phone'
  ) THEN
    RETURN jsonb_build_object('blocked', true);
  END IF;

  IF _existing_id IS NOT NULL THEN
    target := _existing_id;
    UPDATE public.orders SET
      customer_name = _order->>'customer_name',
      customer_phone = _order->>'customer_phone',
      address_line = _order->>'address_line',
      city = COALESCE(NULLIF(_order->>'district',''), '—'),
      division = NULLIF(_order->>'division',''),
      district = NULLIF(_order->>'district',''),
      upazila = NULLIF(_order->>'upazila',''),
      note = NULLIF(_order->>'note',''),
      subtotal = COALESCE((_order->>'subtotal')::numeric,0),
      total = COALESCE((_order->>'subtotal')::numeric,0),
      source = COALESCE(_order->>'source','website'),
      customer_ip = NULLIF(_order->>'customer_ip',''),
      customer_user_agent = left(COALESCE(_order->>'customer_user_agent',''), 500),
      device_fingerprint = NULLIF(_order->>'device_fingerprint',''),
      customer_ip_location = COALESCE(_order->'customer_ip_location', '{}'::jsonb),
      attribution = COALESCE(_order->'attribution', '{}'::jsonb),
      updated_at = now()
    WHERE id = target;
    IF _replace_items THEN DELETE FROM public.order_items WHERE order_id = target; END IF;
  ELSE
    INSERT INTO public.orders (
      customer_name, customer_phone, address_line, city, division, district, upazila,
      subtotal, delivery_charge, discount, total, payment_method, status, source, note,
      customer_ip, customer_user_agent, device_fingerprint, customer_ip_location, attribution
    ) VALUES (
      _order->>'customer_name', _order->>'customer_phone', _order->>'address_line',
      COALESCE(NULLIF(_order->>'district',''), '—'), NULLIF(_order->>'division',''),
      NULLIF(_order->>'district',''), NULLIF(_order->>'upazila',''),
      COALESCE((_order->>'subtotal')::numeric,0), 0, 0, COALESCE((_order->>'subtotal')::numeric,0),
      'cod', 'incomplete'::order_status, COALESCE(_order->>'source','website'), NULLIF(_order->>'note',''),
      NULLIF(_order->>'customer_ip',''), left(COALESCE(_order->>'customer_user_agent',''), 500),
      NULLIF(_order->>'device_fingerprint',''), COALESCE(_order->'customer_ip_location', '{}'::jsonb),
      COALESCE(_order->'attribution', '{}'::jsonb)
    ) RETURNING id INTO target;
  END IF;

  IF _replace_items THEN
    FOR it IN SELECT * FROM jsonb_array_elements(_items) LOOP
      INSERT INTO public.order_items (order_id, product_id, product_name, product_slug, variant_label, sku, unit_price, quantity, line_total, combo_selections)
      VALUES (target, (it->>'product_id')::uuid, it->>'product_name', it->>'product_slug', it->>'variant_label', it->>'sku',
              COALESCE((it->>'unit_price')::numeric,0), COALESCE((it->>'quantity')::int,1),
              COALESCE((it->>'line_total')::numeric,0), COALESCE(it->'combo_selections','[]'::jsonb));
    END LOOP;
  END IF;

  INSERT INTO public.order_activity (order_id, kind, message, meta)
  VALUES (target, _activity_kind, _activity_message, COALESCE(_activity_meta,'{}'::jsonb));
  RETURN jsonb_build_object('id', target, 'blocked', false);
END $function$;