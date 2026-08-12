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


/* ------------------------------------------------------------------ */
/* Smart combo availability                                            */
/* ------------------------------------------------------------------ */

export type ComboAvailability = {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  isActive: boolean;
  buildable: number;
  items: Array<{
    id: string;
    name: string;
    sku: string | null;
    perBox: number;
    onHand: number;
    buildable: number;
    isFree: boolean;
    bottleneck: boolean;
  }>;
};

/**
 * Combos hold no stock of their own — how many boxes can be built is decided
 * by the scarcest sub-product inside the recipe.
 */
export async function computeComboAvailability(db: Db): Promise<ComboAvailability[]> {
  const { data: comboData } = await db
    .from("products")
    .select("id,name_en,name_bn,sku,price,is_active")
    .eq("kind", "combo")
    .order("name_en");
  const combos = (comboData ?? []) as unknown as Array<Record<string, any>>;
  if (combos.length === 0) return [];

  const [bomRes, levelRes] = await Promise.all([
    db
      .from("combo_items")
      .select("combo_id,item_id,quantity,is_free,products!combo_items_item_id_fkey(name_en,name_bn,sku)")
      .in("combo_id", combos.map((c) => c["id"] as string)),
    db.from("inventory_levels").select("product_id,qty_on_hand").not("product_id", "is", null),
  ]);

  const bom = (bomRes.data ?? []) as unknown as Array<Record<string, any>>;
  const onHand = new Map<string, number>();
  for (const r of (levelRes.data ?? []) as Array<{ product_id: string; qty_on_hand: number }>) {
    onHand.set(r.product_id, (onHand.get(r.product_id) ?? 0) + Number(r.qty_on_hand ?? 0));
  }

  return combos.map((c) => {
    const lines = bom.filter((b) => b["combo_id"] === c["id"]);
    const items = lines.map((l) => {
      const perBox = Math.max(Number(l["quantity"] ?? 1), 1);
      const have = onHand.get(l["item_id"] as string) ?? 0;
      return {
        id: l["item_id"] as string,
        name: String(l["products"]?.name_en || l["products"]?.name_bn || "Sub-product"),
        sku: (l["products"]?.sku as string | null) ?? null,
        perBox,
        onHand: have,
        buildable: Math.floor(have / perBox),
        isFree: Boolean(l["is_free"]),
        bottleneck: false,
      };
    });
    const buildable = items.length === 0 ? 0 : Math.min(...items.map((i) => i.buildable));
    for (const i of items) i.bottleneck = items.length > 0 && i.buildable === buildable;
    return {
      id: c["id"] as string,
      name: String(c["name_en"] || c["name_bn"]),
      sku: (c["sku"] as string | null) ?? null,
      price: Number(c["price"] ?? 0),
      isActive: Boolean(c["is_active"]),
      buildable,
      items,
    };
  });
}
