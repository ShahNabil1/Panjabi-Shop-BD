import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin, unwrap } from "./admin.server";
import {
  adminCreateOrderSchema,
  categorySchema,
  customerLookupSchema,
  faqSchema,
  mirrorLang,
  idSchema,
  landingPageSchema,
  orderListSchema,
  orderStatusSchema,
  productSchema,
  productSearchSchema,
  promotionSchema,
  settingSchema,
  subcategorySchema,
  adminEditOrderSchema,
  webOrderStatuses,
  listOrderStatuses,
  payableStatuses,
} from "./admin-schema";



/** True when the signed-in user holds the admin role. Safe for any logged-in user. */
export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<boolean> => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return Boolean(data);
  });

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context.supabase, context.userId);

    const [products, orders, categories, promotions, recent] = await Promise.all([
      db.from("products").select("id", { count: "exact", head: true }),
      db.from("orders").select("total, status, created_at"),
      db.from("categories").select("id", { count: "exact", head: true }),
      db.from("promotions").select("id", { count: "exact", head: true }),
      db
        .from("orders")
        .select("id, order_number, customer_name, total, status, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const rows = (orders.data ?? []) as Array<{
      total: number | string;
      status: string;
      created_at: string;
    }>;
    const revenue = rows
      .filter((r) => r.status !== "cancelled" && r.status !== "returned")
      .reduce((sum, r) => sum + Number(r.total), 0);
    const pending = rows.filter((r) => r.status === "pending").length;

    return {
      productCount: products.count ?? 0,
      orderCount: rows.length,
      categoryCount: categories.count ?? 0,
      promotionCount: promotions.count ?? 0,
      revenue,
      pending,
      recent: (recent.data ?? []) as Array<{
        id: string;
        order_number: string;
        customer_name: string;
        total: number | string;
        status: string;
        created_at: string;
      }>,
    };
  });

export const adminListOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => orderListSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    let q = db
      .from("orders")
      .select(
        "id, order_number, customer_name, customer_phone, city, total, status, source, customer_ip, created_at, delivery_partner, courier_status, courier_consignment_id, order_consignments(provider, delivery_fee, cod_amount, total_cost, collected_amount, status, payment_invoice_id, paid_at)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.payment) q = q.in("status", [...payableStatuses]);
    else if (data.status) q = q.eq("status", data.status);
    else if (data.bucket)
      q = q.in("status", [...(data.bucket === "web" ? webOrderStatuses : listOrderStatuses)]);
    if (data.search) {
      const s = data.search.replace(/[%,]/g, "");
      q = q.or(
        `order_number.ilike.%${s}%,customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%`,
      );
    }
    const rows = unwrap(await q);
    if (!data.payment) return rows;
    /** Paid = at least one consignment carries a courier payout invoice. */
    const isPaid = (o: unknown) =>
      ((o as { order_consignments?: Array<{ paid_at?: string | null }> }).order_consignments ?? [])
        .some((c) => Boolean(c.paid_at));
    return (rows as unknown[]).filter((o) =>
      data.payment === "paid" ? isPaid(o) : !isPaid(o),
    ) as typeof rows;
  });

export const adminGetOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { data: order, error } = await db
      .from("orders")
      .select(
        "*, order_items(*), order_activity(id, kind, message, meta, created_at), order_consignments(provider, collected_amount, delivery_fee, total_cost, status, return_consignment_id, payment_invoice_id, paid_at)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return order;
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => orderStatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { actorName, logActivity } = await import("./admin.server");
    const who = await actorName(db, context.userId);
    const { data: prev } = await db
      .from("orders")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    const before = (prev as { status?: string } | null)?.status ?? "—";
    const { error } = await db
      .from("orders")
      .update({
        status: data.status,
        ...(data.deliveryPartner ? { delivery_partner: data.deliveryPartner } : {}),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    if (data.deliveryPartner) {
      await logActivity(db, data.id, "courier", `${who} selected ${data.deliveryPartner} as delivery partner`, {
        actor: who,
      });
    }
    await logActivity(
      db,
      data.id,
      "status",
      `${who} changed status ${before} → ${data.status}${data.reason ? ` — ${data.reason}` : ""}`,
      {
        actor: who,
        meta: {
          from: before,
          to: data.status,
          reason: data.reason ?? null,
          skipSms: data.skipSms ?? false,
        },
      },
    );
    if (data.skipSms) {
      await logActivity(db, data.id, "sms", `${who} confirmed without sending SMS`, { actor: who });
    }

    // Auto confirmation SMS once an order moves into the confirmed pipeline.
    if (!data.skipSms && (data.status === "pending" || data.status === "confirmed")) {
      const { data: order } = await db
        .from("orders")
        .select("order_number, customer_name, customer_phone, total, auto_sms_status")
        .eq("id", data.id)
        .maybeSingle();
      const o = order as unknown as Record<string, unknown> | null;
      // Template body + auto-send toggle live in Settings → SMS Templates.
      const { data: tplRow } = await db
        .from("sms_templates")
        .select("body, enabled")
        .eq("key", "order_confirm")
        .maybeSingle();
      const tplData = tplRow as { body?: string; enabled?: boolean } | null;
      const autoEnabled = tplData?.enabled !== false;

      if (o && autoEnabled && o["auto_sms_status"] !== "sent") {
        const { deliverSms, renderSmsTemplate } = await import("./sms.server");
        const { SITE_URL } = await import("./site");
        const tpl = tplData?.body ?? "";
        const orderNo = String(o["order_number"] ?? "");
        const message = renderSmsTemplate(tpl, {
          name: String(o["customer_name"] ?? ""),
          order_no: orderNo,
          amount: String(Number(o["total"] ?? 0)),
          phone: String(o["customer_phone"] ?? ""),
          receipt_url: orderNo ? `${SITE_URL}/invoice/${orderNo}` : "",
        });
        const result = await deliverSms(db, {
          orderId: data.id,
          phone: String(o["customer_phone"] ?? ""),
          message,
          isManual: false,
          sentByName: "System",
        });
        await db
          .from("orders")
          .update({ auto_sms_status: result.ok ? "sent" : "failed" })
          .eq("id", data.id);
        await db.from("order_activity").insert({
          order_id: data.id,
          kind: "sms",
          message: `Auto confirmation SMS ${result.ok ? "sent" : "failed"} — ${result.message}`,
        });
      }
    }
    return { ok: true };
  });


/** Edit the customer details of a web/incomplete order before confirming it. */
export const adminEditOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => adminEditOrderSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { data: current, error: readError } = await db
      .from("orders")
      .select("subtotal")
      .eq("id", data.id)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!current) throw new Error("Order not found");

    const subtotal = Number(current.subtotal ?? 0);
    const total = Math.max(0, subtotal + data.deliveryCharge - data.discount);
    const { error } = await db
      .from("orders")
      .update({
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        address_line: data.addressLine,
        note: data.note || null,
        discount: data.discount,
        delivery_charge: data.deliveryCharge,
        total,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await db.from("order_activity").insert({
      order_id: data.id,
      kind: "edit",
      message: "Order details updated by admin",
    });
    return { ok: true };
  });

export const adminTaxonomy = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const [categories, subcategories] = await Promise.all([
      db.from("categories").select("*").order("sort_order"),
      db.from("subcategories").select("*").order("sort_order"),
    ]);
    if (categories.error) throw new Error(categories.error.message);
    if (subcategories.error) throw new Error(subcategories.error.message);
    return { categories: categories.data, subcategories: subcategories.data };
  });

export const adminSaveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => categorySchema.parse(mirrorLang(input)))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    const res = id
      ? await db.from("categories").update(rest).eq("id", id).select("id").single()
      : await db.from("categories").insert(rest).select("id").single();
    if (res.error) throw new Error(res.error.message);
    return res.data;
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { error } = await db.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSaveSubcategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => subcategorySchema.parse(mirrorLang(input)))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    const res = id
      ? await db.from("subcategories").update(rest).eq("id", id).select("id").single()
      : await db.from("subcategories").insert(rest).select("id").single();
    if (res.error) throw new Error(res.error.message);
    return res.data;
  });

export const adminDeleteSubcategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { error } = await db.from("subcategories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    return unwrap(
      await db
        .from("products")
        .select(
          "id, slug, name_bn, name_en, price, compare_at_price, stock, is_active, is_featured, sort_order, category_id, subcategory_id, product_images(url, sort_order)",
        )
        .order("sort_order")
        .limit(500),
    );
  });

export const adminGetProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { data: product, error } = await db
      .from("products")
      .select("*, product_images(*), product_variants(*)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return product;
  });

export const adminSaveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => productSchema.parse(mirrorLang(input)))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { id, images, variants, ...rest } = data;
    const payload = { ...rest, specs: rest.specs, faq: rest.faq };

    const res = id
      ? await db.from("products").update(payload).eq("id", id).select("id").single()
      : await db.from("products").insert(payload).select("id").single();
    if (res.error) throw new Error(res.error.message);
    const productId = res.data.id as string;

    await db.from("product_images").delete().eq("product_id", productId);
    if (images.length) {
      const ins = await db
        .from("product_images")
        .insert(images.map((img, i) => ({ ...img, sort_order: i, product_id: productId })));
      if (ins.error) throw new Error(ins.error.message);
    }

    await db.from("product_variants").delete().eq("product_id", productId);
    if (variants.length) {
      const ins = await db
        .from("product_variants")
        .insert(variants.map((v, i) => ({ ...v, sort_order: i, product_id: productId })));
      if (ins.error) throw new Error(ins.error.message);
    }

    return { id: productId };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    await db.from("product_images").delete().eq("product_id", data.id);
    await db.from("product_variants").delete().eq("product_id", data.id);
    await db.from("promotion_products").delete().eq("product_id", data.id);
    await db.from("landing_pages").delete().eq("product_id", data.id);
    const { error } = await db.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListPromotions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    return unwrap(
      await db
        .from("promotions")
        .select("*, promotion_products(product_id, sort_order)")
        .order("sort_order"),
    );
  });

export const adminSavePromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => promotionSchema.parse(mirrorLang(input)))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { id, product_ids, ...rest } = data;
    const res = id
      ? await db.from("promotions").update(rest).eq("id", id).select("id").single()
      : await db.from("promotions").insert(rest).select("id").single();
    if (res.error) throw new Error(res.error.message);
    const promotionId = res.data.id as string;

    await db.from("promotion_products").delete().eq("promotion_id", promotionId);
    if (product_ids.length) {
      const ins = await db.from("promotion_products").insert(
        product_ids.map((productId, i) => ({
          promotion_id: promotionId,
          product_id: productId,
          sort_order: i,
        })),
      );
      if (ins.error) throw new Error(ins.error.message);
    }
    return { id: promotionId };
  });

export const adminDeletePromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    await db.from("promotion_products").delete().eq("promotion_id", data.id);
    const { error } = await db.from("promotions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListLandingPages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    return unwrap(await db.from("landing_pages").select("*").order("created_at"));
  });

export const adminSaveLandingPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => landingPageSchema.parse(mirrorLang(input)))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { id, bullets, seo, ...rest } = data;
    const payload = { ...rest, content: { bullets, seo } };

    const res = id
      ? await db.from("landing_pages").update(payload).eq("id", id).select("id").single()
      : await db.from("landing_pages").insert(payload).select("id").single();
    if (res.error) throw new Error(res.error.message);
    return res.data;
  });

export const adminDeleteLandingPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { error } = await db.from("landing_pages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListFaqs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    return unwrap(await db.from("faqs").select("*").order("sort_order"));
  });

export const adminSaveFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => faqSchema.parse(mirrorLang(input)))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    const res = id
      ? await db.from("faqs").update(rest).eq("id", id).select("id").single()
      : await db.from("faqs").insert(rest).select("id").single();
    if (res.error) throw new Error(res.error.message);
    return res.data;
  });

export const adminDeleteFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { error } = await db.from("faqs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    return unwrap(await db.from("site_settings").select("*").order("key"));
  });

export const adminSaveSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => settingSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { error } = await db
      .from("site_settings")
      .upsert(
        { key: data.key, value: data.value as never },
        { onConflict: "key" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Product search for the manual order builder — matches product name or SKU. */
export const adminSearchProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => productSearchSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const q = data.query.replace(/[%,]/g, "").trim();
    let query = db
      .from("products")
      .select(
        "id, name_bn, name_en, sku, price, stock, product_images(url, sort_order), product_variants(id, value_bn, group_name_bn, sku, price_delta, stock, is_active)",
      )
      .eq("is_active", true)
      .order("sort_order")
      .limit(20);
    if (q) query = query.or(`name_bn.ilike.%${q}%,name_en.ilike.%${q}%,sku.ilike.%${q}%`);
    return unwrap(await query);
  });

/** Most recent order for a phone number — powers the "Fill" auto-complete button. */
export const adminLookupCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => customerLookupSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { data: rows } = await db
      .from("orders")
      .select("customer_name, customer_phone, address_line, city, note, source, created_at")
      .eq("customer_phone", data.phone)
      .order("created_at", { ascending: false })
      .limit(1);
    const last = rows?.[0];
    if (!last) return null;
    const { count } = await db
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_phone", data.phone);
    return { ...last, orderCount: count ?? 1 };
  });

/** Creates a manual (admin-placed) order. Prices are re-resolved server-side. */
export const adminCreateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => adminCreateOrderSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);

    const productIds = [...new Set(data.items.map((i) => i.productId))];
    const variantIds = [
      ...new Set(data.items.map((i) => i.variantId).filter((v): v is string => Boolean(v))),
    ];

    const [productsRes, variantsRes] = await Promise.all([
      db.from("products").select("id, slug, name_bn, price, sku").in("id", productIds),
      variantIds.length
        ? db
            .from("product_variants")
            .select("id, product_id, group_name_bn, value_bn, sku, price_delta")
            .in("id", variantIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (productsRes.error) throw new Error(productsRes.error.message);

    const products = productsRes.data ?? [];
    const variants = (variantsRes.data ?? []) as Array<{
      id: string;
      product_id: string;
      group_name_bn: string;
      value_bn: string;
      sku: string | null;
      price_delta: number | string;
    }>;

    const lines = data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new Error("Product not found");
      const variant = item.variantId ? variants.find((v) => v.id === item.variantId) : null;
      const unitPrice = item.unitPrice;
      return { product, variant, quantity: item.quantity, unitPrice, lineTotal: unitPrice * item.quantity };
    });

    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const total = Math.max(0, subtotal + data.deliveryCharge - data.discount);

    const { data: order, error } = await db
      .from("orders")
      .insert({
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        address_line: data.addressLine,
        city: data.district,
        division: data.division,
        district: data.district,
        upazila: data.upazila,
        delivery_area: data.district === "ঢাকা" ? "inside_dhaka" : "outside_dhaka",
        note: data.note || null,
        subtotal,
        delivery_charge: data.deliveryCharge,
        discount: data.discount,
        total,
        advance_amount: data.advanceAmount,
        advance_method: data.advanceAmount > 0 ? data.advanceMethod : null,
        delivery_partner: data.deliveryPartner,
        payment_method: data.advanceAmount > 0 ? "partial_advance" : "cod",
        status: "pending",
        source: data.source,
      })
      .select("id, order_number")
      .single();
    if (error || !order) throw new Error(error?.message ?? "Order creation failed");

    const { error: itemsError } = await db.from("order_items").insert(
      lines.map((l) => ({
        order_id: order.id,
        product_id: l.product.id,
        product_name: l.product.name_bn,
        product_slug: l.product.slug,
        variant_label: l.variant ? `${l.variant.group_name_bn}: ${l.variant.value_bn}` : null,
        sku: l.variant?.sku ?? l.product.sku,
        unit_price: l.unitPrice,
        quantity: l.quantity,
        line_total: l.lineTotal,
      })),
    );
    if (itemsError) throw new Error(itemsError.message);

    return { id: order.id as string, orderNumber: order.order_number as string };
  });
