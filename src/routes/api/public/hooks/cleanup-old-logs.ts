import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/public/hooks/cleanup-old-logs")({
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

        const supabase = createClient<Database>(process.env["SUPABASE_URL"]!, expected, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              if (expected.startsWith("sb_") && h.get("Authorization") === `Bearer ${expected}`) {
                h.delete("Authorization");
              }
              h.set("apikey", expected);
              return fetch(input, { ...init, headers: h });
            },
          },
        });

        const { data: setting } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "retention")
          .single();

        const enabled = (setting?.value as Record<string, unknown> | undefined)?.enabled ?? true;
        if (!enabled) {
          return Response.json({ success: true, message: "Cleanup disabled" });
        }

        const days = Number((setting?.value as Record<string, unknown> | undefined)?.days ?? 90);
        const safeDays = Number.isFinite(days) && days > 0 ? Math.min(days, 730) : 90;

        const { data, error } = await supabase.rpc("cleanup_old_order_logs", {
          _retention_days: safeDays,
        });

        if (error) {
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const result = (data as Record<string, unknown> | null) ?? {};
        const now = new Date().toISOString();
        const nextValue = {
          ...((setting?.value ?? {}) as Record<string, unknown>),
          days: safeDays,
          last_run: now,
          last_result: result,
        };

        await supabase.from("site_settings").upsert({ key: "retention", value: nextValue as never }, { onConflict: "key" });

        return Response.json({ success: true, result });
      },
    },
  },
});
