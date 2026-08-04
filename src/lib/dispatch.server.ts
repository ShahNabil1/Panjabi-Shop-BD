/**
 * Courier dispatch (server-only).
 * Turns a confirmed order into a courier consignment for the partner saved on
 * that order, then records the result on the order + `order_consignments`.
 */

import type { Db } from "./admin.server";
import { normaliseCourierStatus, type DeliveryProvider } from "./delivery-shared";

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
  total: number | string;
  advance_amount: number | string;
  delivery_partner: string | null;
  courier_consignment_id: string | null;
};

async function loadOrder(db: Db, orderId: string) {
  const { data, error } = await db
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_phone, alt_phone, address_line, division, district, upazila, city, delivery_note, note, total, advance_amount, delivery_partner, courier_consignment_id",
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
    .select("product_name, variant_label, quantity")
    .eq("order_id", orderId);
  return (data ?? []) as Array<{
    product_name: string;
    variant_label: string | null;
    quantity: number;
  }>;
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
        ...(partner.credentials["base_url"] ? { base_url: partner.credentials["base_url"] } : {}),
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
      const city = pickByName(cityList, "city_name", order.district ?? order.city ?? "");
      if (!city) throw new Error(`Pathao city not found for "${order.district ?? order.city}"`);
      const cityId = Number(city["city_id"]);

      const zoneBody = await pathaoZones(creds, token, cityId);
      const zoneList = (((zoneBody["data"] ?? {}) as Record<string, unknown>)["data"] ??
        []) as Array<Record<string, unknown>>;
      const zone = pickByName(zoneList, "zone_name", order.upazila ?? "");
      if (!zone) throw new Error(`Pathao zone not found for "${order.upazila}"`);

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
        ...(note ? { special_instruction: note } : {}),
      });
      consignmentId = res.consignmentId;
      rawStatus = res.status;
      deliveryFee = res.deliveryFee;
      raw = res.raw;
    } else {
      throw new Error("Carrybee integration is not available yet");
    }

    const status = normaliseCourierStatus(provider, rawStatus);

    await db.from("order_consignments").upsert(
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
      { onConflict: "provider,consignment_id" },
    );

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
