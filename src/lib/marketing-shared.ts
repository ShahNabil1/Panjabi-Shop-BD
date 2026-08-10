/** Client-safe types and constants for the Marketing dashboards. */

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

export type DateRange = { since: string; until: string; days: number };

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

export const CAMPAIGN_LEVELS = ["campaign", "adset", "ad"] as const;
export type CampaignLevel = (typeof CAMPAIGN_LEVELS)[number];

export const levelLabel: Record<CampaignLevel, string> = {
  campaign: "Campaigns",
  adset: "Ad sets",
  ad: "Ads",
};

export type CampaignRow = {
  id: string;
  name: string;
  parentName: string | null;
  status: string | null;
  effectiveStatus: string | null;
  objective: string | null;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  purchases: number;
  purchaseValue: number;
  roas: number;
  addToCart: number;
  initiateCheckout: number;
  landingPageViews: number;
  costPerPurchase: number;
};

export type CampaignPerformance = {
  connected: boolean;
  message?: string;
  currency: string;
  level: CampaignLevel;
  range: DateRange;
  rows: CampaignRow[];
  totals: MetaMetrics;
};

export type CreativeRow = {
  adId: string;
  name: string;
  campaignName: string | null;
  status: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  body: string | null;
  isVideo: boolean;
  spend: number;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  purchases: number;
  purchaseValue: number;
  roas: number;
  /** 3-second video views ÷ impressions (attention grabbed). */
  hookRate: number;
  /** ThruPlays ÷ 3-second views (attention held). */
  holdRate: number;
  videoViews3s: number;
  thruPlays: number;
  avgWatchSeconds: number;
  retention: { p25: number; p50: number; p75: number; p100: number };
};

export type CreativePerformance = {
  connected: boolean;
  message?: string;
  currency: string;
  range: DateRange;
  rows: CreativeRow[];
};

export type AudienceRow = {
  id: string;
  name: string;
  subtype: string | null;
  description: string | null;
  approximateCount: number | null;
  retentionDays: number | null;
  deliveryStatus: string | null;
  operationStatus: string | null;
  updatedAt: string | null;
  /** Meta only lets you advertise to audiences of 1,000+ people. */
  ready: boolean;
};

export type CatalogHealth = {
  configured: boolean;
  id: string | null;
  name: string | null;
  productCount: number | null;
  productSets: number | null;
  issues: { severity: string; title: string; affectedCount: number | null; type: string | null }[];
};

export type PixelHealth = {
  id: string;
  name: string | null;
  lastFiredAt: string | null;
  /** Hours since the last server/browser event reached the dataset. */
  hoursSinceLastEvent: number | null;
  matchRate: number | null;
  automaticMatching: boolean | null;
  /** Recent event names with volume, newest window Meta exposes. */
  events: { name: string; count: number }[];
};

export type AudienceHealth = {
  connected: boolean;
  message?: string;
  audiences: AudienceRow[];
  catalog: CatalogHealth;
  pixel: PixelHealth | null;
  /** Warnings we generate ourselves from the payload above. */
  recommendations: { tone: "critical" | "warning" | "good"; text: string }[];
};
