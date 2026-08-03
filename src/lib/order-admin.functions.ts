import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin, actorName, logActivity, diffFields } from "./admin.server";
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

    // Record who opened the order, throttled to one entry per viewer per 15 min.
    const who = await actorName(db, context.userId);
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: recentViews } = await db
      .from("order_activity")
      .select("id, meta")
      .eq("order_id", data.id)
      .eq("kind", "view")
      .gte("created_at", since)
      .limit(20);
    const alreadyViewed = (recentViews ?? []).some(
      (r) => ((r as { meta?: { actor?: string } }).meta?.actor ?? "") === who,
    );
    if (!alreadyViewed) {
      await logActivity(db, data.id, "view", `${who} viewed this order`, { actor: who });
    }

    const [notes, sms, blocked, activity] = await Promise.all([
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
      db
        .from("order_activity")
        .select("id, kind, message, meta, created_at")
        .eq("order_id", data.id)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    return {
      order: { ...(order as object), order_activity: activity.data ?? [] },
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

    const advance = Math.min(data.advanceAmount, total);
    const upd = await db
      .from("orders")
      .update({
        subtotal,
        delivery_charge: data.deliveryCharge,
        discount: data.discount,
        total,
        advance_amount: advance,
        advance_method: advance > 0 ? data.advanceMethod : null,
        payment_method: advance > 0 ? "partial_advance" : "cod",
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

/** Sends an SMS through BulkSMSBD and records it in the communication log. */
export const adminSendSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => smsSendSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { deliverSms, renderSmsTemplate } = await import("./sms.server");
    const { SITE_URL } = await import("./site");
    const { data: profile } = await db
      .from("profiles")
      .select("full_name")
      .eq("id", context.userId)
      .maybeSingle();

    // Resolve {{variables}} against the real order so the log and the SMS match.
    const { data: order } = await db
      .from("orders")
      .select("order_number, customer_name, customer_phone, total")
      .eq("id", data.orderId)
      .maybeSingle();
    const o = (order ?? {}) as unknown as Record<string, unknown>;
    const orderNo = String(o["order_number"] ?? "");
    const message = renderSmsTemplate(data.message, {
      name: String(o["customer_name"] ?? ""),
      order_no: orderNo,
      amount: String(Number(o["total"] ?? 0)),
      phone: String(o["customer_phone"] ?? data.phone),
      receipt_url: orderNo ? `${SITE_URL}/invoice/${orderNo}` : "",
    });

    const result = await deliverSms(db, {
      orderId: data.orderId,
      phone: data.phone,
      message,
      isManual: true,
      sentBy: context.userId,
      sentByName: (profile?.full_name as string | null) ?? "Staff",
    });
    return { ok: result.ok, code: result.code, message: result.message };
  });

/** Retry a failed SMS by re-sending the same message through the gateway. */
export const adminRetrySms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => smsRetrySchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { deliverSms } = await import("./sms.server");
    const { data: row, error } = await db
      .from("sms_logs")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("SMS not found");

    const r = row as unknown as Record<string, unknown>;
    const result = await deliverSms(db, {
      orderId: (r["order_id"] as string | null) ?? null,
      phone: r["phone"] as string,
      message: r["message"] as string,
      isManual: true,
      sentBy: context.userId,
      sentByName: (r["sent_by_name"] as string | null) ?? "Staff",
    });
    return { ok: result.ok, code: result.code, message: result.message };
  });

/** Remaining BulkSMSBD credit balance, shown in the SMS card. */
export const adminSmsBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { getSmsBalance } = await import("./sms.server");
    return getSmsBalance();
  });

