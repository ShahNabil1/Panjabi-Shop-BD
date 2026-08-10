/**
 * Marketing analytics — server-only helpers.
 *
 * Combines Meta Marketing API insights with our own order table so the admin
 * can compare platform-reported performance against real, in-store revenue
 * (blended ROAS) and money that actually got delivered (true ROAS).
 *
 * Every Graph API response is cached in-memory for a short window so the
 * dashboard can be refreshed freely without burning through Meta rate limits.
 */

import { actId, metaGet, readMetaConfig, type MetaConfig } from "./meta.server";

export const MARKETING_PRESETS = ["today", "yesterday", "7d", "14d", "30d", "90d"] as const;
export type MarketingPreset = (typeof MARKETING_PRESETS)[number];

export const presetLabel: Record<MarketingPreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  "14d": "Last 14 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

const DAY = 86_400_000;
const CACHE_TTL_MS = 5 * 60_000;

const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, load: () => Promise<T>, ttl = CACHE_TTL_MS): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** Drops every cached Graph API response (used by the manual refresh button). */
export function clearMarketingCache() {
  cache.clear();
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export type DateRange = { since: string; until: string; days: number };

/** Resolve a preset into an inclusive `YYYY-MM-DD` range (UTC based). */
export function resolveRange(preset: MarketingPreset): DateRange {
  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (preset === "today") return { since: isoDay(end), until: isoDay(end), days: 1 };
  if (preset === "yesterday") {
    const y = new Date(end.getTime() - DAY);
    return { since: isoDay(y), until: isoDay(y), days: 1 };
  }
  const days = preset === "7d" ? 7 : preset === "14d" ? 14 : preset === "30d" ? 30 : 90;
  return { since: isoDay(new Date(end.getTime() - (days - 1) * DAY)), until: isoDay(end), days };
}

/** The equally long window immediately before `range`, for trend comparison. */
export function previousRange(range: DateRange): DateRange {
  const since = new Date(`${range.since}T00:00:00Z`).getTime();
  const prevUntil = new Date(since - DAY);
  const prevSince = new Date(since - range.days * DAY);
  return { since: isoDay(prevSince), until: isoDay(prevUntil), days: range.days };
}

type InsightAction = { action_type: string; value: string };
type InsightRow = {
  date_start?: string;
  date_stop?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  reach?: string;
  frequency?: string;
  cpm?: string;
  cpc?: string;
  ctr?: string;
  actions?: InsightAction[];
  action_values?: InsightAction[];
  purchase_roas?: InsightAction[];
};

const INSIGHT_FIELDS =
  "spend,impressions,clicks,reach,frequency,cpm,cpc,ctr,actions,action_values,purchase_roas";

const num = (v: string | number | null | undefined) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const PURCHASE_TYPES = new Set([
  "purchase",
  "omni_purchase",
  "offsite_conversion.fb_pixel_purchase",
]);

function pickAction(list: InsightAction[] | undefined, match: (t: string) => boolean) {
  let best = 0;
  for (const a of list ?? []) if (match(a.action_type)) best = Math.max(best, num(a.value));
  return best;
}

export type MetaMetrics = {
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  frequency: number;
  cpm: number;
  cpc: number;
  ctr: number;
  purchases: number;
  purchaseValue: number;
  roas: number;
  addToCart: number;
  initiateCheckout: number;
  landingPageViews: number;
};

function toMetrics(rows: InsightRow[]): MetaMetrics {
  let spend = 0;
  let impressions = 0;
  let clicks = 0;
  let reach = 0;
  let purchases = 0;
  let purchaseValue = 0;
  let addToCart = 0;
  let initiateCheckout = 0;
  let landingPageViews = 0;

  for (const r of rows) {
    spend += num(r.spend);
    impressions += num(r.impressions);
    clicks += num(r.clicks);
    reach += num(r.reach);
    purchases += pickAction(r.actions, (t) => PURCHASE_TYPES.has(t));
    purchaseValue += pickAction(r.action_values, (t) => PURCHASE_TYPES.has(t));
    addToCart += pickAction(r.actions, (t) => t.includes("add_to_cart"));
    initiateCheckout += pickAction(r.actions, (t) => t.includes("initiate_checkout"));
    landingPageViews += pickAction(r.actions, (t) => t === "landing_page_view");
  }

  return {
    spend,
    impressions,
    clicks,
    reach,
    frequency: reach > 0 ? impressions / reach : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    purchases,
    purchaseValue,
    roas: spend > 0 ? purchaseValue / spend : 0,
    addToCart,
    initiateCheckout,
    landingPageViews,
  };
}

async function fetchInsights(
  cfg: MetaConfig,
  range: DateRange,
  extra: Record<string, string> = {},
): Promise<InsightRow[]> {
  const key = JSON.stringify([cfg.adAccountId, cfg.version, range.since, range.until, extra]);
  return cached(key, async () => {
    const res = await metaGet<{ data?: InsightRow[] }>(cfg, `${actId(cfg.adAccountId)}/insights`, {
      fields: INSIGHT_FIELDS,
      time_range: JSON.stringify({ since: range.since, until: range.until }),
      level: "account",
      limit: 500,
      ...extra,
    });
    return res.data ?? [];
  });
}

export type OrderMetrics = {
  orders: number;
  revenue: number;
  deliveredOrders: number;
  deliveredRevenue: number;
  pendingOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  deliveryRate: number;
};

type OrderRow = { total: number | string; status: string; created_at: string };

const DELIVERED = new Set(["delivered", "partial_delivered"]);
const VOID = new Set(["cancelled", "returned", "lost_damaged"]);

export function toOrderMetrics(rows: OrderRow[]): OrderMetrics {
  let orders = 0;
  let revenue = 0;
  let deliveredOrders = 0;
  let deliveredRevenue = 0;
  let pendingOrders = 0;
  let cancelledOrders = 0;

  for (const r of rows) {
    const total = num(r.total);
    orders += 1;
    if (!VOID.has(r.status)) revenue += total;
    if (DELIVERED.has(r.status)) {
      deliveredOrders += 1;
      deliveredRevenue += total;
    }
    if (r.status === "pending") pendingOrders += 1;
    if (VOID.has(r.status)) cancelledOrders += 1;
  }

  const settled = deliveredOrders + cancelledOrders;
  return {
    orders,
    revenue,
    deliveredOrders,
    deliveredRevenue,
    pendingOrders,
    cancelledOrders,
    averageOrderValue: orders > 0 ? revenue / orders : 0,
    deliveryRate: settled > 0 ? (deliveredOrders / settled) * 100 : 0,
  };
}

export type MarketingSeriesPoint = {
  date: string;
  spend: number;
  revenue: number;
  deliveredRevenue: number;
  orders: number;
  metaPurchases: number;
};

export type MarketingOverview = {
  connected: boolean;
  message?: string;
  currency: string;
  accountName: string;
  range: DateRange;
  meta: MetaMetrics;
  metaPrevious: MetaMetrics;
  orders: OrderMetrics;
  ordersPrevious: OrderMetrics;
  series: MarketingSeriesPoint[];
  /** Store revenue ÷ ad spend across every channel. */
  blendedRoas: number;
  /** Delivered (money actually collected) revenue ÷ ad spend. */
  trueRoas: number;
  blendedRoasPrevious: number;
  trueRoasPrevious: number;
  costPerOrder: number;
  costPerDeliveredOrder: number;
  /** Ad spend as a percentage of store revenue. */
  spendShare: number;
};

type SupabaseLike = {
  from: (table: string) => {
    select: (cols: string) => {
      gte: (
        col: string,
        v: string,
      ) => {
        lte: (col: string, v: string) => Promise<{ data: unknown; error: unknown }>;
      };
    };
  };
};

async function loadOrders(db: SupabaseLike, range: DateRange): Promise<OrderRow[]> {
  const { data } = await db
    .from("orders")
    .select("total, status, created_at")
    .gte("created_at", `${range.since}T00:00:00Z`)
    .lte("created_at", `${range.until}T23:59:59Z`);
  return (data ?? []) as OrderRow[];
}

const emptyMeta = (): MetaMetrics => toMetrics([]);

/** Builds the whole Marketing → Overview payload. */
export async function buildMarketingOverview(
  db: SupabaseLike,
  preset: MarketingPreset,
): Promise<MarketingOverview> {
  const range = resolveRange(preset);
  const prev = previousRange(range);
  const cfg = await readMetaConfig();

  const [orderRows, prevOrderRows] = await Promise.all([
    loadOrders(db, range),
    loadOrders(db, prev),
  ]);

  const orders = toOrderMetrics(orderRows);
  const ordersPrevious = toOrderMetrics(prevOrderRows);

  const base = {
    currency: "USD",
    accountName: "",
    range,
    orders,
    ordersPrevious,
  };

  if (!cfg) {
    return {
      ...base,
      connected: false,
      message: "Meta Marketing API is not configured yet.",
      meta: emptyMeta(),
      metaPrevious: emptyMeta(),
      series: dailySeries(range, [], orderRows),
      blendedRoas: 0,
      trueRoas: 0,
      blendedRoasPrevious: 0,
      trueRoasPrevious: 0,
      costPerOrder: 0,
      costPerDeliveredOrder: 0,
      spendShare: 0,
    };
  }

  let meta = emptyMeta();
  let metaPrevious = emptyMeta();
  let daily: InsightRow[] = [];
  let currency = "USD";
  let accountName = cfg.adAccountId;
  let message: string | undefined;
  let connected = true;

  try {
    const [acct, current, previous, dailyRows] = await Promise.all([
      cached(`acct:${cfg.adAccountId}:${cfg.version}`, () =>
        metaGet<{ name?: string; currency?: string }>(cfg, actId(cfg.adAccountId), {
          fields: "name,currency",
        }),
      ),
      fetchInsights(cfg, range),
      fetchInsights(cfg, prev),
      fetchInsights(cfg, range, { time_increment: "1" }),
    ]);
    currency = acct.currency || "USD";
    accountName = acct.name || cfg.adAccountId;
    meta = toMetrics(current);
    metaPrevious = toMetrics(previous);
    daily = dailyRows;
  } catch (error) {
    connected = false;
    message = error instanceof Error ? error.message : "Meta insights unavailable";
  }

  const blendedRoas = meta.spend > 0 ? orders.revenue / meta.spend : 0;
  const trueRoas = meta.spend > 0 ? orders.deliveredRevenue / meta.spend : 0;

  return {
    ...base,
    connected,
    ...(message ? { message } : {}),
    currency,
    accountName,
    meta,
    metaPrevious,
    series: dailySeries(range, daily, orderRows),
    blendedRoas,
    trueRoas,
    blendedRoasPrevious:
      metaPrevious.spend > 0 ? ordersPrevious.revenue / metaPrevious.spend : 0,
    trueRoasPrevious:
      metaPrevious.spend > 0 ? ordersPrevious.deliveredRevenue / metaPrevious.spend : 0,
    costPerOrder: orders.orders > 0 ? meta.spend / orders.orders : 0,
    costPerDeliveredOrder: orders.deliveredOrders > 0 ? meta.spend / orders.deliveredOrders : 0,
    spendShare: orders.revenue > 0 ? (meta.spend / orders.revenue) * 100 : 0,
  };
}

function dailySeries(
  range: DateRange,
  daily: InsightRow[],
  orderRows: OrderRow[],
): MarketingSeriesPoint[] {
  const points = new Map<string, MarketingSeriesPoint>();
  const start = new Date(`${range.since}T00:00:00Z`).getTime();
  for (let i = 0; i < range.days; i += 1) {
    const date = isoDay(new Date(start + i * DAY));
    points.set(date, {
      date,
      spend: 0,
      revenue: 0,
      deliveredRevenue: 0,
      orders: 0,
      metaPurchases: 0,
    });
  }

  for (const row of daily) {
    const date = row.date_start ?? "";
    const point = points.get(date);
    if (!point) continue;
    point.spend += num(row.spend);
    point.metaPurchases += pickAction(row.actions, (t) => PURCHASE_TYPES.has(t));
  }

  for (const row of orderRows) {
    const date = row.created_at.slice(0, 10);
    const point = points.get(date);
    if (!point) continue;
    const total = num(row.total);
    point.orders += 1;
    if (!VOID.has(row.status)) point.revenue += total;
    if (DELIVERED.has(row.status)) point.deliveredRevenue += total;
  }

  return [...points.values()];
}
