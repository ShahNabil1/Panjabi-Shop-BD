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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

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
        const respond = (body: unknown, status: number) =>
          provider === "pathao"
            ? Response.json(body, { status: status === 200 ? 202 : status, headers: pathaoHeaders })
            : Response.json(body, { status });

        const url = new URL(request.url);
        const supplied =
          request.headers.get("x-pathao-signature") ??
          request.headers.get("steadfast-secret-key") ??
          request.headers.get("x-webhook-secret") ??
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
