import { createFileRoute } from "@tanstack/react-router";

/**
 * Daily Steadfast payout reconciliation (4:00 AM Bangladesh time).
 * Called by pg_cron with the project's publishable key.
 */
export const Route = createFileRoute("/api/public/hooks/steadfast-payments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const apiKey = request.headers.get("apikey") ?? authHeader.replace("Bearer ", "");
        const expected = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        if (!apiKey || apiKey !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { syncSteadfastPayments } = await import("@/lib/steadfast-payments.server");

        const { data: partner } = await supabaseAdmin
          .from("delivery_partners")
          .select("credentials, enabled")
          .eq("provider", "steadfast")
          .eq("enabled", true)
          .maybeSingle();

        const creds = (partner?.credentials ?? {}) as Record<string, string>;
        if (!creds["api_key"] || !creds["secret_key"]) {
          return Response.json({ success: true, message: "Steadfast not configured" });
        }

        try {
          const result = await syncSteadfastPayments(supabaseAdmin, {
            api_key: creds["api_key"],
            secret_key: creds["secret_key"],
            ...(creds["base_url"] ? { base_url: creds["base_url"] } : {}),
          });
          return Response.json({ success: true, ...result });
        } catch (e) {
          return new Response(
            JSON.stringify({ success: false, error: (e as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
