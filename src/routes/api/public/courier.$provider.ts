/**
 * Public courier webhook receiver: /api/public/courier/:provider
 *
 * Steadfast  → secret sent as `Steadfast-Secret-Key` header (or `?secret=`).
 * Pathao     → secret sent as `X-PATHAO-Signature`; response must echo the
 *              fixed integration secret header with a 202 status.
 * Carrybee   → generic; secret via `X-Webhook-Secret` header or `?secret=`.
 */

import { createFileRoute } from "@tanstack/react-router";

import { DELIVERY_PROVIDERS, type DeliveryProvider } from "@/lib/delivery-shared";




export const Route = createFileRoute("/api/public/courier/$provider")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const provider = params.provider as DeliveryProvider;
        if (!DELIVERY_PROVIDERS.includes(provider)) {
          return Response.json({ status: 404, message: "Unknown provider" }, { status: 404 });
        }

        const {
          PATHAO_INTEGRATION_SECRET,
          verifyWebhookSecret,
          processCourierWebhook,
        } = await import("@/lib/courier-webhook.server");
        const { createPublicServerClient } = await import("@/lib/supabase-public");
        const db = createPublicServerClient();

        const pathaoHeaders = { "X-Pathao-Merchant-Webhook-Integration-Secret": PATHAO_INTEGRATION_SECRET };
        // CarryBee's webhook validator requires a 202 plus this fixed header on
        // every response, otherwise "Add Webhook" fails with a 401 mismatch.
        const carrybeeHeaders = { "X-CB-Webhook-Integration-Header": "40489fe0-9386-4fc9-8e92-2b2fcb9d451c" };
        const respond = (body: unknown, status: number) => {
          if (provider === "pathao") {
            return Response.json(body, { status: status === 200 ? 202 : status, headers: pathaoHeaders });
          }
          if (provider === "carrybee") {
            return Response.json(body, { status: 202, headers: carrybeeHeaders });
          }
          return Response.json(body, { status });
        };

        const url = new URL(request.url);
        const supplied =
          request.headers.get("x-pathao-signature") ??
          request.headers.get("steadfast-secret-key") ??
          request.headers.get("x-webhook-secret") ??
          request.headers.get("x-cb-webhook-secret") ??
          request.headers.get("x-carrybee-signature") ??
          url.searchParams.get("secret") ??
          "";

        const check = await verifyWebhookSecret(db, provider, supplied);
        if (check === "unconfigured") {
          return respond({ status: 403, message: "Provider not configured" }, 403);
        }
        if (check !== "ok") {
          return respond({ status: 401, message: "Invalid webhook secret" }, 401);
        }


        let payload: Record<string, unknown>;
        try {
          payload = (await request.json()) as Record<string, unknown>;
        } catch {
          return respond({ status: 400, message: "Invalid JSON body" }, 400);
        }

        const result = await processCourierWebhook(db, provider, payload);
        // Always 200/202 once authenticated so couriers stop retrying.
        return respond({ status: 200, message: result.message }, 200);
      },
    },
  },
});
