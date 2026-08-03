import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "./admin.server";
import {
  blockSchema,
  idSchema,
  orderCustomerSchema,
  orderDeliveryNoteSchema,
  orderItemsSchema,
  orderNoteSchema,
  smsRetrySchema,
  smsSendSchema,
} from "./admin-schema";

/** Full order workspace payload: order, items, activity, notes, SMS log, block state. */
export const adminOrderWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);

    const { data: order, error } = await db
      .from("orders")
      .select("*, order_items(*), order_activity(id, kind, message, meta, created_at)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) return null;

    const o = order as unknown as Record<string, unknown>;
    const [notes, sms, blocked] = await Promise.all([
      db
        .from("order_notes")
        .select("*")
        .eq("order_id", data.id)
        .order("created_at", { ascending: false }),
      db
        .from("sms_logs")
        .select("*")
        .eq("order_id", data.id)
        .order("created_at", { ascending: false }),
      db
        .from("blocked_identifiers")
        .select("kind, value")
        .in(
          "value",
          [o["customer_ip"], o["device_fingerprint"], o["customer_phone"]].filter(
            (v): v is string => typeof v === "string" && v.length > 0,
          ),
        ),
    ]);

    return {
      order,
      notes: notes.data ?? [],
      sms: sms.data ?? [],
      blocked: (blocked.data ?? []) as Array<{ kind: string; value: string }>,
    };
  });

/** Update the full customer & delivery block of an order. */
export const adminUpdateOrderCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => orderCustomerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { error } = await db
      .from("orders")
      .update({
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        alt_phone: data.altPhone,
        division: data.division || null,
        district: data.district || null,
        upazila: data.upazila || null,
        city: data.district || data.division || "—",
        address_line: data.addressLine,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await db.from("order_activity").insert({
      order_id: data.id,
      kind: "edit",
      message: "Customer & delivery details updated",
    });
    return { ok: true };
  });

/** Delivery note forwarded to the courier partner at booking time. */
export const adminSaveDeliveryNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => orderDeliveryNoteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { error } = await db
      .from("orders")
      .update({ delivery_note: data.deliveryNote || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Replace the order line items and recompute the totals. */
export const adminSaveOrderItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => orderItemsSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);

    const subtotal = data.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const total = Math.max(0, subtotal + data.deliveryCharge - data.discount);

    const del = await db.from("order_items").delete().eq("order_id", data.id);
    if (del.error) throw new Error(del.error.message);

    const ins = await db.from("order_items").insert(
      data.items.map((i) => ({
        order_id: data.id,
        product_id: i.productId,
        product_name: i.productName,
        variant_label: i.variantLabel,
        sku: i.sku,
        unit_price: i.unitPrice,
        quantity: i.quantity,
        line_total: i.unitPrice * i.quantity,
      })),
    );
    if (ins.error) throw new Error(ins.error.message);

    const upd = await db
      .from("orders")
      .update({
        subtotal,
        delivery_charge: data.deliveryCharge,
        discount: data.discount,
        total,
      })
      .eq("id", data.id);
    if (upd.error) throw new Error(upd.error.message);

    await db.from("order_activity").insert({
      order_id: data.id,
      kind: "edit",
      message: `Items updated — new total ${total}`,
    });
    return { ok: true, subtotal, total };
  });

/** Internal staff-only note. Never shown to customers. */
export const adminAddOrderNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => orderNoteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { data: profile } = await db
      .from("profiles")
      .select("full_name")
      .eq("id", context.userId)
      .maybeSingle();
    const { error } = await db.from("order_notes").insert({
      order_id: data.orderId,
      author_id: context.userId,
      author_name: (profile?.full_name as string | null) ?? "Staff",
      body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteOrderNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { error } = await db.from("order_notes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Block or unblock any combination of IP, device fingerprint and phone number. */
export const adminSetBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => blockSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);

    if (data.action === "block") {
      const { error } = await db.from("blocked_identifiers").upsert(
        data.targets.map((t) => ({
          kind: t.kind,
          value: t.value,
          reason: data.reason || null,
          blocked_by: context.userId,
        })),
        { onConflict: "kind,value" },
      );
      if (error) throw new Error(error.message);
    } else {
      for (const t of data.targets) {
        const { error } = await db
          .from("blocked_identifiers")
          .delete()
          .eq("kind", t.kind)
          .eq("value", t.value);
        if (error) throw new Error(error.message);
      }
    }

    await db.from("order_activity").insert({
      order_id: data.orderId,
      kind: "security",
      message: `${data.action === "block" ? "Blocked" : "Unblocked"} ${data.targets
        .map((t) => t.kind)
        .join(", ")}`,
    });
    return { ok: true };
  });

/**
 * Records an outbound SMS. Delivery through BulkSMSBD is wired once the
 * API key and sender ID are provided; until then every attempt is logged
 * as failed so the communication log and retry flow stay accurate.
 */
export const adminSendSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => smsSendSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { data: profile } = await db
      .from("profiles")
      .select("full_name")
      .eq("id", context.userId)
      .maybeSingle();

    const { error } = await db.from("sms_logs").insert({
      order_id: data.orderId,
      phone: data.phone,
      message: data.message,
      status: "failed",
      provider_code: null,
      provider_response: "BulkSMSBD gateway not configured yet",
      segments: Math.max(1, Math.ceil(data.message.length / 160)),
      is_manual: true,
      sent_by: context.userId,
      sent_by_name: (profile?.full_name as string | null) ?? "Staff",
    });
    if (error) throw new Error(error.message);
    return { ok: false, reason: "gateway_not_configured" as const };
  });

/** Retry a failed SMS. Re-attempts through the gateway once it is configured. */
export const adminRetrySms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => smsRetrySchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { data: row, error } = await db
      .from("sms_logs")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("SMS not found");

    const r = row as unknown as Record<string, unknown>;
    const { error: insErr } = await db.from("sms_logs").insert({
      order_id: r["order_id"] as string | null,
      phone: r["phone"] as string,
      message: r["message"] as string,
      status: "failed",
      provider_response: "Retry — BulkSMSBD gateway not configured yet",
      segments: (r["segments"] as number) ?? 1,
      is_manual: true,
      sent_by: context.userId,
      sent_by_name: (r["sent_by_name"] as string | null) ?? "Staff",
    });
    if (insErr) throw new Error(insErr.message);
    return { ok: false, reason: "gateway_not_configured" as const };
  });
