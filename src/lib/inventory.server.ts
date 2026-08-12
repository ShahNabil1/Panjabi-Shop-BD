import type { Db } from "./admin.server";
import type { InventoryRow, LedgerRow, MovementType } from "./inventory.shared";

/* ------------------------------------------------------------------ */
/* Row shaping                                                         */
/* ------------------------------------------------------------------ */

type LevelRow = Record<string, any>;

export function itemName(row: LevelRow): string {
  const p = row["products"];
  const pack = row["packaging_materials"];
  if (pack) return String(pack.name ?? "Packaging");
  return String(p?.name_en || p?.name_bn || "Unknown product");
}

export function variantLabel(row: LevelRow): string | null {
  const v = row["product_variants"];
  if (!v) return null;
  return `${v.group_name_en ?? ""}: ${v.value_en ?? ""}`.trim();
}

export function itemSku(row: LevelRow): string {
  const v = row["product_variants"];
  const p = row["products"];
  const pack = row["packaging_materials"];
  return String(v?.sku || p?.sku || pack?.sku || "—");
}

export function mapLevel(row: LevelRow): InventoryRow {
  const p = row["products"];
  const v = row["product_variants"];
  return {
    id: row["id"],
    productId: row["product_id"] ?? null,
    variantId: row["variant_id"] ?? null,
    packagingId: row["packaging_id"] ?? null,
    name: itemName(row),
    variantLabel: variantLabel(row),
    sku: itemSku(row),
    kind: row["packaging_id"] ? "packaging" : "product",
    qtyOnHand: Number(row["qty_on_hand"] ?? 0),
    qtyReserved: Number(row["qty_reserved"] ?? 0),
    wacCost: Number(row["wac_cost"] ?? 0),
    sellPrice: p ? Number(p.price ?? 0) + Number(v?.price_delta ?? 0) : 0,
    reorderPoint: Number(row["reorder_point"] ?? 0),
    reorderQty: Number(row["reorder_qty"] ?? 0),
    lastMovementAt: row["last_movement_at"] ?? null,
  };
}

export const LEVEL_SELECT =
  "*, products(id,name_en,name_bn,sku,price,kind), product_variants(id,sku,group_name_en,value_en,price_delta), packaging_materials(id,name,sku,unit)";

export const LEDGER_SELECT =
  "*, products(name_en,name_bn), product_variants(group_name_en,value_en), packaging_materials(name)";

export function mapLedger(row: LevelRow): LedgerRow {
  const p = row["products"];
  const v = row["product_variants"];
  const pack = row["packaging_materials"];
  const base = pack?.name ?? p?.name_en ?? p?.name_bn ?? "Item";
  const vl = v ? ` · ${v.group_name_en}: ${v.value_en}` : "";
  return {
    id: row["id"],
    movementType: row["movement_type"] as MovementType,
    quantity: Number(row["quantity"] ?? 0),
    unitCost: Number(row["unit_cost"] ?? 0),
    totalCost: Number(row["total_cost"] ?? 0),
    sku: row["sku"] ?? null,
    name: `${base}${vl}`,
    reason: row["reason"] ?? null,
    note: row["note"] ?? null,
    referenceLabel: row["reference_label"] ?? null,
    actorName: row["actor_name"] ?? null,
    createdAt: row["created_at"],
  };
}

/* ------------------------------------------------------------------ */
/* Storefront stock sync                                               */
/* ------------------------------------------------------------------ */

/**
 * Mirrors the ledger-derived on-hand quantity back into the catalog
 * `stock` columns the storefront already reads, so no extra query is
 * needed on the public side.
 */
export async function syncCatalogStock(
  db: Db,
  productId: string | null,
  variantId: string | null,
): Promise<void> {
  if (!productId) return;

  if (variantId) {
    const { data: vrow } = await db
      .from("inventory_levels")
      .select("qty_on_hand")
      .eq("variant_id", variantId)
      .maybeSingle();
    const qty = Number((vrow as { qty_on_hand?: number } | null)?.qty_on_hand ?? 0);
    await db.from("product_variants").update({ stock: Math.max(qty, 0) }).eq("id", variantId);

    // Product-level stock = sum of its variants.
    const { data: all } = await db
      .from("inventory_levels")
      .select("qty_on_hand")
      .eq("product_id", productId);
    const total = (all ?? []).reduce(
      (s: number, r: { qty_on_hand: number }) => s + Number(r.qty_on_hand ?? 0),
      0,
    );
    await db.from("products").update({ stock: Math.max(total, 0) }).eq("id", productId);
    return;
  }

  const { data } = await db
    .from("inventory_levels")
    .select("qty_on_hand")
    .eq("product_id", productId)
    .is("variant_id", null)
    .maybeSingle();
  const qty = Number((data as { qty_on_hand?: number } | null)?.qty_on_hand ?? 0);
  await db.from("products").update({ stock: Math.max(qty, 0) }).eq("id", productId);
}


/** Current weighted-average cost for an item (0 when never stocked). */
export async function currentWac(
  db: Db,
  target: { productId: string | null; variantId: string | null; packagingId: string | null },
): Promise<number> {
  let q = db.from("inventory_levels").select("wac_cost");
  q = target.packagingId
    ? q.eq("packaging_id", target.packagingId)
    : q.eq("product_id", target.productId!);
  if (!target.packagingId) {
    q = target.variantId ? q.eq("variant_id", target.variantId) : q.is("variant_id", null);
  }
  const { data } = await q.maybeSingle();
  return Number((data as { wac_cost?: number } | null)?.wac_cost ?? 0);
}
