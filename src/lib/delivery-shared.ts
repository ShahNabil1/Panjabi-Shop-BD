/**
 * Shared (client + server safe) delivery-partner metadata.
 * Providers: Steadfast, Pathao, Carrybee.
 */

export const DELIVERY_PROVIDERS = ["steadfast", "pathao", "carrybee"] as const;
export type DeliveryProvider = (typeof DELIVERY_PROVIDERS)[number];

export const providerLabels: Record<DeliveryProvider, string> = {
  steadfast: "Steadfast",
  pathao: "Pathao",
  carrybee: "Carrybee",
};

export type CredentialField = {
  key: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
  optional?: boolean;
  hint?: string;
};

/** Credential inputs shown per provider — mirrors each provider's API docs. */
export const providerFields: Record<DeliveryProvider, CredentialField[]> = {
  steadfast: [
    { key: "api_key", label: "API Key", placeholder: "Api-Key from Steadfast portal", secret: true },
    { key: "secret_key", label: "Secret Key", placeholder: "Secret-Key from Steadfast portal", secret: true },
  ],
  pathao: [
    { key: "client_id", label: "Client ID", placeholder: "Pathao client id", secret: true },
    { key: "client_secret", label: "Client Secret", placeholder: "Pathao client secret", secret: true },
    { key: "username", label: "Merchant Email", placeholder: "merchant@example.com" },
    { key: "password", label: "Merchant Password", placeholder: "••••••••", secret: true },
  ],
  carrybee: [
    { key: "base_url", label: "Base URL", placeholder: "https://api.carrybee.com" },
    { key: "api_key", label: "API Key / Token", placeholder: "Merchant API token", secret: true },
    { key: "secret_key", label: "Secret Key", placeholder: "Optional secret", secret: true, optional: true },
  ],
};

/** Normalised courier status used across the admin UI. */
export type CourierStatus =
  | "pending"
  | "in_review"
  | "picked"
  | "in_transit"
  | "delivered"
  | "partial_delivered"
  | "hold"
  | "return_in_transit"
  | "returned"
  | "cancelled"
  | "lost"
  | "unknown";

export const courierStatusLabels: Record<CourierStatus, string> = {
  pending: "Pending",
  in_review: "In review",
  picked: "Picked up",
  in_transit: "In transit",
  delivered: "Delivered",
  partial_delivered: "Partial delivered",
  hold: "On hold",
  return_in_transit: "Return in transit",
  returned: "Returned",
  cancelled: "Cancelled",
  lost: "Lost / damaged",
  unknown: "Unknown",
};

/**
 * Order status each normalised courier status drives.
 * `null` means the courier event is informational only — the order keeps
 * whatever status it already has. Mirrors `courier_webhook_apply` in the DB.
 */
export const courierToOrderStatus: Record<CourierStatus, string | null> = {
  pending: null,
  in_review: null,
  hold: null,
  unknown: null,
  picked: "shipped",
  in_transit: "shipped",
  delivered: "delivered",
  partial_delivered: "partial_delivered",
  return_in_transit: "awaiting_return",
  returned: "returned",
  cancelled: "cancelled",
  lost: "lost_damaged",
};

/** Maps a raw provider status string to our normalised status. */
export function normaliseCourierStatus(provider: DeliveryProvider, raw: string): CourierStatus {
  const s = raw.toLowerCase().replace(/[\s-]+/g, "_");
  if (provider === "pathao") {
    const map: Record<string, CourierStatus> = {
      "order.created": "pending",
      "order.updated": "pending",
      "order.pickup_requested": "pending",
      "order.assigned_for_pickup": "pending",
      "order.pickup_failed": "hold",
      "order.pickup_cancelled": "cancelled",
      "order.picked": "picked",
      "order.at_the_sorting_hub": "in_transit",
      "order.in_transit": "in_transit",
      "order.received_at_last_mile_hub": "in_transit",
      "order.assigned_for_delivery": "in_transit",
      "order.exchange": "in_transit",
      "order.delivered": "delivered",
      "order.partial_delivery": "partial_delivered",
      "order.delivery_failed": "hold",
      "order.on_hold": "hold",
      // Return journey: in transit back to the merchant, then finally handed over.
      "order.return": "return_in_transit",
      "order.returned": "return_in_transit",
      "order.return_in_transit": "return_in_transit",
      "order.pickup_failed_and_return": "return_in_transit",
      "order.delivery_failed_and_return": "return_in_transit",
      "order.returned_to_merchant": "returned",
      "order.return_completed": "returned",
      "order.paid_return": "returned",
      "order.lost": "lost",
      "order.damaged": "lost",
      "order.lost_or_damaged": "lost",
    };
    // Pathao sends either `order.picked` (event) or `Picked` (order_status).
    const key = s.startsWith("order.") ? s : `order.${s}`;
    return map[key] ?? genericStatus(s.replace(/^order\./, ""));
  }

  return genericStatus(s);
}

function genericStatus(s: string): CourierStatus {
  const map: Record<string, CourierStatus> = {
    pending: "pending",
    in_review: "in_review",
    review: "in_review",
    picked: "picked",
    picked_up: "picked",
    in_transit: "in_transit",
    shipped: "in_transit",
    out_for_delivery: "in_transit",
    delivered: "delivered",
    delivered_approval_pending: "delivered",
    partial_delivered: "partial_delivered",
    partial_delivery: "partial_delivered",
    partial_delivered_approval_pending: "partial_delivered",
    cancelled: "cancelled",
    canceled: "cancelled",
    cancelled_approval_pending: "cancelled",
    hold: "hold",
    on_hold: "hold",
    // Steadfast marks a parcel heading back to the merchant before it lands.
    return_in_transit: "return_in_transit",
    returning: "return_in_transit",
    return_requested: "return_in_transit",
    returned: "returned",
    return: "returned",
    returned_to_merchant: "returned",
    paid_return: "returned",
    lost: "lost",
    damaged: "lost",
    lost_or_damaged: "lost",
    unknown_approval_pending: "unknown",
    unknown: "unknown",
  };
  return map[s] ?? "unknown";
}

export function courierStatusTone(status: CourierStatus): string {
  switch (status) {
    case "delivered":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "partial_delivered":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "in_transit":
    case "picked":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    case "return_in_transit":
      return "bg-orange-50 text-orange-700 ring-orange-200";
    case "returned":
    case "cancelled":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "lost":
      return "bg-neutral-900 text-white ring-neutral-700";
    case "hold":
      return "bg-orange-50 text-orange-700 ring-orange-200";
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

/** Value stored in place of a secret once saved — never sent back to the browser. */
export const SECRET_MASK = "••••••••";
