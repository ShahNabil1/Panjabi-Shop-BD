import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Upload } from "lucide-react";

import { compressImage, formatBytes } from "@/lib/image-compress";
import { createUploadTicket } from "@/lib/media.functions";
import { cn } from "@/lib/utils";

type Folder = "products" | "categories" | "promotions" | "landing" | "site";

async function uploadOne(file: File, folder: Folder): Promise<string> {
  const compressed = await compressImage(file);
  const ticket = await createUploadTicket({
    data: {
      folder,
      fileName: compressed.fileName,
      contentType: compressed.contentType as "image/webp",
      size: compressed.size,
    },
  });
  const res = await fetch(ticket.uploadUrl, {
    method: "PUT",
    headers: { "content-type": compressed.contentType },
    body: compressed.blob,
  });
  if (!res.ok) throw new Error(`আপলোড ব্যর্থ (${res.status})`);
  toast.success(
    `আপলোড হয়েছে — ${formatBytes(compressed.originalSize)} → ${formatBytes(compressed.size)}`,
  );
  return ticket.publicUrl;
}

export function useImageUpload(folder: Folder) {
  const [busy, setBusy] = useState(false);

  const upload = useCallback(
    async (files: File[]): Promise<string[]> => {
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (images.length === 0) return [];
      setBusy(true);
      const urls: string[] = [];
      try {
        for (const file of images) {
          try {
            urls.push(await uploadOne(file, folder));
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "আপলোড ব্যর্থ");
          }
        }
      } finally {
        setBusy(false);
      }
      return urls;
    },
    [folder],
  );

  return { busy, upload };
}

export function ImageUploadButton({
  folder,
  multiple = false,
  label = "আপলোড",
  className,
  onUploaded,
}: {
  folder: Folder;
  multiple?: boolean;
  label?: string;
  className?: string;
  onUploaded: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { busy, upload } = useImageUpload(folder);

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted disabled:opacity-60",
          className,
        )}
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
        {busy ? "আপলোড হচ্ছে…" : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          const urls = await upload(files);
          if (urls.length) onUploaded(urls);
        }}
      />
    </>
  );
}

/** Single-image field: drop zone + preview + manual URL entry. */
export function ImageField({
  label,
  folder,
  value,
  onChange,
  hint,
}: {
  label: string;
  folder: Folder;
  value: string | null;
  onChange: (url: string | null) => void;
  hint?: string;
}) {
  const { busy, upload } = useImageUpload(folder);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: File[]) => {
    const urls = await upload(files.slice(0, 1));
    if (urls[0]) onChange(urls[0]);
  };

  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-2.5 transition-colors",
          dragging && "border-primary bg-primary/5",
        )}
      >
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card">
          {value ? (
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <input
            value={value ?? ""}
            placeholder="https://… অথবা ফাইল ড্রপ করুন"
            onChange={(e) => onChange(e.target.value || null)}
            className="w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-xs outline-none focus:border-primary"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-semibold hover:bg-muted disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Upload className="size-3" />
              )}
              {busy ? "আপলোড হচ্ছে…" : "ছবি আপলোড"}
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-[11px] text-muted-foreground underline-offset-2 hover:underline"
              >
                সরান
              </button>
            ) : null}
          </div>
        </div>
      </div>
      {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          await handleFiles(files);
        }}
      />
    </label>
  );
}
