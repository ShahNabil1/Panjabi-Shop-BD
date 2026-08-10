import { AwsClient } from "aws4fetch";

import { getIntegrationValues } from "./integration-secrets.server";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

/** Reads R2 settings from the admin panel, falling back to environment vars. */
export async function readR2Config(): Promise<R2Config | null> {
  const v = await getIntegrationValues();
  const accountId = v["R2_ACCOUNT_ID"];
  const accessKeyId = v["R2_ACCESS_KEY_ID"];
  const secretAccessKey = v["R2_SECRET_ACCESS_KEY"];
  const bucket = v["R2_BUCKET"];
  const publicBaseUrl = v["R2_PUBLIC_BASE_URL"];
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) return null;
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBaseUrl: publicBaseUrl.replace(/\/+$/, ""),
  };
}


function client(cfg: R2Config) {
  return new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

function objectUrl(cfg: R2Config, key: string) {
  return `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}/${key
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

export function publicUrlFor(cfg: R2Config, key: string) {
  return `${cfg.publicBaseUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

const FOLDERS = [
  "products",
  "sub-products",
  "categories",
  "promotions",
  "landing",
  "site",
  "popup",
  "hero",
  "invoices",
] as const;
export type MediaFolder = (typeof FOLDERS)[number];

export function isMediaFolder(value: string): value is MediaFolder {
  return (FOLDERS as readonly string[]).includes(value);
}

export function buildKey(folder: MediaFolder, fileName: string): string {
  const safe =
    fileName
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "file";
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${folder}/${stamp}-${rand}-${safe}`;
}

/** Presigned PUT URL the browser uploads the compressed blob to directly. */
export async function signUploadUrl(
  cfg: R2Config,
  key: string,
  contentType: string,
  expiresInSeconds = 600,
): Promise<string> {
  const url = new URL(objectUrl(cfg, key));
  url.searchParams.set("X-Amz-Expires", String(expiresInSeconds));
  const signed = await client(cfg).sign(
    new Request(url, { method: "PUT", headers: { "content-type": contentType } }),
    { aws: { signQuery: true, allHeaders: false } },
  );
  return signed.url;
}

export async function deleteObject(cfg: R2Config, key: string): Promise<void> {
  const res = await client(cfg).fetch(objectUrl(cfg, key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 delete failed (${res.status})`);
  }
}

/** Server-side upload, used for generated files such as invoice PDFs. */
export async function putObject(
  cfg: R2Config,
  key: string,
  body: ArrayBuffer | Uint8Array | string,
  contentType: string,
): Promise<string> {
  const res = await client(cfg).fetch(objectUrl(cfg, key), {
    method: "PUT",
    body: body as BodyInit,
    headers: { "content-type": contentType },
  });
  if (!res.ok) throw new Error(`R2 upload failed (${res.status})`);
  return publicUrlFor(cfg, key);
}

export type R2Probe = {
  ok: boolean;
  message: string;
  bucket: string;
  publicBaseUrl: string;
  objects: number | null;
  truncated: boolean;
  latestKey: string | null;
};

/** Live bucket check — lists a page of objects with the stored credentials. */
export async function probeR2(cfg: R2Config): Promise<R2Probe> {
  const base: Omit<R2Probe, "ok" | "message"> = {
    bucket: cfg.bucket,
    publicBaseUrl: cfg.publicBaseUrl,
    objects: null,
    truncated: false,
    latestKey: null,
  };
  try {
    const url = new URL(`https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}`);
    url.searchParams.set("list-type", "2");
    url.searchParams.set("max-keys", "1000");
    const res = await client(cfg).fetch(url.toString(), { method: "GET" });
    const text = await res.text();
    if (!res.ok) {
      const msg = /<Message>([^<]+)<\/Message>/.exec(text)?.[1];
      return { ...base, ok: false, message: msg ?? `Bucket request failed (${res.status})` };
    }
    const keys = [...text.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1] ?? "");
    const truncated = /<IsTruncated>true<\/IsTruncated>/.test(text);
    return {
      ...base,
      ok: true,
      message: "Bucket reachable",
      objects: keys.length,
      truncated,
      latestKey: keys.at(-1) ?? null,
    };
  } catch (err) {
    return { ...base, ok: false, message: err instanceof Error ? err.message : "Unknown error" };
  }
}
