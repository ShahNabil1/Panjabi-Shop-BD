import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "./admin.server";
import {
  API_SECRET_MASK,
  INTEGRATION_GROUPS,
  groupKeys,
  requiredGroupKeys,
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
  /** Last stored connection test for this group (null when never tested). */
  lastTest: IntegrationTestResult | null;
};

/** Row key used to persist the last connection test of a group. */
const testKey = (group: IntegrationGroup) => `INTEGRATION_TEST_${group.toUpperCase()}`;

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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tests = new Map<string, IntegrationTestResult>();
    const { data: testRows } = await supabaseAdmin
      .from("integration_credentials")
      .select("key, value")
      .in("key", INTEGRATION_GROUPS.map(testKey));
    for (const row of testRows ?? []) {
      try {
        tests.set(row.key as string, JSON.parse(row.value as string) as IntegrationTestResult);
      } catch {
        /* ignore malformed rows */
      }
    }

    return INTEGRATION_GROUPS.map((group) => {
      const out: Record<string, string> = {};
      const src: Record<string, "database" | "environment" | "missing"> = {};
      for (const field of integrationMeta[group].fields) {
        const value = values[field.key] ?? "";
        src[field.key] = sources[field.key as keyof typeof sources] ?? "missing";
        if (!value) continue;
        out[field.key] = field.secret ? API_SECRET_MASK : value;
      }
      const keys = requiredGroupKeys(group);
      return {
        group,
        values: out,
        sources: src,
        configured: keys.every((k) => Boolean(values[k])),
        envOnly: keys.every((k) => src[k] === "environment"),
        lastTest: tests.get(testKey(group)) ?? null,
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
    // Credentials changed → the previous connection test no longer proves anything.
    await supabaseAdmin.from("integration_credentials").delete().eq("key", testKey(data.group));
    clearIntegrationCache();

    // Switched to a different bucket → remember the old one so media can be migrated.
    let migrationPending = false;
    if (data.group === "r2" && beforeR2) {
      const afterR2 = await readR2Config();
      if (afterR2) {
        const { sameBucket, savePreviousR2, readPreviousR2 } = await import(
          "./r2-migration.server"
        );
        if (!sameBucket(beforeR2, afterR2)) {
          const existing = await readPreviousR2();
          // Keep the original source if a migration was already pending.
          if (!existing || sameBucket(existing, afterR2)) await savePreviousR2(beforeR2);
          migrationPending = true;
        } else {
          migrationPending = (await readPreviousR2()) !== null;
        }
      }
    }
    return { ok: true, migrationPending };
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
      .in("key", [...groupKeys(data.group), testKey(data.group)]);
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

    const result: IntegrationTestResult = await (async (): Promise<IntegrationTestResult> => {
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
    })();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("integration_credentials")
      .upsert([{ key: testKey(data.group), value: JSON.stringify(result) }], {
        onConflict: "key",
      });
    return result;
  });

export type R2MigrationState = {
  pending: boolean;
  from: { bucket: string; publicBaseUrl: string } | null;
  to: { bucket: string; publicBaseUrl: string } | null;
};

/** Admin-only: is there an old bucket waiting to be migrated? */
export const adminR2MigrationState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<R2MigrationState> => {
    await requireAdmin(context.supabase, context.userId);
    const { readPreviousR2 } = await import("./r2-migration.server");
    const { readR2Config } = await import("./r2.server");
    const [prev, cur] = await Promise.all([readPreviousR2(), readR2Config()]);
    return {
      pending: Boolean(prev && cur),
      from: prev ? { bucket: prev.bucket, publicBaseUrl: prev.publicBaseUrl } : null,
      to: cur ? { bucket: cur.bucket, publicBaseUrl: cur.publicBaseUrl } : null,
    };
  });

/** Admin-only: copies one batch of referenced media into the new bucket. */
export const adminR2MigrateBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ offset: z.number().int().min(0).default(0) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { migrateBatch } = await import("./r2-migration.server");
    return migrateBatch(data.offset);
  });

/** Admin-only: rewrites every stored media link and closes the migration. */
export const adminR2FinishMigration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { finishMigration } = await import("./r2-migration.server");
    return finishMigration();
  });

/** Admin-only: forgets the old bucket without migrating anything. */
export const adminR2DiscardMigration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { clearPreviousR2 } = await import("./r2-migration.server");
    await clearPreviousR2();
    return { ok: true };
  });
