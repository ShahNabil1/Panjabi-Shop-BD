CREATE OR REPLACE FUNCTION public.sync_product_stock(_pid uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE has_levels boolean; has_variants boolean;
BEGIN
  IF _pid IS NULL THEN RETURN; END IF;
  SELECT EXISTS (SELECT 1 FROM inventory_levels WHERE product_id = _pid) INTO has_levels;
  IF has_levels THEN
    UPDATE product_variants v
       SET stock = GREATEST(l.qty_on_hand, 0)
      FROM inventory_levels l
     WHERE l.product_id = _pid AND l.variant_id = v.id AND v.stock IS DISTINCT FROM GREATEST(l.qty_on_hand, 0);
  END IF;
  SELECT EXISTS (SELECT 1 FROM product_variants WHERE product_id = _pid AND is_active) INTO has_variants;
  IF has_variants THEN
    UPDATE products SET stock = (SELECT COALESCE(SUM(GREATEST(stock,0)),0) FROM product_variants WHERE product_id = _pid AND is_active)
     WHERE id = _pid;
  ELSIF has_levels THEN
    UPDATE products SET stock = COALESCE((SELECT GREATEST(qty_on_hand,0) FROM inventory_levels WHERE product_id = _pid AND variant_id IS NULL), stock)
     WHERE id = _pid;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trg_sync_stock_levels()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF pg_trigger_depth() > 2 THEN RETURN NULL; END IF;
  PERFORM public.sync_product_stock(COALESCE(NEW.product_id, OLD.product_id));
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.trg_sync_stock_variants()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE pid uuid := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
  UPDATE products SET stock = (SELECT COALESCE(SUM(GREATEST(stock,0)),0) FROM product_variants WHERE product_id = pid AND is_active)
   WHERE id = pid AND EXISTS (SELECT 1 FROM product_variants WHERE product_id = pid AND is_active);
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS sync_stock_from_levels ON public.inventory_levels;
CREATE TRIGGER sync_stock_from_levels AFTER INSERT OR UPDATE OF qty_on_hand OR DELETE ON public.inventory_levels
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_stock_levels();

DROP TRIGGER IF EXISTS sync_product_stock_from_variants ON public.product_variants;
CREATE TRIGGER sync_product_stock_from_variants AFTER INSERT OR UPDATE OF stock, is_active OR DELETE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.trg_sync_stock_variants();

SELECT public.sync_product_stock(id) FROM public.products;