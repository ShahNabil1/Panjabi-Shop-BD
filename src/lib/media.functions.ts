import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/admin.server";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const uploadInput = z.object({
  folder: z.enum([
    "products",
    "sub-products",
    "categories",
    "promotions",
    "landing",
    "site",
    "popup",
    "hero",
  ]),
  fileName: z.string().min(1).max(120),
  contentType: z.enum(["image/webp", "image/jpeg", "image/png", "image/svg+xml", "image/gif"]),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export type MediaUploadTicket = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
};

/** Admin-only: returns a short-lived presigned PUT URL for a direct browser upload. */
export const createUploadTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => uploadInput.parse(data))
  .handler(async ({ data, context }): Promise<MediaUploadTicket> => {
    await requireAdmin(context.supabase, context.userId);
    const { readR2Config, buildKey, signUploadUrl, publicUrlFor } = await import("@/lib/r2.server");
    const cfg = readR2Config();
    if (!cfg) throw new Error("R2 কনফিগার করা নেই। সেটিংসে R2 সিক্রেটগুলো যোগ করুন।");

    const key = buildKey(data.folder, data.fileName);
    return {
      uploadUrl: await signUploadUrl(cfg, key, data.contentType),
      publicUrl: publicUrlFor(cfg, key),
      key,
    };
  });

/** Admin-only: removes an object from the bucket. */
export const deleteUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ key: z.string().min(1) }).parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { readR2Config, deleteObject } = await import("@/lib/r2.server");
    const cfg = readR2Config();
    if (!cfg) throw new Error("R2 কনফিগার করা নেই।");
    await deleteObject(cfg, data.key);
    return { ok: true };
  });

/** Admin-only: tells the UI whether media uploads are available yet. */
export const getMediaStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { readR2Config } = await import("@/lib/r2.server");
    return { configured: readR2Config() !== null };
  });
