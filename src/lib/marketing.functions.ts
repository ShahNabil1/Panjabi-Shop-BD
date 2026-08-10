import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "./admin.server";
import {
  CAMPAIGN_LEVELS,
  MARKETING_PRESETS,
  type AudienceHealth,
  type CampaignPerformance,
  type CreativePerformance,
  type MarketingOverview,
} from "./marketing-shared";
import {
  buildAudienceHealth,
  buildCampaignPerformance,
  buildCreativePerformance,
  buildMarketingOverview,
  clearMarketingCache,
} from "./marketing.server";

const overviewSchema = z.object({
  preset: z.enum(MARKETING_PRESETS).default("7d"),
  refresh: z.boolean().optional(),
});

/** Admin-only: Meta ad performance blended with real store orders. */
export const marketingOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => overviewSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<MarketingOverview> => {
    const db = await requireAdmin(context.supabase, context.userId);
    if (data.refresh) clearMarketingCache();
    return buildMarketingOverview(
      db as unknown as Parameters<typeof buildMarketingOverview>[0],
      data.preset,
    );
  });

const campaignSchema = z.object({
  preset: z.enum(MARKETING_PRESETS).default("7d"),
  level: z.enum(CAMPAIGN_LEVELS).default("campaign"),
  refresh: z.boolean().optional(),
});

/** Admin-only: campaign / ad-set / ad level Meta performance. */
export const marketingCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => campaignSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<CampaignPerformance> => {
    await requireAdmin(context.supabase, context.userId);
    if (data.refresh) clearMarketingCache();
    return buildCampaignPerformance(data.preset, data.level);
  });

const creativeSchema = z.object({
  preset: z.enum(MARKETING_PRESETS).default("7d"),
  refresh: z.boolean().optional(),
});

/** Admin-only: creative level performance with hook / hold rates. */
export const marketingCreatives = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => creativeSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<CreativePerformance> => {
    await requireAdmin(context.supabase, context.userId);
    if (data.refresh) clearMarketingCache();
    return buildCreativePerformance(data.preset);
  });

const refreshSchema = z.object({ refresh: z.boolean().optional() });

/** Admin-only: custom audience, catalog and pixel health snapshot. */
export const marketingAudiences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => refreshSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<AudienceHealth> => {
    await requireAdmin(context.supabase, context.userId);
    if (data.refresh) clearMarketingCache();
    return buildAudienceHealth();
  });
