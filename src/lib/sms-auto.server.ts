import type { Db } from "./admin.server";

/** Order status → automatic SMS template key. */
const STATUS_KEYS: Record<string, string> = {
  shipped: "shipped",
  cancelled: "order_cancelled",
  pre_order: "pre_order",
  scheduled_order: "scheduled_order",
};

function dhakaDate(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Sends the automatic SMS tied to an order status (if its template is on).
 * Sent at most once per template per order. Never throws.
 */
export async function sendAutoStatusSms(db: Db, orderId: string, status: string): Promise<void> {
  const key = STATUS_KEYS[status];
  if (!key) return;
  try {
    const { data: tpl } = await db
      .from("sms_templates")
      .select("body, enabled")
      .eq("key", key)
      .maybeSingle();
    const t = tpl as { body?: string; enabled?: boolean } | null;
    if (!t || t.enabled === false || !t.body) return;

    const { data: prior } = await db
      .from("order_activity")
      .select("id")
      .eq("order_id", orderId)
      .eq("kind", "sms")
      .contains("meta", { auto_key: key })
      .limit(1);
    if (prior && prior.length) return;

    const { data: order } = await db
      .from("orders")
      .select(
        "order_number, customer_name, customer_phone, total, address_line, upazila, district, scheduled_for, order_items(product_name, variant_label, quantity)",
      )
      .eq("id", orderId)
      .maybeSingle();
    const o = order as unknown as Record<string, unknown> | null;
    if (!o || !o["customer_phone"]) return;

    const { renderSmsTemplate, orderSmsVars } = await import("./sms-template");
    const items = ((o["order_items"] as Array<Record<string, unknown>>) ?? [])
      .map(
        (i) =>
          `${String(i["product_name"] ?? "")}${i["variant_label"] ? ` (${String(i["variant_label"])})` : ""} x${Number(i["quantity"] ?? 1)}`,
      )
      .join(", ");
    const vars = {
      ...orderSmsVars(o as never),
      items,
      address: [o["address_line"], o["upazila"], o["district"]].filter(Boolean).join(", "),
      scheduled_date: dhakaDate(o["scheduled_for"]),
    };
    const message = renderSmsTemplate(t.body, vars);
    const { deliverSms } = await import("./sms.server");
    const result = await deliverSms(db, {
      orderId,
      phone: String(o["customer_phone"]),
      message,
      isManual: false,
      sentByName: "System",
    });
    await db.from("order_activity").insert({
      order_id: orderId,
      kind: "sms",
      message: `Auto ${key.replace(/_/g, " ")} SMS ${result.ok ? "sent" : "failed"} — ${result.message}`,
      meta: { actor: "System", auto_key: key },
    });
  } catch {
    // SMS problems must never break the order flow.
  }
}
