import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin, unwrap } from "./admin.server";
import {
  categorySchema,
  faqSchema,
  idSchema,
  landingPageSchema,
  orderListSchema,
  orderStatusSchema,
  productSchema,
  promotionSchema,
  settingSchema,
  subcategorySchema,
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
        "id, order_number, customer_name, customer_phone, city, total, status, source, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    if (data.search) {
      const s = data.search.replace(/[%,]/g, "");
      q = q.or(
        `order_number.ilike.%${s}%,customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%`,
      );
    }
    return unwrap(await q);
  });

export const adminGetOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { data: order, error } = await db
      .from("orders")
      .select("*, order_items(*)")
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
    const { error } = await db.from("orders").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
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
  .inputValidator((input: unknown) => categorySchema.parse(input))
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
  .inputValidator((input: unknown) => subcategorySchema.parse(input))
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
  .inputValidator((input: unknown) => productSchema.parse(input))
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
  .inputValidator((input: unknown) => promotionSchema.parse(input))
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
  .inputValidator((input: unknown) => landingPageSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { id, bullets, ...rest } = data;
    const payload = { ...rest, content: { bullets } };
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
  .inputValidator((input: unknown) => faqSchema.parse(input))
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
