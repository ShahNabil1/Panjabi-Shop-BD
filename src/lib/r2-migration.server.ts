/**
 * R2 bucket migration (server-only).
 *
 * When the R2 credentials are changed to a different bucket, the previously
 * effective configuration is snapshotted into `integration_credentials` under
 * `PREV_R2_*` keys. The admin can then run a migration that copies every
 * object into the new bucket and rewrites all stored media links.
 */

import type { R2Config } from "./r2.server";

export const PREV_PREFIX = "PREV_";

const FIELDS = [
  ["R2_ACCOUNT_ID", "accountId"],
  ["R2_ACCESS_KEY_ID", "accessKeyId"],
  ["R2_SECRET_ACCESS_KEY", "secretAccessKey"],
  ["R2_BUCKET", "bucket"],
  ["R2_PUBLIC_BASE_URL", "publicBaseUrl"],
] as const;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Same bucket in the same account = nothing to migrate. */
export function sameBucket(a: R2Config, b: R2Config) {
  return a.accountId === b.accountId && a.bucket === b.bucket;
}

export async function savePreviousR2(cfg: R2Config) {
  const db = await admin();
  const rows = FIELDS.map(([key, prop]) => ({
    key: `${PREV_PREFIX}${key}`,
    value: String(cfg[prop]),
  }));
  await db.from("integration_credentials").upsert(rows, { onConflict: "key" });
}

export async function clearPreviousR2() {
  const db = await admin();
  await db
    .from("integration_credentials")
    .delete()
    .in(
      "key",
      FIELDS.map(([key]) => `${PREV_PREFIX}${key}`),
    );
}

export async function readPreviousR2(): Promise<R2Config | null> {
  const db = await admin();
  const { data, error } = await db
    .from("integration_credentials")
    .select("key, value")
    .in(
      "key",
      FIELDS.map(([key]) => `${PREV_PREFIX}${key}`),
    );
  if (error || !data?.length) return null;
  const map = new Map(data.map((row) => [row.key, (row.value ?? "").trim()]));
  const out: Record<string, string> = {};
  for (const [key, prop] of FIELDS) {
    const value = map.get(`${PREV_PREFIX}${key}`);
    if (!value) return null;
    out[prop] = value;
  }
  return {
    accountId: out["accountId"]!,
    accessKeyId: out["accessKeyId"]!,
    secretAccessKey: out["secretAccessKey"]!,
    bucket: out["bucket"]!,
    publicBaseUrl: out["publicBaseUrl"]!.replace(/\/+$/, ""),
  };
}

export type R2MigrateBatchResult = {
  copied: number;
  skipped: number;
  failed: number;
  errors: string[];
  nextToken: string | null;
  lastKey: string | null;
};

/** Copies one page of objects from the old bucket to the new one. */
export async function migrateBatch(token: string | null): Promise<R2MigrateBatchResult> {
  const { readR2Config, listObjectsPage, objectExists, copyObjectAcross } = await import(
    "./r2.server"
  );
  const to = await readR2Config();
  if (!to) throw new Error("New R2 configuration is incomplete.");
  const from = await readPreviousR2();
  if (!from) throw new Error("No previous bucket recorded — nothing to migrate.");
  if (sameBucket(from, to)) throw new Error("Source and destination bucket are the same.");

  let page;
  try {
    page = await listObjectsPage(from, token, 100);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown error";
    throw new Error(
      `Could not read the old bucket "${from.bucket}" (${detail}). ` +
        "The saved old R2 credentials are invalid or lack ListBucket/read permission. " +
        "Fix the old bucket's API token, or press “Skip migration” to forget it.",
    );
  }
  let copied = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const key of page.keys) {
    try {
      if (await objectExists(to, key)) {
        skipped += 1;
        continue;
      }
      await copyObjectAcross(from, to, key);
      copied += 1;
    } catch (err) {
      failed += 1;
      if (errors.length < 5) {
        errors.push(`${key}: ${err instanceof Error ? err.message : "copy failed"}`);
      }
    }
  }

  return {
    copied,
    skipped,
    failed,
    errors,
    nextToken: page.nextToken,
    lastKey: page.keys.at(-1) ?? null,
  };
}

/** Rewrites every stored media link to the new public base URL. */
export async function finishMigration(): Promise<{ rewritten: number }> {
  const { readR2Config } = await import("./r2.server");
  const to = await readR2Config();
  const from = await readPreviousR2();
  if (!to || !from) throw new Error("Migration state is incomplete.");

  let rewritten = 0;
  if (from.publicBaseUrl !== to.publicBaseUrl) {
    const db = await admin();
    const { data, error } = await (
      db.rpc as unknown as (
        fn: string,
        args: Record<string, string>,
      ) => Promise<{ data: number | null; error: { message: string } | null }>
    )("r2_rewrite_media_urls", { old_base: from.publicBaseUrl, new_base: to.publicBaseUrl });
    if (error) throw new Error(error.message);
    rewritten = data ?? 0;
  }
  await clearPreviousR2();
  return { rewritten };
}
