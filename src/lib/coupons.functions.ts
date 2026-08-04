import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin, unwrap } from "./admin.server";

export type CouponDiscountType = "percent" | "flat";
export type CouponAppliesTo = "all" | "products" | "categories";
export type CouponTargetType = "product" | "category";

export type CouponRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  cap_amount: number | null;
  min_spend: number;
  max_uses_total: number | null;
  max_uses_per_customer: number | null;
  applies_to: CouponAppliesTo;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  exclude_shipping: boolean;
  uses_count: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  targets: Array<{ target_type: CouponTargetType; target_id: string }>;
};

/** Uppercase A-Z and 0-9 only — matches the client-side input mask. */
export const COUPON_CODE_RE = /^[A-Z0-9]{3,24}$/;

export const couponCodeSchema = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase().replace(/[^A-Z0-9]/g, ""))
  .refine((v) => COUPON_CODE_RE.test(v), "Use 3-24 capital English letters or digits only");

const upsertSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  code: couponCodeSchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  discount_type: z.enum(["percent", "flat"]),
  discount_value: z.number().positive(),
  cap_amount: z.number().positive().optional().nullable(),
  min_spend: z.number().nonnegative().default(0),
  max_uses_total: z.number().int().positive().optional().nullable(),
  max_uses_per_customer: z.number().int().positive().optional().nullable(),
  applies_to: z.enum(["all", "products", "categories"]),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  exclude_shipping: z.boolean().default(true),
  targets: z
    .array(
      z.object({
        target_type: z.enum(["product", "category"]),
        target_id: z.string().uuid(),
      }),
    )
    .default([]),
});

export type CouponUpsertInput = z.infer<typeof upsertSchema>;

export const adminListCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CouponRow[]> => {
    const db = await requireAdmin(context.supabase, context.userId);
    const rows = unwrap(
      await db
        .from("coupons")
        .select("*, coupon_targets(target_type, target_id)")
        .order("created_at", { ascending: false })
        .limit(500),
    ) as unknown as Array<Record<string, unknown>>;

    return rows.map((r) => ({
      ...(r as unknown as CouponRow),
      discount_value: Number(r["discount_value"]),
      cap_amount: r["cap_amount"] == null ? null : Number(r["cap_amount"]),
      min_spend: Number(r["min_spend"] ?? 0),
      targets: (r["coupon_targets"] ?? []) as CouponRow["targets"],
    }));
  });

export const adminSaveCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => upsertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);

    const payload = {
      code: data.code,
      name: data.name,
      description: data.description || null,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      cap_amount: data.discount_type === "percent" ? (data.cap_amount ?? null) : null,
      min_spend: data.min_spend ?? 0,
      max_uses_total: data.max_uses_total ?? null,
      max_uses_per_customer: data.max_uses_per_customer ?? null,
      applies_to: data.applies_to,
      starts_at: data.starts_at || null,
      ends_at: data.ends_at || null,
      is_active: data.is_active,
      exclude_shipping: data.exclude_shipping,
    };

    let couponId = data.id ?? null;
    if (couponId) {
      const { error } = await db.from("coupons").update(payload).eq("id", couponId);
      if (error) throw new Error(error.message);
    } else {
      const { data: row, error } = await db
        .from("coupons")
        .insert({ ...payload, created_by: context.userId })
        .select("id")
        .single();
      if (error) {
        throw new Error(
          error.code === "23505" ? "A coupon with this code already exists" : error.message,
        );
      }
      couponId = row.id;
    }

    await db.from("coupon_targets").delete().eq("coupon_id", couponId);
    if (data.applies_to !== "all" && data.targets.length) {
      const { error } = await db.from("coupon_targets").insert(
        data.targets.map((t) => ({
          coupon_id: couponId,
          target_type: t.target_type,
          target_id: t.target_id,
        })),
      );
      if (error) throw new Error(error.message);
    }

    return { id: couponId };
  });

export const adminToggleCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { error } = await db
      .from("coupons")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { error } = await db
      .from("coupons")
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRestoreCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { error } = await db
      .from("coupons")
      .update({ deleted_at: null, is_active: true })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Public validation (checkout + landing page) ----------

export type CouponValidation = {
  ok: boolean;
  discount: number;
  code: string | null;
  name: string | null;
  discountType: CouponDiscountType | null;
  reason: string | null;
  minSpend?: number;
};

const validateSchema = z.object({
  code: z.string().trim().min(1).max(40),
  subtotal: z.number().nonnegative(),
  productIds: z.array(z.string().uuid()).max(30).default([]),
  phone: z.string().trim().max(20).optional().nullable(),
});

/**
 * Server-authoritative coupon check. The same routine runs again inside
 * placeOrder, so a tampered client can never award itself a discount.
 */
export async function evaluateCoupon(input: {
  code: string;
  subtotal: number;
  productIds: string[];
  phone: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
}): Promise<CouponValidation & { couponId: string | null }> {
  const fail = (reason: string): CouponValidation & { couponId: string | null } => ({
    ok: false,
    discount: 0,
    code: null,
    name: null,
    discountType: null,
    reason,
    couponId: null,
  });

  const code = input.code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!COUPON_CODE_RE.test(code)) return fail("not_found");

  const { data, error } = await input.db.rpc("validate_coupon", {
    _code: code,
    _subtotal: input.subtotal,
    _product_ids: input.productIds,
    _phone: input.phone,
  });
  if (error) return fail("error");

  const r = (data ?? {}) as Record<string, unknown>;
  if (!r["ok"]) return fail(String(r["reason"] ?? "error"));

  return {
    ok: true,
    discount: Number(r["discount"] ?? 0),
    code: (r["code"] as string) ?? code,
    name: (r["name"] as string) ?? null,
    discountType: (r["discount_type"] as CouponDiscountType) ?? null,
    reason: null,
    couponId: (r["coupon_id"] as string) ?? null,
    ...(r["min_spend"] != null ? { minSpend: Number(r["min_spend"]) } : {}),
  };
}

export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => validateSchema.parse(input))
  .handler(async ({ data }): Promise<CouponValidation> => {
    const { createPublicServerClient } = await import("./supabase-public");
    const result = await evaluateCoupon({
      code: data.code,
      subtotal: data.subtotal,
      productIds: data.productIds,
      phone: data.phone || null,
      db: createPublicServerClient(),
    });
    const { couponId: _couponId, ...rest } = result;
    return rest;
  });
