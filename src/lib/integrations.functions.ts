import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "./admin.server";
import {
  API_SECRET_MASK,
  INTEGRATION_GROUPS,
  groupKeys,
  integrationMeta,
  type IntegrationGroup,
} from "./integrations-shared";

const groupSchema = z.enum(INTEGRATION_GROUPS);

export type IntegrationGroupState = {
  group: IntegrationGroup;
  /** Secret values come back masked; plain fields as stored. */
  values: Record<string, string>;
  sources: Record<string, "database" | "environment" | "missing">;
  configured: boolean;
  /** True when every value is still coming from environment variables. */
  envOnly: boolean;
};

/** Admin-only: current state of every managed integration credential. */
export const adminListIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<IntegrationGroupState[]> => {
    await requireAdmin(context.supabase, context.userId);
    const { getIntegrationValues, getIntegrationSources } = await import(
      "./integration-secrets.server"
    );
    const values = await getIntegrationValues();
    const sources = await getIntegrationSources();

    return INTEGRATION_GROUPS.map((group) => {
      const out: Record<string, string> = {};
      const src: Record<string, "database" | "environment" | "missing"> = {};
      for (const field of integrationMeta[group].fields) {
        const value = values[field.key] ?? "";
        src[field.key] = sources[field.key as keyof typeof sources] ?? "missing";
        if (!value) continue;
        out[field.key] = field.secret ? API_SECRET_MASK : value;
      }
      const keys = groupKeys(group);
      return {
        group,
        values: out,
        sources: src,
        configured: keys.every((k) => Boolean(values[k])),
        envOnly: keys.every((k) => src[k] === "environment"),
      };
    });
  });

const saveSchema = z.object({
  group: groupSchema,
  values: z.record(z.string(), z.string().max(2000)),
});

/** Admin-only: stores the group's credentials in the database. */
export const adminSaveIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { getIntegrationValues, clearIntegrationCache } = await import(
      "./integration-secrets.server"
    );
    const { readR2Config } = await import("./r2.server");
    const beforeR2 = data.group === "r2" ? await readR2Config() : null;

    const current = await getIntegrationValues();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const rows: { key: string; value: string }[] = [];
    const removals: string[] = [];
    for (const field of integrationMeta[data.group].fields) {
      const incoming = data.values[field.key];
      if (incoming === undefined) continue;
      const next = incoming.trim();
      if (next === API_SECRET_MASK) {
        // Untouched secret — keep whatever is already effective.
        const existing = current[field.key];
        if (existing) rows.push({ key: field.key, value: existing });
        continue;
      }
      if (!next) {
        removals.push(field.key);
        continue;
      }
      rows.push({ key: field.key, value: next });
    }

    if (rows.length) {
      const { error } = await supabaseAdmin
        .from("integration_credentials")
        .upsert(rows, { onConflict: "key" });
      if (error) throw new Error(error.message);
    }
    if (removals.length) {
      await supabaseAdmin.from("integration_credentials").delete().in("key", removals);
    }
    clearIntegrationCache();
    return { ok: true };
  });

/** Admin-only: wipes the group's stored credentials completely. */
export const adminRemoveIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ group: groupSchema }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { clearIntegrationCache } = await import("./integration-secrets.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("integration_credentials")
      .delete()
      .in("key", groupKeys(data.group));
    if (error) throw new Error(error.message);
    clearIntegrationCache();
    return { ok: true };
  });

export type IntegrationTestResult = {
  group: IntegrationGroup;
  ok: boolean;
  message: string;
  /** Provider-specific readouts rendered as label/value rows. */
  details: { label: string; value: string }[];
  checkedAt: string;
};

/** Admin-only: performs a real, live call against the provider. */
export const adminTestIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ group: groupSchema }).parse(input))
  .handler(async ({ data, context }): Promise<IntegrationTestResult> => {
    await requireAdmin(context.supabase, context.userId);
    const { clearIntegrationCache } = await import("./integration-secrets.server");
    clearIntegrationCache();
    const checkedAt = new Date().toISOString();
    const fail = (message: string): IntegrationTestResult => ({
      group: data.group,
      ok: false,
      message,
      details: [],
      checkedAt,
    });

    try {
      if (data.group === "r2") {
        const { readR2Config, probeR2 } = await import("./r2.server");
        const cfg = await readR2Config();
        if (!cfg) return fail("R2 credentials are incomplete");
        const probe = await probeR2(cfg);
        return {
          group: "r2",
          ok: probe.ok,
          message: probe.message,
          checkedAt,
          details: probe.ok
            ? [
                { label: "Bucket", value: probe.bucket },
                { label: "Public base URL", value: probe.publicBaseUrl },
                {
                  label: "Objects",
                  value:
                    probe.objects === null
                      ? "—"
                      : `${probe.objects}${probe.truncated ? "+" : ""}`,
                },
                { label: "Latest object", value: probe.latestKey ?? "—" },
              ]
            : [],
        };
      }

      if (data.group === "bulksmsbd") {
        const { getSmsBalance } = await import("./sms.server");
        const res = await getSmsBalance();
        return {
          group: "bulksmsbd",
          ok: res.ok,
          message: res.ok ? "Gateway reachable" : res.message,
          checkedAt,
          details: res.ok
            ? [
                { label: "Balance", value: `৳ ${(res.balance ?? 0).toLocaleString("en-US")}` },
                {
                  label: "Sender ID",
                  value:
                    (await import("./integration-secrets.server")
                      .then((m) => m.getIntegrationValues())
                      .then((v) => v["BULKSMSBD_SENDER_ID"])) ?? "—",
                },
              ]
            : [],
        };
      }

      const { checkConnection, myPlan } = await import("./courier.server");
      const conn = (await checkConnection()) as Record<string, unknown>;
      const connData = (conn["data"] ?? {}) as Record<string, unknown>;
      const connected = Boolean(connData["connected"] && connData["authenticated"]);
      if (!connected) return fail("BD Courier authentication failed");

      const plan = (await myPlan()) as Record<string, unknown>;
      const d = (plan["data"] ?? {}) as Record<string, unknown>;
      const num = (v: unknown) => {
        const x = Number(v ?? 0);
        return Number.isFinite(x) ? x : 0;
      };
      const text = (v: unknown) => (typeof v === "string" && v ? v : "—");
      return {
        group: "bdcourier",
        ok: true,
        message: "Connected",
        checkedAt,
        details: [
          { label: "Plan", value: `${text(d["plan_name"])} (${text(d["plan_type"])})` },
          { label: "Status", value: text(d["status"]) },
          {
            label: "Expires",
            value:
              typeof d["expires_at"] === "string"
                ? `${d["expires_at"]} · ${num(d["days_remaining"])} days left`
                : "—",
          },
          {
            label: "Free searches",
            value: `${num(d["remaining_free_calls"])} left of ${num(d["call_limit"])}`,
          },
          {
            label: "Paid searches",
            value: `${num(d["remaining_paid_calls"])} left of ${num(d["paid_limit"])}`,
          },
        ],
      };
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Unknown error");
    }
  });
