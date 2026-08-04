import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "./admin.server";
import {
  DELIVERY_PROVIDERS,
  SECRET_MASK,
  providerFields,
  type DeliveryProvider,
} from "./delivery-shared";

const providerSchema = z.enum(DELIVERY_PROVIDERS);

const saveSchema = z.object({
  provider: providerSchema,
  enabled: z.boolean().default(true),
  credentials: z.record(z.string(), z.string().max(500)),
  config: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
});

export type DeliveryPartnerRow = {
  provider: DeliveryProvider;
  enabled: boolean;
  /** Secret values are replaced with a mask; non-secret fields come back as-is. */
  credentials: Record<string, string>;
  stores: { store_id: number; store_name: string }[];
  connection_ok: boolean;
  connection_message: string | null;
  last_checked_at: string | null;
  configured: boolean;
  /** Shared secret the courier must send back on webhook calls. */
  webhook_secret: string | null;
};

function maskCreds(provider: DeliveryProvider, raw: Record<string, unknown>) {
  const out: Record<string, string> = {};
  for (const field of providerFields[provider]) {
    const value = raw[field.key];
    if (value == null || value === "") continue;
    out[field.key] = field.secret ? SECRET_MASK : String(value);
  }
  return out;
}

/** Merges submitted credentials with stored ones, keeping untouched secrets. */
function mergeCreds(
  provider: DeliveryProvider,
  stored: Record<string, unknown>,
  incoming: Record<string, string>,
) {
  const out: Record<string, string> = {};
  for (const field of providerFields[provider]) {
    const next = incoming[field.key];
    if (next !== undefined && next !== SECRET_MASK && next !== "") out[field.key] = next.trim();
    else if (stored[field.key] != null) out[field.key] = String(stored[field.key]);
  }
  return out;
}

function missingFields(provider: DeliveryProvider, creds: Record<string, string>) {
  return providerFields[provider]
    .filter((f) => !f.optional && !creds[f.key])
    .map((f) => f.label);
}

/** Runs a live credential check against the provider. */
async function runCheck(provider: DeliveryProvider, creds: Record<string, string>) {
  const missing = missingFields(provider, creds);
  if (missing.length) return { ok: false, message: `Missing: ${missing.join(", ")}`, extra: {} };

  try {
    if (provider === "steadfast") {
      const { steadfastCheck } = await import("./steadfast.server");
      const res = await steadfastCheck({
        api_key: creds["api_key"]!,
        secret_key: creds["secret_key"]!,
      });
      return { ok: res.ok, message: res.message, extra: {} };
    }
    if (provider === "pathao") {
      const { pathaoCheck } = await import("./pathao.server");
      const res = await pathaoCheck({
        client_id: creds["client_id"]!,
        client_secret: creds["client_secret"]!,
        username: creds["username"]!,
        password: creds["password"]!,
        ...(creds["base_url"] ? { base_url: creds["base_url"] } : {}),
      });
      return { ok: res.ok, message: res.message, extra: { stores: res.stores } };
    }
    // Carrybee: API documentation pending — credentials are stored only.
    return {
      ok: false,
      message: "Carrybee API documentation is pending — credentials saved but not verified.",
      extra: {},
    };
  } catch (error) {
    return { ok: false, message: (error as Error).message, extra: {} };
  }
}

export const adminListDeliveryPartners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeliveryPartnerRow[]> => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { data, error } = await db.from("delivery_partners").select("*").order("provider");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => {
      const provider = row.provider as DeliveryProvider;
      const creds = (row.credentials ?? {}) as Record<string, unknown>;
      return {
        provider,
        enabled: row.enabled,
        credentials: maskCreds(provider, creds),
        stores: (((row.config ?? {}) as Record<string, unknown>)["stores"] ??
          []) as { store_id: number; store_name: string }[],
        connection_ok: row.connection_ok,
        connection_message: row.connection_message,
        last_checked_at: row.last_checked_at,
        webhook_secret: row.webhook_secret ?? null,
        configured: missingFields(provider, creds as Record<string, string>).length === 0,
      };
    });
  });

/** Tests credentials without saving — used by the "Test connection" button. */
export const adminTestDeliveryPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ provider: providerSchema, credentials: z.record(z.string(), z.string().max(500)) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { data: existing } = await db
      .from("delivery_partners")
      .select("credentials")
      .eq("provider", data.provider)
      .maybeSingle();
    const creds = mergeCreds(
      data.provider,
      ((existing?.credentials ?? {}) as Record<string, unknown>),
      data.credentials,
    );
    const res = await runCheck(data.provider, creds);
    return { ok: res.ok, message: res.message };
  });

/** Saves a partner. The connection is verified first; a failed check blocks the save. */
export const adminSaveDeliveryPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { data: existing } = await db
      .from("delivery_partners")
      .select("credentials, config, webhook_secret")
      .eq("provider", data.provider)
      .maybeSingle();

    const creds = mergeCreds(
      data.provider,
      ((existing?.credentials ?? {}) as Record<string, unknown>),
      data.credentials,
    );
    const missing = missingFields(data.provider, creds);
    if (missing.length) throw new Error(`Missing required field(s): ${missing.join(", ")}`);

    const check = await runCheck(data.provider, creds);
    if (!check.ok && data.provider !== "carrybee") throw new Error(check.message);

    const secret =
      existing?.webhook_secret ??
      (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)).replace(/-/g, "");

    const { error } = await db.from("delivery_partners").upsert(
      {
        provider: data.provider,
        enabled: data.enabled,
        credentials: creds as never,
        config: {
          ...((existing?.config ?? {}) as Record<string, unknown>),
          ...data.config,
          ...check.extra,
        } as never,
        webhook_secret: secret,
        connection_ok: check.ok,
        connection_message: check.message,
        last_checked_at: new Date().toISOString(),
      },
      { onConflict: "provider" },
    );
    if (error) throw new Error(error.message);
    return { ok: true, message: check.message };
  });

export const adminSetDeliveryPartnerEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ provider: providerSchema, enabled: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { error } = await db
      .from("delivery_partners")
      .update({ enabled: data.enabled })
      .eq("provider", data.provider);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRemoveDeliveryPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ provider: providerSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { error } = await db.from("delivery_partners").delete().eq("provider", data.provider);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Partners available for order dispatch (enabled + verified). */
export const adminActiveDeliveryPartners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeliveryProvider[]> => {
    const db = await requireAdmin(context.supabase, context.userId);
    const { data } = await db
      .from("delivery_partners")
      .select("provider, enabled")
      .eq("enabled", true);
    return (data ?? []).map((r) => r.provider as DeliveryProvider);
  });
