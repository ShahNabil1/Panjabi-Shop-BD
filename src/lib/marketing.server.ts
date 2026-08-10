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
import type {
  CampaignLevel,
  CampaignPerformance,
  CreativePerformance,
  DateRange,
  MarketingOverview,
  MarketingPreset,
  MarketingSeriesPoint,
  MetaMetrics,
  OrderMetrics,
} from "./marketing-shared";

export { MARKETING_PRESETS } from "./marketing-shared";

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

/* ------------------------------------------------------------------ *
 * Campaign / ad-set / ad level performance
 * ------------------------------------------------------------------ */

type EntityRow = {
  id: string;
  name?: string;
  status?: string;
  effective_status?: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
};

const LEVEL_FIELDS: Record<CampaignLevel, string> = {
  campaign: "campaign_id,campaign_name",
  adset: "adset_id,adset_name,campaign_name",
  ad: "ad_id,ad_name,adset_name",
};

const EDGE: Record<CampaignLevel, string> = {
  campaign: "campaigns",
  adset: "adsets",
  ad: "ads",
};

const ENTITY_FIELDS: Record<CampaignLevel, string> = {
  campaign: "id,name,status,effective_status,objective,daily_budget,lifetime_budget",
  adset: "id,name,status,effective_status,daily_budget,lifetime_budget",
  ad: "id,name,status,effective_status",
};

async function loadEntities(cfg: MetaConfig, level: CampaignLevel) {
  return cached(`ent:${level}:${cfg.adAccountId}:${cfg.version}`, async () => {
    const res = await metaGet<{ data?: EntityRow[] }>(
      cfg,
      `${actId(cfg.adAccountId)}/${EDGE[level]}`,
      { fields: ENTITY_FIELDS[level], limit: 200 },
    );
    const map = new Map<string, EntityRow>();
    for (const row of res.data ?? []) map.set(row.id, row);
    return map;
  });
}

/** Builds the Marketing → Campaigns payload for one hierarchy level. */
export async function buildCampaignPerformance(
  preset: MarketingPreset,
  level: CampaignLevel,
): Promise<CampaignPerformance> {
  const range = resolveRange(preset);
  const cfg = await readMetaConfig();
  const empty: CampaignPerformance = {
    connected: false,
    currency: "USD",
    level,
    range,
    rows: [],
    totals: emptyMeta(),
  };
  if (!cfg) {
    return {
      ...empty,
      message: "Meta Marketing API is not configured yet.",
    };
  }

  try {
    const [acct, rows, entities] = await Promise.all([
      cached(`acct:${cfg.adAccountId}:${cfg.version}`, () =>
        metaGet<{ name?: string; currency?: string }>(cfg, actId(cfg.adAccountId), {
          fields: "name,currency",
        }),
      ),
      fetchInsights(cfg, range, {
        level,
        fields: `${INSIGHT_FIELDS},${LEVEL_FIELDS[level]}`,
      }) as Promise<(InsightRow & Record<string, unknown>)[]>,
      loadEntities(cfg, level),
    ]);

    const built = rows.map((raw) => {
      const id = String(
        raw[`${level}_id` as keyof typeof raw] ?? raw["campaign_id" as keyof typeof raw] ?? "",
      );
      const name = String(raw[`${level}_name` as keyof typeof raw] ?? id);
      const parentName =
        level === "adset"
          ? ((raw["campaign_name" as keyof typeof raw] as string) ?? null)
          : level === "ad"
            ? ((raw["adset_name" as keyof typeof raw] as string) ?? null)
            : null;
      const m = toMetrics([raw]);
      const ent = entities.get(id);
      return {
        id,
        name,
        parentName,
        status: ent?.status ?? null,
        effectiveStatus: ent?.effective_status ?? null,
        objective: ent?.objective ?? null,
        dailyBudget: ent?.daily_budget ? num(ent.daily_budget) / 100 : null,
        lifetimeBudget: ent?.lifetime_budget ? num(ent.lifetime_budget) / 100 : null,
        spend: m.spend,
        impressions: m.impressions,
        reach: m.reach,
        frequency: m.frequency,
        clicks: m.clicks,
        ctr: m.ctr,
        cpc: m.cpc,
        cpm: m.cpm,
        purchases: m.purchases,
        purchaseValue: m.purchaseValue,
        roas: m.roas,
        addToCart: m.addToCart,
        initiateCheckout: m.initiateCheckout,
        landingPageViews: m.landingPageViews,
        costPerPurchase: m.purchases > 0 ? m.spend / m.purchases : 0,
      };
    });

    built.sort((a, b) => b.spend - a.spend);

    return {
      connected: true,
      currency: acct.currency || "USD",
      level,
      range,
      rows: built,
      totals: toMetrics(rows),
    };
  } catch (error) {
    return {
      ...empty,
      message: error instanceof Error ? error.message : "Meta insights unavailable",
    };
  }
}

/* ------------------------------------------------------------------ *
 * Creative performance (hook / hold / retention)
 * ------------------------------------------------------------------ */

const VIDEO_FIELDS = [
  "video_play_actions",
  "video_thruplay_watched_actions",
  "video_p25_watched_actions",
  "video_p50_watched_actions",
  "video_p75_watched_actions",
  "video_p100_watched_actions",
  "video_avg_time_watched_actions",
].join(",");

type VideoRow = InsightRow & {
  ad_id?: string;
  ad_name?: string;
  campaign_name?: string;
  video_play_actions?: InsightAction[];
  video_thruplay_watched_actions?: InsightAction[];
  video_p25_watched_actions?: InsightAction[];
  video_p50_watched_actions?: InsightAction[];
  video_p75_watched_actions?: InsightAction[];
  video_p100_watched_actions?: InsightAction[];
  video_avg_time_watched_actions?: InsightAction[];
};

const sumAction = (list: InsightAction[] | undefined) =>
  (list ?? []).reduce((acc, a) => acc + num(a.value), 0);

type AdCreativeRow = {
  id: string;
  name?: string;
  effective_status?: string;
  preview_shareable_link?: string;
  creative?: {
    thumbnail_url?: string;
    video_id?: string;
    body?: string;
    object_story_spec?: { video_data?: unknown; link_data?: { message?: string } };
  };
};

async function loadAdCreatives(cfg: MetaConfig) {
  return cached(`creatives:${cfg.adAccountId}:${cfg.version}`, async () => {
    const res = await metaGet<{ data?: AdCreativeRow[] }>(
      cfg,
      `${actId(cfg.adAccountId)}/ads`,
      {
        fields:
          "id,name,effective_status,preview_shareable_link,creative{thumbnail_url,video_id,body,object_story_spec}",
        limit: 200,
      },
    );
    const map = new Map<string, AdCreativeRow>();
    for (const row of res.data ?? []) map.set(row.id, row);
    return map;
  });
}

/** Builds the Marketing → Creatives payload. */
export async function buildCreativePerformance(
  preset: MarketingPreset,
): Promise<CreativePerformance> {
  const range = resolveRange(preset);
  const cfg = await readMetaConfig();
  if (!cfg) {
    return {
      connected: false,
      message: "Meta Marketing API is not configured yet.",
      currency: "USD",
      range,
      rows: [],
    };
  }

  try {
    const [acct, rows, creatives] = await Promise.all([
      cached(`acct:${cfg.adAccountId}:${cfg.version}`, () =>
        metaGet<{ name?: string; currency?: string }>(cfg, actId(cfg.adAccountId), {
          fields: "name,currency",
        }),
      ),
      fetchInsights(cfg, range, {
        level: "ad",
        fields: `${INSIGHT_FIELDS},ad_id,ad_name,campaign_name,${VIDEO_FIELDS}`,
      }) as Promise<VideoRow[]>,
      loadAdCreatives(cfg),
    ]);

    const built = rows.map((raw) => {
      const m = toMetrics([raw]);
      const ad = creatives.get(raw.ad_id ?? "");
      const views3s = sumAction(raw.video_play_actions);
      const thru = sumAction(raw.video_thruplay_watched_actions);
      const p25 = sumAction(raw.video_p25_watched_actions);
      const p50 = sumAction(raw.video_p50_watched_actions);
      const p75 = sumAction(raw.video_p75_watched_actions);
      const p100 = sumAction(raw.video_p100_watched_actions);
      const avg = sumAction(raw.video_avg_time_watched_actions);
      const spec = ad?.creative?.object_story_spec;
      return {
        adId: raw.ad_id ?? "",
        name: raw.ad_name ?? ad?.name ?? raw.ad_id ?? "Untitled ad",
        campaignName: raw.campaign_name ?? null,
        status: ad?.effective_status ?? null,
        thumbnailUrl: ad?.creative?.thumbnail_url ?? null,
        permalink: ad?.preview_shareable_link ?? null,
        body: ad?.creative?.body ?? spec?.link_data?.message ?? null,
        isVideo: Boolean(ad?.creative?.video_id || spec?.video_data || views3s > 0),
        spend: m.spend,
        impressions: m.impressions,
        reach: m.reach,
        frequency: m.frequency,
        clicks: m.clicks,
        ctr: m.ctr,
        cpc: m.cpc,
        cpm: m.cpm,
        purchases: m.purchases,
        purchaseValue: m.purchaseValue,
        roas: m.roas,
        hookRate: m.impressions > 0 ? (views3s / m.impressions) * 100 : 0,
        holdRate: views3s > 0 ? (thru / views3s) * 100 : 0,
        videoViews3s: views3s,
        thruPlays: thru,
        avgWatchSeconds: avg,
        retention: {
          p25: views3s > 0 ? (p25 / views3s) * 100 : 0,
          p50: views3s > 0 ? (p50 / views3s) * 100 : 0,
          p75: views3s > 0 ? (p75 / views3s) * 100 : 0,
          p100: views3s > 0 ? (p100 / views3s) * 100 : 0,
        },
      };
    });

    built.sort((a, b) => b.spend - a.spend);

    return {
      connected: true,
      currency: acct.currency || "USD",
      range,
      rows: built,
    };
  } catch (error) {
    return {
      connected: false,
      message: error instanceof Error ? error.message : "Meta insights unavailable",
      currency: "USD",
      range,
      rows: [],
    };
  }
}
