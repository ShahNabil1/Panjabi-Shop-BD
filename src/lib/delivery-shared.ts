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
    {
      key: "base_url",
      label: "Base URL",
      placeholder: "https://api-hermes.pathao.com",
      optional: true,
      hint: "Sandbox: https://courier-api-sandbox.pathao.com",
    },
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
  | "returned"
  | "cancelled"
  | "unknown";

export const courierStatusLabels: Record<CourierStatus, string> = {
  pending: "Pending",
  in_review: "In review",
  picked: "Picked up",
  in_transit: "In transit",
  delivered: "Delivered",
  partial_delivered: "Partial delivered",
  hold: "On hold",
  returned: "Returned",
  cancelled: "Cancelled",
  unknown: "Unknown",
};

/** Maps a raw provider status string to our normalised status. */
export function normaliseCourierStatus(provider: DeliveryProvider, raw: string): CourierStatus {
  const s = raw.toLowerCase().replace(/[\s-]+/g, "_");
  if (provider === "pathao") {
    const map: Record<string, CourierStatus> = {
      "order.created": "pending",
      "order.updated": "pending",
      "order.pickup_requested": "pending",
      "order.pickup-requested": "pending",
      "order.assigned_for_pickup": "pending",
      "order.assigned-for-pickup": "pending",
      "order.picked": "picked",
      "order.pickup_failed": "hold",
      "order.pickup-failed": "hold",
      "order.pickup_cancelled": "cancelled",
      "order.pickup-cancelled": "cancelled",
      "order.at_the_sorting_hub": "in_transit",
      "order.at-the-sorting-hub": "in_transit",
      "order.in_transit": "in_transit",
      "order.in-transit": "in_transit",
      "order.received_at_last_mile_hub": "in_transit",
      "order.received-at-last-mile-hub": "in_transit",
      "order.assigned_for_delivery": "in_transit",
      "order.assigned-for-delivery": "in_transit",
      "order.delivered": "delivered",
      "order.partial_delivery": "partial_delivered",
      "order.partial-delivery": "partial_delivered",
      "order.delivery_failed": "hold",
      "order.delivery-failed": "hold",
      "order.on_hold": "hold",
      "order.on-hold": "hold",
      "order.returned": "returned",
      "order.return": "returned",
      "order.return_in_transit": "returned",
      "order.return-in-transit": "returned",
      "order.returned_to_merchant": "returned",
      "order.returned-to-merchant": "returned",
      "order.paid_return": "returned",
      "order.paid-return": "returned",
      "order.exchange": "in_transit",
    };
    return map[s] ?? map[`order.${s}`] ?? "unknown";
  }

  const map: Record<string, CourierStatus> = {
    pending: "pending",
    in_review: "in_review",
    delivered: "delivered",
    partial_delivered: "partial_delivered",
    cancelled: "cancelled",
    hold: "hold",
    on_hold: "hold",
    in_transit: "in_transit",
    picked: "picked",
    delivered_approval_pending: "delivered",
    partial_delivered_approval_pending: "partial_delivered",
    cancelled_approval_pending: "cancelled",
    unknown_approval_pending: "unknown",
    unknown: "unknown",
    returned: "returned",
    return: "returned",
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
    case "returned":
    case "cancelled":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "hold":
      return "bg-orange-50 text-orange-700 ring-orange-200";
    default:
      return "bg-muted text-muted-foreground ring-border";
  }
}

/** Value stored in place of a secret once saved — never sent back to the browser. */
export const SECRET_MASK = "••••••••";
