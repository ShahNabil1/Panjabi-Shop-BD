import { AwsClient } from "aws4fetch";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

export function readR2Config(): R2Config | null {
  const accountId = process.env["R2_ACCOUNT_ID"];
  const accessKeyId = process.env["R2_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["R2_SECRET_ACCESS_KEY"];
  const bucket = process.env["R2_BUCKET"];
  const publicBaseUrl = process.env["R2_PUBLIC_BASE_URL"];
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

const FOLDERS = ["products", "categories", "promotions", "landing", "site", "hero", "invoices"] as const;
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
