/**
 * Courier webhook processing (server-only).
 *
 * Receives delivery-status callbacks from Steadfast / Pathao / Carrybee,
 * verifies the shared secret configured in Delivery Settings, records the raw
 * event, then syncs the normalised status onto the consignment + order.
 *
 * All database work runs through security-definer routines, so the receiver
 * only needs the public publishable key — never the service-role key.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

import {
  courierStatusLabels,
  normaliseCourierStatus,
  type DeliveryProvider,
} from "./delivery-shared";

/** Fixed value Pathao expects echoed back on every webhook response. */
export const PATHAO_INTEGRATION_SECRET = "f3992ecc-59da-4cbe-a049-a13da2018d51";

type Payload = Record<string, unknown>;

type Db = SupabaseClient<Database>;

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : null;

/** Pulls the provider-specific identifiers + status out of a raw payload. */
export function parseCourierPayload(provider: DeliveryProvider, payload: Payload) {
  if (provider === "pathao") {
    return {
      event: str(payload["event"]),
      consignmentId: str(payload["consignment_id"]),
      merchantOrderId: str(payload["merchant_order_id"]),
      // `order_status` is the human label ("Pickup" for a picked parcel), so the
      // canonical machine values come first: slug, then the event name.
      rawStatus:
        str(payload["order_status_slug"]) ??
        str(payload["event"]) ??
        str(payload["order_status"]) ??
        "",
      message: str(payload["reason"]) ?? str(payload["order_status"]),

    };
  }
  if (provider === "carrybee") {
    const causes = payload["causes"];
    return {
      event: str(payload["event"]),
      consignmentId: str(payload["consignment_id"]),
      merchantOrderId: str(payload["merchant_order_id"]),
      rawStatus: str(payload["event"]) ?? str(payload["status"]) ?? "",
      message:
        str(payload["reason"]) ??
        (Array.isArray(causes) ? causes.map((c) => String(c)).join(", ") : str(causes)) ??
        [str(payload["agent_name"]), str(payload["agent_phone"])].filter(Boolean).join(" · ') ") ??
        null,
    };
  }
  // Steadfast shares a flat delivery-status shape.

  return {
    event: str(payload["notification_type"]) ?? "delivery_status",
    consignmentId: str(payload["consignment_id"]),
    merchantOrderId: str(payload["invoice"]) ?? str(payload["merchant_order_id"]),
    rawStatus:
      str(payload["delivery_status"]) ?? str(payload["status"]) ?? str(payload["order_status"]) ?? "",
    message: str(payload["note"]) ?? str(payload["reason"]),
  };
}

/**
 * Compares the supplied secret with the one an admin saved for this provider.
 * The secret itself never leaves the database.
 */
export async function verifyWebhookSecret(
  db: Db,
  provider: DeliveryProvider,
  supplied: string,
): Promise<"ok" | "invalid" | "unconfigured"> {
  const { data, error } = await db.rpc("courier_webhook_check_secret", {
    _provider: provider,
    _supplied: supplied,
  });
  if (error) return "unconfigured";
  return (data as "ok" | "invalid" | "unconfigured" | null) ?? "unconfigured";
}

/**
 * Stores the raw event, then updates the matching consignment + order.
 * Never throws: webhook senders retry aggressively, so failures are recorded
 * on the event row instead.
 */
export async function processCourierWebhook(
  db: Db,
  provider: DeliveryProvider,
  payload: Payload,
): Promise<{ processed: boolean; message: string }> {
  const parsed = parseCourierPayload(provider, payload);
  const status = parsed.rawStatus ? normaliseCourierStatus(provider, parsed.rawStatus) : "";

  const { data, error } = await db.rpc("courier_webhook_apply", {
    _provider: provider,
    _event: parsed.event ?? "",
    _consignment_id: parsed.consignmentId ?? "",
    _merchant_order_id: parsed.merchantOrderId ?? "",
    _payload: payload as never,
    _status: status,
    _raw_status: parsed.rawStatus,
    _message: parsed.message ?? (status ? courierStatusLabels[status] : ""),
  });

  if (error) return { processed: false, message: error.message };
  const result = data as { processed?: boolean; message?: string } | null;
  return {
    processed: result?.processed ?? false,
    message: result?.message ?? "No response from the database",
  };
}
