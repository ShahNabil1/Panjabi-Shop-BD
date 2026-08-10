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
