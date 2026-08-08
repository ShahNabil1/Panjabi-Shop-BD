/**
 * Courier dispatch (server-only).
 * Turns a confirmed order into a courier consignment for the partner saved on
 * that order, then records the result on the order + `order_consignments`.
 */

import type { Db } from "./admin.server";
import { normaliseCourierStatus, type DeliveryProvider } from "./delivery-shared";
import { BD_DIVISIONS } from "./bd-geo";

export type DispatchResult = {
  ok: boolean;
  orderId: string;
  orderNumber: string;
  provider: DeliveryProvider | null;
  consignmentId: string | null;
  message: string;
};

type PartnerRow = {
  provider: string;
  enabled: boolean;
  credentials: Record<string, string>;
  config: Record<string, unknown>;
};

export async function loadPartner(db: Db, provider: DeliveryProvider): Promise<PartnerRow> {
  const { data, error } = await db
    .from("delivery_partners")
    .select("provider, enabled, credentials, config")
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`${provider} is not configured in Delivery Settings`);
  if (!data.enabled) throw new Error(`${provider} is deactivated`);
  return {
    provider: data.provider,
    enabled: data.enabled,
    credentials: (data.credentials ?? {}) as Record<string, string>,
    config: (data.config ?? {}) as Record<string, unknown>,
  };
}

/** Maps the stored partner label ("Steadfast", "Pathao"…) to a provider key. */
export function providerKey(label: string | null): DeliveryProvider | null {
  const v = (label ?? "").toLowerCase().replace(/\s+/g, "");
  if (v === "steadfast") return "steadfast";
  if (v === "pathao") return "pathao";
  if (v === "carrybee") return "carrybee";
  return null;
}

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  alt_phone: string | null;
  address_line: string;
  division: string | null;
  district: string | null;
  upazila: string | null;
  city: string | null;
  delivery_note: string | null;
  note: string | null;
  source: string | null;
  total: number | string;
  advance_amount: number | string;
  delivery_partner: string | null;
  courier_consignment_id: string | null;
};

async function loadOrder(db: Db, orderId: string) {
  const { data, error } = await db
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_phone, alt_phone, address_line, division, district, upazila, city, delivery_note, note, source, total, advance_amount, delivery_partner, courier_consignment_id",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Order not found");
  return data as unknown as OrderRow;
}

async function loadItems(db: Db, orderId: string) {
  const { data } = await db
    .from("order_items")
    .select("product_name, variant_label, quantity, product_id")
    .eq("order_id", orderId);
  return (data ?? []) as Array<{
    product_name: string;
    variant_label: string | null;
    quantity: number;
    product_id: string | null;
  }>;
}

/** True when any line on the order is a combo gift box (heavier parcel). */
async function hasCombo(db: Db, items: Array<{ product_id: string | null }>) {
  const ids = items.map((i) => i.product_id).filter((v): v is string => !!v);
  if (!ids.length) return false;
  const { data } = await db.from("products").select("kind").in("id", ids);
  return (data ?? []).some((p) => (p as { kind?: string }).kind === "combo");
}

/** CarryBee auth headers come straight from the saved credentials. */
export function carrybeeCreds(partner: PartnerRow) {
  return {
    client_id: partner.credentials["client_id"]!,
    client_secret: partner.credentials["client_secret"]!,
    client_context: partner.credentials["client_context"]!,
  };
}

/**
 * Builds one CarryBee order payload from a stored order.
 * Shared by single dispatch and the bulk endpoint so both stay identical.
 */
export async function buildCarrybeePayload(
  db: Db,
  order: OrderRow,
  items: Array<{ product_name: string; variant_label: string | null; quantity: number; product_id: string | null }>,
  partner: PartnerRow,
) {
  const { carrybeeStores, carrybeeCities, carrybeeZones, carrybeeAreas } = await import(
    "./carrybee.server"
  );
  const creds = carrybeeCreds(partner);

  const saved = (partner.config["stores"] ?? []) as Array<{ store_id: number }>;
  const storeId = saved[0]?.store_id ?? (await carrybeeStores(creds))[0]?.store_id;
  if (!storeId) throw new Error("No CarryBee store found for this merchant account");

  const cities = await carrybeeCities(creds);
  const city =
    pickPlace(cities, "name", order.district, DISTRICT_EN) ??
    pickPlace(cities, "city_name", order.district, DISTRICT_EN) ??
    pickPlace(cities, "name", order.city, DISTRICT_EN);
  if (!city)
    throw new Error(
      `CarryBee city not found for "${order.district ?? order.city}" — check the district on this order`,
    );
  const cityId = Number(city["id"] ?? city["city_id"]);

  const zones = await carrybeeZones(creds, cityId);
  const zone =
    pickPlace(zones, "name", order.upazila, UPAZILA_EN) ??
    pickPlace(zones, "zone_name", order.upazila, UPAZILA_EN) ??
    pickPlace(zones, "name", order.city, UPAZILA_EN) ??
    pickByName(zones, "name", `${String(city["name"] ?? city["city_name"] ?? "")} Sadar`);
  if (!zone)
    throw new Error(
      `CarryBee zone not found for "${order.upazila ?? order.city}" under ${String(city["name"] ?? "")}`,
    );
  const zoneId = Number(zone["id"] ?? zone["zone_id"]);

  // Area is optional: match it against the free-text address when we can.
  let areaId: number | undefined;
  try {
    const areas = await carrybeeAreas(creds, cityId, zoneId);
    const area =
      pickByName(areas, "name", order.address_line) ??
      pickByName(areas, "name", order.upazila ?? "") ??
      areas[0];
    const id = area?.["id"] ?? area?.["area_id"];
    if (id != null) areaId = Number(id);
  } catch {
    areaId = undefined;
  }

  const combo = await hasCombo(db, items);
  const quantity = combo ? 1 : totalLot(items);
  // Single parcels ship at 400g, combo gift boxes at 1kg.
  const weight = combo ? 1000 : 400 * quantity;
  // CarryBee caps the special instruction at 255 characters.
  const instruction = (order.delivery_note ?? "").trim().slice(0, 255);

  return {
    store_id: storeId,
    merchant_order_id: order.order_number,
    delivery_type: 1 as const,
    product_type: 1 as const,
    recipient_name: order.customer_name,
    recipient_phone: order.customer_phone,
    ...(order.alt_phone ? { recipient_secendary_phone: order.alt_phone } : {}),
    recipient_address: fullAddress(order),
    city_id: cityId,
    zone_id: zoneId,
    ...(areaId ? { area_id: areaId } : {}),
    ...(instruction ? { special_instruction: instruction } : {}),
    product_description: itemSummary(items).slice(0, 255),
    item_weight: weight,
    item_quantity: quantity,
    collectable_amount: codAmount(order),
    // Manual exchange orders go out flagged so CarryBee collects the old parcel.
    ...((order.source ?? "").toLowerCase() === "exchange" ? { is_exchange: true } : {}),
  };
}



function fullAddress(o: OrderRow) {
  return [o.address_line, o.upazila, o.district, o.division || o.city]
    .filter((x) => x && String(x).trim().length > 0)
    .join(", ");
}

function codAmount(o: OrderRow) {
  const due = Number(o.total ?? 0) - Number(o.advance_amount ?? 0);
  return Math.max(0, Math.round(due));
}

function itemSummary(items: Array<{ product_name: string; variant_label: string | null; quantity: number }>) {
  return items
    .map((i) => `${i.product_name}${i.variant_label ? ` (${i.variant_label})` : ""} x${i.quantity}`)
    .join(", ")
    .slice(0, 250);
}

function totalLot(items: Array<{ quantity: number }>) {
  return items.reduce((sum, i) => sum + Number(i.quantity ?? 0), 0) || 1;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b(sadar|district|zila|upazila|thana|city)\b/g, "")
    .replace(/[^a-z0-9]/g, "");

const bnTrim = (s: string) => (s ?? "").replace(/\s+/g, " ").trim();

/** Bangla -> English name maps built from the local BD administrative dataset. */
const DISTRICT_EN = new Map<string, string>();
const UPAZILA_EN = new Map<string, string>();
for (const div of BD_DIVISIONS) {
  for (const d of div.districts) {
    DISTRICT_EN.set(bnTrim(d.bn), d.en);
    for (const u of d.upazilas) UPAZILA_EN.set(bnTrim(u.bn), u.en);
  }
}

/** Spelling variants Pathao/Steadfast use for the same place. */
const NAME_ALIASES: Record<string, string[]> = {
  bogra: ["Bogura"],
  bogura: ["Bogra"],
  comilla: ["Cumilla"],
  cumilla: ["Comilla"],
  barisal: ["Barishal"],
  barishal: ["Barisal"],
  jessore: ["Jashore"],
  jashore: ["Jessore"],
  chittagong: ["Chattogram", "Chattagram"],
  chattogram: ["Chittagong", "Chattagram"],
  chattagram: ["Chattogram", "Chittagong"],
  coxsbazar: ["Cox's Bazar", "Coxs Bazar", "Cox Bazar"],
  netrokona: ["Netrakona"],
  netrakona: ["Netrokona"],
  maulvibazar: ["Moulvibazar"],
  moulvibazar: ["Maulvibazar"],
  brahmanbaria: ["B. Baria", "Brahmanbaria"],
  chapainawabganj: ["Chapai Nawabganj", "Nawabganj"],
  munshiganj: ["Munshigonj"],
  gaibandha: ["Gaibandah"],
  narsingdi: ["Narshingdi"],
};

/** All name spellings worth trying for a stored (usually Bangla) place name. */
function nameCandidates(raw: string | null | undefined, map: Map<string, string>): string[] {
  const out: string[] = [];
  const push = (v: string) => {
    const t = bnTrim(v);
    if (t && !out.includes(t)) out.push(t);
  };
  const base = bnTrim(raw ?? "");
  if (!base) return out;
  push(base);
  const en = map.get(base);
  if (en) push(en);
  const noSadar = bnTrim(base.replace(/সদর$/u, ""));
  if (noSadar !== base) {
    push(noSadar);
    const en2 = map.get(noSadar);
    if (en2) push(en2);
  }
  for (const c of [...out]) {
    const alias = NAME_ALIASES[norm(c)];
    if (alias) alias.forEach(push);
  }
  return out;
}

/** Tries every spelling variant against the courier's list. */
function pickPlace<T extends Record<string, unknown>>(
  rows: T[],
  nameKey: string,
  raw: string | null | undefined,
  map: Map<string, string>,
): T | null {
  for (const candidate of nameCandidates(raw, map)) {
    const hit = pickByName(rows, nameKey, candidate);
    if (hit) return hit;
  }
  return null;
}

function pickByName<T extends Record<string, unknown>>(
  rows: T[],
  nameKey: string,
  wanted: string,
): T | null {
  const target = norm(wanted);
  if (!target) return null;
  return (
    rows.find((r) => norm(String(r[nameKey] ?? "")) === target) ??
    rows.find((r) => norm(String(r[nameKey] ?? "")).includes(target)) ??
    rows.find((r) => target.includes(norm(String(r[nameKey] ?? "")))) ??
    null
  );
}

/**
 * Creates the consignment with the courier and persists the outcome.
 * Never throws — failures come back as `{ ok: false, message }` so a bulk run
 * can continue with the remaining orders.
 */
export async function dispatchOrder(
  db: Db,
  orderId: string,
  actor: string,
): Promise<DispatchResult> {
  const { logActivity } = await import("./admin.server");
  let order: OrderRow;
  try {
    order = await loadOrder(db, orderId);
  } catch (error) {
    return {
      ok: false,
      orderId,
      orderNumber: "—",
      provider: null,
      consignmentId: null,
      message: (error as Error).message,
    };
  }

  const base = { orderId, orderNumber: order.order_number };

  if (order.courier_consignment_id) {
    return {
      ...base,
      ok: true,
      provider: providerKey(order.delivery_partner),
      consignmentId: order.courier_consignment_id,
      message: "Already sent to courier",
    };
  }

  const provider = providerKey(order.delivery_partner);
  if (!provider) {
    return {
      ...base,
      ok: false,
      provider: null,
      consignmentId: null,
      message: "No delivery partner selected on this order",
    };
  }

  try {
    const partner = await loadPartner(db, provider);
    const items = await loadItems(db, orderId);
    const note = [order.delivery_note, order.note].filter(Boolean).join(" | ").slice(0, 250);
    // Pathao: only our own delivery note goes out as special instruction —
    // never the customer's checkout note.
    const pathaoInstruction = (order.delivery_note ?? "").trim().slice(0, 250);

    let consignmentId: string | null = null;
    let trackingCode: string | null = null;
    let rawStatus = "pending";
    let deliveryFee: number | null = null;
    let raw: Record<string, unknown> = {};

    if (provider === "steadfast") {
      const { steadfastCreateOrder } = await import("./steadfast.server");
      const res = await steadfastCreateOrder(
        {
          api_key: partner.credentials["api_key"]!,
          secret_key: partner.credentials["secret_key"]!,
        },
        {
          invoice: order.order_number,
          recipient_name: order.customer_name,
          recipient_phone: order.customer_phone,
          recipient_address: fullAddress(order),
          cod_amount: codAmount(order),
          item_description: itemSummary(items),
          total_lot: totalLot(items),
          delivery_type: 0,
          ...(note ? { note } : {}),
          ...(order.alt_phone ? { alternative_phone: order.alt_phone } : {}),
        },
      );
      consignmentId = res.consignmentId;
      trackingCode = res.trackingCode;
      rawStatus = res.status;
      raw = res.raw;
    } else if (provider === "pathao") {
      const creds = {
        client_id: partner.credentials["client_id"]!,
        client_secret: partner.credentials["client_secret"]!,
        username: partner.credentials["username"]!,
        password: partner.credentials["password"]!,
      };
      const { pathaoToken, pathaoStores, pathaoCities, pathaoZones, pathaoCreateOrder } =
        await import("./pathao.server");
      const token = await pathaoToken(creds);

      const stores = (partner.config["stores"] ?? []) as Array<{ store_id: number }>;
      const storeId = stores[0]?.store_id ?? (await pathaoStores(creds, token))[0]?.store_id;
      if (!storeId) throw new Error("No Pathao store found for this merchant account");

      const cityBody = await pathaoCities(creds, token);
      const cityList = (((cityBody["data"] ?? {}) as Record<string, unknown>)["data"] ??
        []) as Array<Record<string, unknown>>;
      const city =
        pickPlace(cityList, "city_name", order.district, DISTRICT_EN) ??
        pickPlace(cityList, "city_name", order.city, DISTRICT_EN);
      if (!city)
        throw new Error(
          `Pathao city not found for "${order.district ?? order.city}" — check the district name on this order`,
        );
      const cityId = Number(city["city_id"]);

      const zoneBody = await pathaoZones(creds, token, cityId);
      const zoneList = (((zoneBody["data"] ?? {}) as Record<string, unknown>)["data"] ??
        []) as Array<Record<string, unknown>>;
      const zone =
        pickPlace(zoneList, "zone_name", order.upazila, UPAZILA_EN) ??
        pickPlace(zoneList, "zone_name", order.city, UPAZILA_EN) ??
        pickByName(zoneList, "zone_name", `${String(city["city_name"] ?? "")} Sadar`);
      if (!zone)
        throw new Error(
          `Pathao zone not found for "${order.upazila ?? order.city}" under ${String(city["city_name"] ?? "")}`,
        );

      const res = await pathaoCreateOrder(creds, token, {
        store_id: storeId,
        merchant_order_id: order.order_number,
        recipient_name: order.customer_name,
        recipient_phone: order.customer_phone,
        recipient_address: fullAddress(order),
        recipient_city: cityId,
        recipient_zone: Number(zone["zone_id"]),
        delivery_type: 48,
        item_type: 2,
        item_quantity: totalLot(items),
        item_weight: 0.5,
        amount_to_collect: codAmount(order),
        item_description: itemSummary(items),
        ...(pathaoInstruction ? { special_instruction: pathaoInstruction } : {}),
      });
      consignmentId = res.consignmentId;
      rawStatus = res.status;
      deliveryFee = res.deliveryFee;
      raw = res.raw;
    } else {
      const { carrybeeCreateOrder } = await import("./carrybee.server");
      const payload = await buildCarrybeePayload(db, order, items, partner);
      const res = await carrybeeCreateOrder(carrybeeCreds(partner), payload);
      consignmentId = res.consignmentId;
      rawStatus = res.status;
      raw = res.raw;
    }


    const status = normaliseCourierStatus(provider, rawStatus);

    // Partial unique index (provider, consignment_id) cannot back a PostgREST
    // upsert, so replace the row for this order+provider explicitly.
    await db.from("order_consignments").delete().eq("order_id", orderId).eq("provider", provider);
    const { error: consignmentError } = await db.from("order_consignments").insert(
      {
        order_id: orderId,
        provider,
        consignment_id: consignmentId,
        tracking_code: trackingCode,
        merchant_order_id: order.order_number,
        status,
        status_message: rawStatus,
        delivery_fee: deliveryFee,
        cod_amount: codAmount(order),
        raw: JSON.parse(JSON.stringify(raw)) as never,
      },
    );
    if (consignmentError) throw new Error(consignmentError.message);

    await db
      .from("orders")
      .update({
        status: "rts",
        courier_provider: provider,
        courier_consignment_id: consignmentId,
        courier_tracking_code: trackingCode,
        courier_status: status,
        courier_sent_at: new Date().toISOString(),
        fulfillment_status: "rts",
      })
      .eq("id", orderId);

    await logActivity(
      db,
      orderId,
      "courier",
      `${actor} sent the order to ${order.delivery_partner} · consignment ${consignmentId ?? "—"}`,
      { actor, meta: { provider, consignmentId, trackingCode } },
    );

    return {
      ...base,
      ok: true,
      provider,
      consignmentId,
      message: `Consignment ${consignmentId ?? "created"}`,
    };
  } catch (error) {
    const message = (error as Error).message;
    await logActivity(db, orderId, "courier", `Courier dispatch failed — ${message}`, {
      actor,
      meta: { provider },
    });
    return { ...base, ok: false, provider, consignmentId: null, message };
  }
}

/**
 * Order-status progression guard — mirrors `courier_webhook_apply` in the DB.
 * Returns the order status to apply, or null to leave it untouched:
 *  - manual financial states (paid/unpaid/lost_damaged) are never overwritten
 *  - a late/out-of-order courier event can never move an order backwards
 */
const ORDER_RANK: Record<string, number> = {
  incomplete: 0,
  pending: 1,
  no_response: 1,
  good_no_response: 1,
  hold: 1,
  confirmed: 2,
  processing: 2,
  rts: 3,
  shipped: 4,
  courier_hold: 4,
  partial_delivered: 5,
  delivered: 5,
  awaiting_return: 5,
  exchange: 5,
  returned: 6,
  cancelled: 6,
  lost_damaged: 6,
};

export function nextOrderStatus(current: string | null, candidate: string | null): string | null {
  if (!candidate) return null;
  if (current && ["paid", "unpaid", "lost_damaged"].includes(current)) return null;
  const cur = ORDER_RANK[current ?? ""] ?? 0;
  const next = ORDER_RANK[candidate] ?? 0;
  return next < cur ? null : candidate;
}

/**
 * Total courier cost from a Pathao order-info payload:
 * delivery fee + COD fee + extra charges − discounts.
 */
export function pathaoFeeFromInfo(d: Record<string, unknown>): number | null {
  const num = (...keys: string[]) => {
    for (const k of keys) {
      const v = d[k];
      if (v != null && v !== "" && !Number.isNaN(Number(v))) return Number(v);
    }
    return 0;
  };
  if (d["delivery_fee"] == null) return null;
  return (
    num("delivery_fee") +
    num("cod_fee", "collection_fee") +
    num("additional_charge") +
    num("compensation_cost", "compensation") -
    num("discount") -
    num("promo_discount")
  );
}
