import { createServerFn } from "@tanstack/react-start";

import { orderLookupSchema, placeOrderSchema } from "./order-schema";
import type { DeliveryArea } from "./order-schema";

export type PlacedOrder = {
  orderNumber: string;
  total: number;
  subtotal: number;
  deliveryCharge: number;
  discount: number;
};

export type OrderSummary = {
  orderNumber: string;
  status: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  addressLine: string;
  city: string;
  deliveryArea: string | null;
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  total: number;
  items: Array<{
    name: string;
    slug: string | null;
    variantLabel: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
};

function deliveryRates(raw: unknown): Record<DeliveryArea, number> & { freeAbove: number } {
  const v = (raw ?? {}) as Record<string, unknown>;
  const num = (value: unknown, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
  return {
    inside_dhaka: num(v["inside_dhaka"], 60),
    outside_dhaka: num(v["outside_dhaka"], 120),
    freeAbove: num(v["free_above"], 0),
  };
}

/**
 * Places a cash-on-delivery order. Prices, stock and delivery charge are all
 * resolved server-side from the database — the client only sends ids and
 * quantities, never money.
 */
export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => placeOrderSchema.parse(input))
  .handler(async ({ data }): Promise<PlacedOrder> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const productIds = [...new Set(data.items.map((i) => i.productId))];
    const variantIds = [
      ...new Set(data.items.map((i) => i.variantId).filter((v): v is string => Boolean(v))),
    ];

    const [productsRes, variantsRes, settingsRes] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select("id, slug, name_bn, name_en, price, stock, sku, is_active")
        .in("id", productIds),
      variantIds.length
        ? supabaseAdmin
            .from("product_variants")
            .select("id, product_id, value_bn, value_en, group_name_bn, price_delta, stock, sku, is_active")
            .in("id", variantIds)
        : Promise.resolve({ data: [], error: null }),
      supabaseAdmin.from("site_settings").select("value").eq("key", "delivery").maybeSingle(),
    ]);

    if (productsRes.error) throw new Error("Could not load products");
    const products = productsRes.data ?? [];
    const variants = variantsRes.data ?? [];

    const lines = data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product || !product.is_active) throw new Error("PRODUCT_UNAVAILABLE");

      const variant = item.variantId ? variants.find((v) => v.id === item.variantId) : null;
      if (item.variantId && (!variant || !variant.is_active || variant.product_id !== product.id)) {
        throw new Error("VARIANT_UNAVAILABLE");
      }

      const available = variant ? variant.stock : product.stock;
      if (available < item.quantity) throw new Error("OUT_OF_STOCK");

      const unitPrice = Number(product.price) + Number(variant?.price_delta ?? 0);
      return {
        product,
        variant,
        quantity: item.quantity,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
      };
    });

    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const rates = deliveryRates(settingsRes.data?.value);

    const { findUpazila } = await import("./bd-geo");
    if (!findUpazila(data.division, data.district, data.upazila)) {
      throw new Error("INVALID_LOCATION");
    }
    const deliveryArea: DeliveryArea =
      data.district === "ঢাকা" || data.district === "Dhaka" ? "inside_dhaka" : "outside_dhaka";

    const deliveryCharge =
      rates.freeAbove > 0 && subtotal >= rates.freeAbove ? 0 : rates[deliveryArea];
    const total = subtotal + deliveryCharge;

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        customer_email: null,
        address_line: `${data.addressLine}, ${data.upazila}, ${data.district}, ${data.division}`,
        city: data.district,
        delivery_area: deliveryArea,

        note: data.note || null,
        subtotal,
        delivery_charge: deliveryCharge,
        discount: 0,
        total,
        payment_method: "cod",
        status: "pending",
        source: data.source,
        customer_ip: clientIp,
      })
      .select("id, order_number")
      .single();

    if (orderError || !order) throw new Error("ORDER_FAILED");

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(
      lines.map((l) => ({
        order_id: order.id,
        product_id: l.product.id,
        product_name: l.product.name_bn,
        product_slug: l.product.slug,
        variant_label: l.variant ? `${l.variant.group_name_bn}: ${l.variant.value_bn}` : null,
        sku: l.variant?.sku ?? l.product.sku,
        unit_price: l.unitPrice,
        quantity: l.quantity,
        line_total: l.lineTotal,
      })),
    );

    if (itemsError) throw new Error("ORDER_ITEMS_FAILED");

    return { orderNumber: order.order_number, subtotal, deliveryCharge, discount: 0, total };
  });

/** Order receipt lookup — requires both the order number and the phone used. */
/** Public delivery-charge configuration, used to preview totals at checkout. */
export const getDeliveryRates = createServerFn({ method: "GET" }).handler(async () => {
  const { createPublicServerClient } = await import("./supabase-public");
  const db = createPublicServerClient();
  const { data } = await db.from("site_settings").select("value").eq("key", "delivery").maybeSingle();
  return deliveryRates(data?.value);
});

export const getOrderSummary = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => orderLookupSchema.parse(input))
  .handler(async ({ data }): Promise<OrderSummary | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, status, created_at, customer_name, customer_phone, address_line, city, delivery_area, subtotal, delivery_charge, discount, total",
      )
      .eq("order_number", data.orderNumber)
      .eq("customer_phone", data.phone)
      .maybeSingle();

    if (!order) return null;

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_name, product_slug, variant_label, unit_price, quantity, line_total")
      .eq("order_id", order.id);

    return {
      orderNumber: order.order_number,
      status: order.status,
      createdAt: order.created_at,
      customerName: order.customer_name,
      customerPhone: order.customer_phone,
      addressLine: order.address_line,
      city: order.city,
      deliveryArea: order.delivery_area,
      subtotal: Number(order.subtotal),
      deliveryCharge: Number(order.delivery_charge),
      discount: Number(order.discount),
      total: Number(order.total),
      items: (items ?? []).map((i) => ({
        name: i.product_name,
        slug: i.product_slug,
        variantLabel: i.variant_label,
        unitPrice: Number(i.unit_price),
        quantity: i.quantity,
        lineTotal: Number(i.line_total),
      })),
    };
  });
