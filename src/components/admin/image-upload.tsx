import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Crop as CropIcon, ImagePlus, Loader2, Upload, X } from "lucide-react";

import { compressImage, formatBytes } from "@/lib/image-compress";
import { createUploadTicket } from "@/lib/media.functions";
import { ImageCropperDialog } from "@/components/admin/image-cropper";
import { cn } from "@/lib/utils";

type Folder = "products" | "categories" | "promotions" | "landing" | "site" | "hero";

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
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  toast.success(
    `Uploaded — ${formatBytes(compressed.originalSize)} → ${formatBytes(compressed.size)}`,
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
            toast.error(err instanceof Error ? err.message : "Upload failed");
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

/**
 * Sequential crop queue — every picked file passes through the crop dialog
 * before it is compressed and uploaded.
 */
function useCropQueue(onReady: (files: File[]) => void | Promise<void>, preset?: string) {
  const [queue, setQueue] = useState<File[]>([]);
  const [src, setSrc] = useState<string | null>(null);
  const doneRef = useRef<File[]>([]);

  const current = queue[0] ?? null;

  useEffect(() => {
    if (!current) {
      setSrc(null);
      return;
    }
    const url = URL.createObjectURL(current);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [current]);

  const start = (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    doneRef.current = [];
    setQueue(images);
  };

  const advance = (file?: File) => {
    if (file) doneRef.current.push(file);
    setQueue((q) => {
      const rest = q.slice(1);
      if (rest.length === 0) {
        const out = doneRef.current;
        doneRef.current = [];
        if (out.length) void onReady(out);
      }
      return rest;
    });
  };

  const dialog =
    current && src ? (
      <ImageCropperDialog
        src={src}
        fileName={current.name}
        initialPreset={preset}
        onCancel={() => {
          doneRef.current = [];
          setQueue([]);
        }}
        onCropped={(file) => advance(file)}
      />
    ) : null;

  return { start, dialog, remaining: queue.length };
}

export function ImageUploadButton({
  folder,
  multiple = false,
  label = "Upload",
  className,
  crop = false,
  cropPreset,
  onUploaded,
}: {
  folder: Folder;
  multiple?: boolean;
  label?: string;
  className?: string | undefined;
  /** Route files through the advanced crop dialog first. */
  crop?: boolean;
  cropPreset?: string | undefined;
  onUploaded: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { busy, upload } = useImageUpload(folder);

  const run = async (files: File[]) => {
    const urls = await upload(files);
    if (urls.length) onUploaded(urls);
  };
  const cropper = useCropQueue(run, cropPreset);

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted disabled:opacity-60",
          className,
        )}
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
        {busy ? "Uploading…" : label}
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
          if (crop) cropper.start(files);
          else await run(files);
        }}
      />
      {cropper.dialog}
    </>
  );
}

/** Re-crop an already uploaded image and replace it with the cropped version. */
export function CropExistingButton({
  folder,
  url,
  cropPreset,
  onCropped,
  className,
}: {
  folder: Folder;
  url: string;
  cropPreset?: string | undefined;
  onCropped: (newUrl: string) => void;
  className?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const { busy, upload } = useImageUpload(folder);

  return (
    <>
      <button
        type="button"
        disabled={!url || busy}
        onClick={() => setOpen(true)}
        title="ক্রপ করুন"
        className={cn(
          "inline-flex items-center gap-1 rounded-lg border border-border/80 bg-card px-2 py-1 text-[11px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted disabled:opacity-60",
          className,
        )}
      >
        {busy ? <Loader2 className="size-3 animate-spin" /> : <CropIcon className="size-3" />}
        Crop
      </button>
      {open ? (
        <ImageCropperDialog
          src={url}
          initialPreset={cropPreset}
          onCancel={() => setOpen(false)}
          onCropped={async (file) => {
            setOpen(false);
            const urls = await upload([file]);
            if (urls[0]) onCropped(urls[0]);
          }}
        />
      ) : null}
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
  crop = true,
  cropPreset,
}: {
  label: string;
  folder: Folder;
  value: string | null;
  onChange: (url: string | null) => void;
  hint?: string;
  crop?: boolean;
  cropPreset?: string | undefined;
}) {
  const { busy, upload } = useImageUpload(folder);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const run = async (files: File[]) => {
    const urls = await upload(files.slice(0, 1));
    if (urls[0]) onChange(urls[0]);
  };
  const cropper = useCropQueue(run, cropPreset);

  const handleFiles = async (files: File[]) => {
    if (crop) cropper.start(files.slice(0, 1));
    else await run(files);
  };

  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
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
          "flex items-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/30 p-2.5 transition-all duration-200",
          dragging && "border-primary bg-primary/5 ig-ring",
        )}
      >
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-card">
          {value ? (
            <img src={value} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <input
            value={value ?? ""}
            placeholder="https://… or drop a file here"
            onChange={(e) => onChange(e.target.value || null)}
            className="w-full rounded-lg border border-border/80 bg-card px-2.5 py-1.5 text-xs outline-none transition-colors focus:border-primary/60"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 py-1 text-[11px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Upload className="size-3" />
              )}
              {busy ? "Uploading…" : "Upload image"}
            </button>
            {value ? (
              <CropExistingButton
                folder={folder}
                url={value}
                cropPreset={cropPreset}
                onCropped={(u) => onChange(u)}
              />
            ) : null}
            {value ? (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="size-3" />
                Remove
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
      {cropper.dialog}
    </label>
  );
}
