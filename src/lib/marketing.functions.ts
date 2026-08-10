import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "./admin.server";
import {
  MARKETING_PRESETS,
  buildMarketingOverview,
  clearMarketingCache,
  type MarketingOverview,
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
