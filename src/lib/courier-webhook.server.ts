/**
 * Courier webhook processing (server-only).
 *
 * Receives delivery-status callbacks from Steadfast / Pathao / Carrybee,
 * verifies the shared secret configured in Delivery Settings, records the raw
 * event, then syncs the normalised status onto the consignment + order.
 */

import { normaliseCourierStatus, type DeliveryProvider } from "./delivery-shared";

/** Fixed value Pathao expects echoed back on every webhook response. */
export const PATHAO_INTEGRATION_SECRET = "f3992ecc-59da-4cbe-a049-a13da2018d51";

type Payload = Record<string, unknown>;

type AdminDb = Awaited<
  typeof import("@/integrations/supabase/client.server")
>["supabaseAdmin"];

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null;

/** Pulls the provider-specific identifiers + status out of a raw payload. */
export function parseCourierPayload(provider: DeliveryProvider, payload: Payload) {
  if (provider === "pathao") {
    return {
      event: str(payload["event"]),
      consignmentId: str(payload["consignment_id"]),
      merchantOrderId: str(payload["merchant_order_id"]),
      rawStatus: str(payload["order_status"]) ?? str(payload["event"]) ?? "",
      message: str(payload["reason"]) ?? str(payload["order_status"]),
    };
  }
  // Steadfast + Carrybee share a flat delivery-status shape.
  return {
    event: str(payload["notification_type"]) ?? "delivery_status",
    consignmentId: str(payload["consignment_id"]),
    merchantOrderId: str(payload["invoice"]) ?? str(payload["merchant_order_id"]),
    rawStatus:
      str(payload["delivery_status"]) ?? str(payload["status"]) ?? str(payload["order_status"]) ?? "",
    message: str(payload["note"]) ?? str(payload["reason"]),
  };
}

/** Order status applied automatically once a courier reaches a terminal state. */
type OrderStatusValue = "delivered" | "returned" | "cancelled";

function orderStatusFor(courierStatus: string): OrderStatusValue | null {
  switch (courierStatus) {
    case "delivered":
    case "partial_delivered":
      return "delivered";
    case "returned":
      return "returned";
    case "cancelled":
      return "cancelled";
    default:
      return null;
  }
}

/** Reads the shared secret an admin saved for this provider. */
export async function partnerWebhookSecret(
  db: AdminDb,
  provider: DeliveryProvider,
): Promise<string | null> {
  const { data } = await db
    .from("delivery_partners")
    .select("webhook_secret")
    .eq("provider", provider)
    .maybeSingle();
  return (data as { webhook_secret?: string | null } | null)?.webhook_secret ?? null;
}

/**
 * Stores the raw event, then updates the matching consignment + order.
 * Never throws: webhook senders retry aggressively, so failures are recorded
 * on the event row instead.
 */
export async function processCourierWebhook(
  db: AdminDb,
  provider: DeliveryProvider,
  payload: Payload,
): Promise<{ processed: boolean; message: string }> {
  const parsed = parseCourierPayload(provider, payload);
  const { data: eventRow } = await db
    .from("courier_webhook_events")
    .insert({
      provider,
      event: parsed.event,
      consignment_id: parsed.consignmentId,
      merchant_order_id: parsed.merchantOrderId,
      payload: payload as never,
      processed: false,
    })
    .select("id")
    .maybeSingle();
  const eventId = (eventRow as { id?: string } | null)?.id ?? null;

  const finish = async (processed: boolean, message: string) => {
    if (eventId) {
      await db
        .from("courier_webhook_events")
        .update({ processed, error: processed ? null : message })
        .eq("id", eventId);
    }
    return { processed, message };
  };

  if (!parsed.rawStatus) return finish(true, "No status in payload — logged only");

  // Locate the order: consignment id first, then the merchant order number.
  let orderId: string | null = null;
  if (parsed.consignmentId) {
    const { data } = await db
      .from("order_consignments")
      .select("order_id")
      .eq("consignment_id", parsed.consignmentId)
      .maybeSingle();
    orderId = (data as { order_id?: string } | null)?.order_id ?? null;
  }
  if (!orderId && parsed.merchantOrderId) {
    const { data } = await db
      .from("orders")
      .select("id")
      .eq("order_number", parsed.merchantOrderId)
      .maybeSingle();
    orderId = (data as { id?: string } | null)?.id ?? null;
  }
  if (!orderId) return finish(false, "No matching order found for this event");

  const status = normaliseCourierStatus(provider, parsed.rawStatus);

  await db
    .from("order_consignments")
    .update({
      status,
      status_message: parsed.message ?? parsed.rawStatus,
      raw: payload as never,
      ...(parsed.consignmentId ? { consignment_id: parsed.consignmentId } : {}),
    })
    .eq("order_id", orderId)
    .eq("provider", provider);

  const nextOrderStatus = orderStatusFor(status);
  await db
    .from("orders")
    .update({
      courier_status: status,
      ...(parsed.consignmentId ? { courier_consignment_id: parsed.consignmentId } : {}),
      ...(nextOrderStatus ? { status: nextOrderStatus } : {}),
    })
    .eq("id", orderId);

  await db.from("order_activity").insert({
    order_id: orderId,
    kind: "courier",
    message: `${provider} update: ${parsed.rawStatus}${parsed.message ? ` — ${parsed.message}` : ""}`,
    meta: {
      actor: `${provider} webhook`,
      provider,
      status,
      raw_status: parsed.rawStatus,
      consignment_id: parsed.consignmentId,
    } as never,
  });

  return finish(true, `Order updated to ${status}`);
}
