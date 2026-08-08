/**
 * CarryBee API v2 — server-only.
 * Production: https://developers.carrybee.com  ·  Sandbox: https://sandbox.carrybee.com
 *
 * Auth is header based: Client-ID / Client-Secret / Client-Context.
 */

export type CarrybeeCreds = {
  client_id: string;
  client_secret: string;
  client_context: string;
  sandbox?: boolean;
};

const PROD_BASE = "https://developers.carrybee.com";
const SANDBOX_BASE = "https://sandbox.carrybee.com";

function base(creds: CarrybeeCreds) {
  return creds.sandbox ? SANDBOX_BASE : PROD_BASE;
}

function headers(creds: CarrybeeCreds) {
  return {
    "Client-ID": creds.client_id,
    "Client-Secret": creds.client_secret,
    "Client-Context": creds.client_context,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/** Flattens CarryBee's `{errors: {field: [msg]}}` validation shape into one line. */
function errorText(body: unknown, status: number, label: string) {
  const b = (body ?? {}) as { message?: string; errors?: Record<string, string[] | string> };
  const parts: string[] = [];
  if (b.errors && typeof b.errors === "object") {
    for (const [field, msg] of Object.entries(b.errors)) {
      parts.push(`${field}: ${Array.isArray(msg) ? msg.join(", ") : String(msg)}`);
    }
  }
  const detail = parts.length ? parts.join(" · ") : b.message;
  return detail ? `CarryBee ${label}: ${detail}` : `CarryBee ${label} failed (${status})`;
}

async function call(
  creds: CarrybeeCreds,
  path: string,
  init?: RequestInit,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${base(creds)}${path}`, {
    ...init,
    headers: { ...headers(creds), ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  const b = (body ?? {}) as Record<string, unknown>;
  if (!res.ok || b["error"] === true) throw new Error(errorText(b, res.status, path));
  return b;
}

const listOf = (body: Record<string, unknown>): Array<Record<string, unknown>> => {
  const d = body["data"];
  if (Array.isArray(d)) return d as Array<Record<string, unknown>>;
  const inner = (d ?? body) as Record<string, unknown>;
  for (const key of ["stores", "orders", "cities", "zones", "areas", "results", "data", "items"]) {
    const v = inner[key];
    if (Array.isArray(v)) return v as Array<Record<string, unknown>>;
    // One more level for paginated shapes like { stores: { data: [...] } }.
    if (v && typeof v === "object") {
      const nested = (v as Record<string, unknown>)["data"];
      if (Array.isArray(nested)) return nested as Array<Record<string, unknown>>;
    }
  }
  return [];
};


export type CarrybeeStore = {
  /** CarryBee returns store ids as strings — never coerce to a number. */
  store_id: string;
  store_name: string;
  is_default_pickup: boolean;
};

/** GET /api/v2/stores — also doubles as the connection check. */
export async function carrybeeStores(creds: CarrybeeCreds): Promise<CarrybeeStore[]> {
  const body = await call(creds, "/api/v2/stores", { method: "GET" });
  const rows = listOf(body).map((r) => ({
    store_id: String(r["id"] ?? r["store_id"] ?? ""),
    store_name: String(r["name"] ?? r["store_name"] ?? "Store"),
    is_default_pickup: r["is_default_pickup_store"] === true,
  }));
  // Default pickup store first, so dispatch picks it automatically.
  return rows
    .filter((s) => s.store_id)
    .sort((a, b) => Number(b.is_default_pickup) - Number(a.is_default_pickup));
}


/** Live credential check. */
export async function carrybeeCheck(creds: CarrybeeCreds) {
  const stores = await carrybeeStores(creds);
  return {
    ok: true,
    message: stores.length ? `Connected · ${stores.length} store(s)` : "Connected",
    stores,
  };
}

export async function carrybeeCities(creds: CarrybeeCreds) {
  return listOf(await call(creds, "/api/v2/cities", { method: "GET" }));
}

export async function carrybeeZones(creds: CarrybeeCreds, cityId: number) {
  return listOf(await call(creds, `/api/v2/cities/${cityId}/zones`, { method: "GET" }));
}

export async function carrybeeAreas(creds: CarrybeeCreds, cityId: number, zoneId: number) {
  return listOf(
    await call(creds, `/api/v2/cities/${cityId}/zones/${zoneId}/areas`, { method: "GET" }),
  );
}

/** GET /api/v2/area-suggestion?search=… — free-text address matcher. */
export async function carrybeeAreaSuggestion(creds: CarrybeeCreds, search: string) {
  return listOf(
    await call(creds, `/api/v2/area-suggestion?search=${encodeURIComponent(search)}`, {
      method: "GET",
    }),
  );
}

/**
 * POST /api/v2/address-details — resolves a free-text address string into
 * CarryBee city / zone (and sometimes area) identifiers. Query needs ≥10 chars.
 */
export type CarrybeeResolvedAddress = {
  cityId: number | null;
  cityName: string | null;
  zoneId: number | null;
  zoneName: string | null;
  areaId: number | null;
  areaName: string | null;
  raw: Record<string, unknown>;
};

export async function carrybeeAddressDetails(
  creds: CarrybeeCreds,
  query: string,
): Promise<CarrybeeResolvedAddress> {
  const body = await call(creds, "/api/v2/address-details", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
  const d0 = body["data"];
  const d = (Array.isArray(d0) ? (d0[0] ?? {}) : (d0 ?? body)) as Record<string, unknown>;
  const n = (...keys: string[]) => {
    for (const k of keys) {
      const v = d[k];
      if (v != null && v !== "" && !Number.isNaN(Number(v))) return Number(v);
    }
    return null;
  };
  const s = (...keys: string[]) => {
    for (const k of keys) {
      const v = d[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
  };
  return {
    cityId: n("city_id", "cityId"),
    cityName: s("city_name", "city"),
    zoneId: n("zone_id", "zoneId"),
    zoneName: s("zone_name", "zone"),
    areaId: n("area_id", "areaId"),
    areaName: s("area_name", "area"),
    raw: d,
  };
}

export type CarrybeeOrderInput = {
  store_id: number;
  merchant_order_id: string;
  /** 1 = Normal, 2 = Express. We always send 1 unless overridden. */
  delivery_type: 1 | 2;
  /** 1 = Parcel (always). */
  product_type: 1 | 2 | 3;
  recipient_name: string;
  recipient_phone: string;
  recipient_secendary_phone?: string;
  recipient_address: string;
  city_id: number;
  zone_id: number;
  area_id?: number;
  special_instruction?: string;
  product_description: string;
  /** Grams. */
  item_weight: number;
  item_quantity: number;
  collectable_amount: number;
  is_closed_box?: boolean;
  is_exchange?: boolean;
};

export type CarrybeeOrderResult = {
  consignmentId: string | null;
  merchantOrderId: string | null;
  status: string;
  raw: Record<string, unknown>;
};

function readOrder(row: Record<string, unknown>): CarrybeeOrderResult {
  const d = (row["data"] ?? row) as Record<string, unknown>;
  const cid = d["consignment_id"] ?? d["consignmentId"] ?? d["id"];
  return {
    consignmentId: cid == null ? null : String(cid),
    merchantOrderId: d["merchant_order_id"] == null ? null : String(d["merchant_order_id"]),
    status: String(d["order_status"] ?? d["status"] ?? "order.created"),
    raw: row,
  };
}

/** POST /api/v2/orders */
export async function carrybeeCreateOrder(creds: CarrybeeCreds, input: CarrybeeOrderInput) {
  const body = await call(creds, "/api/v2/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return readOrder(body);
}

/** POST /api/v2/orders-bulk — up to the courier's per-call limit. */
export async function carrybeeCreateBulkOrders(
  creds: CarrybeeCreds,
  orders: CarrybeeOrderInput[],
): Promise<{ results: CarrybeeOrderResult[]; raw: Record<string, unknown> }> {
  const body = await call(creds, "/api/v2/orders-bulk", {
    method: "POST",
    body: JSON.stringify({ orders }),
  });
  const rows = listOf(body);
  return { results: rows.map(readOrder), raw: body };
}

/** GET /api/v2/orders/{consignment_id}/details */
export async function carrybeeOrderDetails(creds: CarrybeeCreds, consignmentId: string) {
  const body = await call(creds, `/api/v2/orders/${encodeURIComponent(consignmentId)}/details`, {
    method: "GET",
  });
  return ((body["data"] ?? body) ?? {}) as Record<string, unknown>;
}

/** Total courier cost from an order-details payload: delivery fee + COD fee. */
export function carrybeeFeeFromDetails(d: Record<string, unknown>): number | null {
  const num = (k: string) => {
    const v = d[k];
    return v != null && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : 0;
  };
  if (d["delivery_fee"] == null && d["cod_fee"] == null) return null;
  return num("delivery_fee") + num("cod_fee");
}

/**
 * POST /api/v2/orders/{consignment_id}/cancel
 * Only possible while the parcel has not been picked up yet.
 */
export async function carrybeeCancelOrder(
  creds: CarrybeeCreds,
  consignmentId: string,
  reason: string,
): Promise<Record<string, unknown>> {
  return call(creds, `/api/v2/orders/${encodeURIComponent(consignmentId)}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancellation_reason: reason.slice(0, 199) }),
  });
}

/**
 * POST /api/v2/orders/{consignment_id}/exchange — creates an exchange parcel
 * against a previously delivered consignment. Returns an `EX…` consignment id.
 */
export async function carrybeeCreateExchange(
  creds: CarrybeeCreds,
  consignmentId: string,
  input: Partial<CarrybeeOrderInput>,
): Promise<CarrybeeOrderResult> {
  const body = await call(creds, `/api/v2/orders/${encodeURIComponent(consignmentId)}/exchange`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return readOrder(body);
}
