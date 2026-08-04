import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Crop as CropIcon, Loader2, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";

import { cn } from "@/lib/utils";

export type CropPreset = {
  id: string;
  label: string;
  hint: string;
  ratio: number;
};

/** Aspect ratios the storefront actually renders. */
export const CROP_PRESETS: CropPreset[] = [
  { id: "card", label: "কার্ড / গ্রিড", hint: "হোম ও ক্যাটালগ কার্ড · 4:5", ratio: 4 / 5 },
  { id: "square", label: "স্কয়ার", hint: "প্রোডাক্ট গ্যালারি · 1:1", ratio: 1 },
  { id: "product", label: "প্রোডাক্ট পেইজ", hint: "ডিটেইল ভিউ · 3:4", ratio: 3 / 4 },
  { id: "landing", label: "ল্যান্ডিং / ব্যানার", hint: "হিরো ও ওয়াইড · 16:9", ratio: 16 / 9 },
  { id: "og", label: "OG / শেয়ার", hint: "সোশ্যাল প্রিভিউ · 1.91:1", ratio: 1.91 },
];

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

type Point = { x: number; y: number };

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("ছবিটি লোড করা যায়নি (CORS?)"));
    img.src = src;
  });
  return img;
}

function rotateSource(img: HTMLImageElement): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalHeight;
  canvas.height = img.naturalWidth;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(URL.createObjectURL(b!)), "image/webp", 0.95),
  );
}

/**
 * Advanced crop dialog — aspect presets that match the real storefront
 * surfaces, pinch/scroll zoom, drag to reposition and live device previews.
 */
export function ImageCropperDialog({
  src,
  fileName = "image.webp",
  initialPreset = "card",
  onCancel,
  onCropped,
}: {
  src: string;
  fileName?: string | undefined;
  initialPreset?: string | undefined;
  onCancel: () => void;
  onCropped: (file: File) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState(src);
  const [presetId, setPresetId] = useState(initialPreset);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [preview, setPreview] = useState<string | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  const preset = CROP_PRESETS.find((p) => p.id === presetId) ?? CROP_PRESETS[0]!;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let alive = true;
    loadImage(source)
      .then((img) => alive && setImage(img))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "লোড করা যায়নি"));
    return () => {
      alive = false;
    };
  }, [source]);

  // Measure the stage so the crop box can be laid out in real pixels.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setStage({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setStage({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [mounted]);

  const crop = useMemo(() => {
    if (!stage.w || !stage.h) return { w: 0, h: 0 };
    const maxW = stage.w - 48;
    const maxH = stage.h - 48;
    let w = maxW;
    let h = w / preset.ratio;
    if (h > maxH) {
      h = maxH;
      w = h * preset.ratio;
    }
    return { w, h };
  }, [stage, preset.ratio]);

  const baseScale = useMemo(() => {
    if (!image || !crop.w) return 1;
    return Math.max(crop.w / image.naturalWidth, crop.h / image.naturalHeight);
  }, [image, crop]);

  const scale = baseScale * zoom;

  const clampOffset = useCallback(
    (next: Point, s = scale) => {
      if (!image) return next;
      const maxX = Math.max(0, (image.naturalWidth * s - crop.w) / 2);
      const maxY = Math.max(0, (image.naturalHeight * s - crop.h) / 2);
      return { x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) };
    },
    [image, crop, scale],
  );

  useEffect(() => {
    setOffset((o) => clampOffset(o));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, presetId, crop.w, crop.h, image]);

  // Reset framing when the aspect changes.
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [presetId]);

  const renderCrop = useCallback(
    async (maxEdge = 2000): Promise<Blob | null> => {
      if (!image || !crop.w) return null;
      const sw = crop.w / scale;
      const sh = crop.h / scale;
      const sx = (image.naturalWidth * scale) / 2 - crop.w / 2 - offset.x;
      const sy = (image.naturalHeight * scale) / 2 - crop.h / 2 - offset.y;
      const ratio = Math.min(1, maxEdge / Math.max(sw, sh));
      const outW = Math.max(1, Math.round(sw * ratio));
      const outH = Math.max(1, Math.round(sh * ratio));
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, sx / scale, sy / scale, sw, sh, 0, 0, outW, outH);
      return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.92));
    },
    [image, crop, scale, offset],
  );

  // Live preview thumbnail for the device mockups.
  useEffect(() => {
    let url: string | null = null;
    let alive = true;
    const t = setTimeout(() => {
      void renderCrop(600).then((blob) => {
        if (!blob || !alive) return;
        url = URL.createObjectURL(blob);
        setPreview(url);
      });
    }, 140);
    return () => {
      alive = false;
      clearTimeout(t);
      if (url) URL.revokeObjectURL(url);
    };
  }, [renderCrop]);

  const confirm = async () => {
    setBusy(true);
    try {
      const blob = await renderCrop(2000);
      if (!blob) throw new Error("ক্রপ করা যায়নি");
      const base = fileName.replace(/\.[^.]+$/, "") || "image";
      onCropped(new File([blob], `${base}-${preset.id}.webp`, { type: "image/webp" }));
    } catch {
      setBusy(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <CropIcon className="size-4 text-primary" />
            <div>
              <p className="text-sm font-bold leading-tight">ছবি ক্রপ করুন</p>
              <p className="text-[11px] text-muted-foreground">{preset.hint}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-border/70 px-4 py-2.5">
          {CROP_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPresetId(p.id)}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all duration-200",
                p.id === presetId
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/80 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-[1fr_200px]">
          <div className="space-y-3">
            <div
              ref={stageRef}
              onPointerDown={(e) => {
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                dragRef.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
              }}
              onPointerMove={(e) => {
                const d = dragRef.current;
                if (!d) return;
                setOffset(
                  clampOffset({ x: d.ox + (e.clientX - d.px), y: d.oy + (e.clientY - d.py) }),
                );
              }}
              onPointerUp={() => (dragRef.current = null)}
              onPointerLeave={() => (dragRef.current = null)}
              onWheel={(e) => {
                setZoom((z) => clamp(z - e.deltaY * 0.0015, MIN_ZOOM, MAX_ZOOM));
              }}
              className="relative h-[320px] w-full cursor-grab touch-none select-none overflow-hidden rounded-xl bg-muted/50 active:cursor-grabbing sm:h-[380px]"
            >
              {image && crop.w ? (
                <>
                  <img
                    src={source}
                    alt=""
                    draggable={false}
                    className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                    style={{
                      width: image.naturalWidth * scale,
                      height: image.naturalHeight * scale,
                      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0">
                    <div
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm shadow-[0_0_0_9999px_hsl(var(--background)/0.72)]"
                      style={{ width: crop.w, height: crop.h }}
                    >
                      <div className="absolute inset-0 border-2 border-primary/90" />
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                        {Array.from({ length: 9 }).map((_, i) => (
                          <div key={i} className="border border-primary-foreground/20" />
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                  {error ?? "লোড হচ্ছে…"}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <ZoomOut className="size-4 shrink-0 text-muted-foreground" />
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
              />
              <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
              <button
                type="button"
                title="৯০° ঘোরান"
                onClick={async () => {
                  if (!image) return;
                  const url = await rotateSource(image);
                  setImage(null);
                  setSource(url);
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                }}
                className="shrink-0 rounded-lg border border-border/80 bg-card p-1.5 transition-colors hover:border-primary/40 hover:bg-muted"
              >
                <RotateCw className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              লাইভ প্রিভিউ
            </p>
            <PreviewTile label="ডেস্কটপ কার্ড" src={preview} className="aspect-[4/5] w-full" />
            <PreviewTile label="মোবাইল কার্ড" src={preview} className="aspect-square w-24" />
            <PreviewTile label="প্রোডাক্ট পেইজ" src={preview} className="aspect-[3/4] w-28" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border/70 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border/80 bg-card px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted"
          >
            বাতিল
          </button>
          <button
            type="button"
            disabled={!image || busy}
            onClick={confirm}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            ক্রপ করে আপলোড
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PreviewTile({
  label,
  src,
  className,
}: {
  label: string;
  src: string | null;
  className?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <div className={cn("overflow-hidden rounded-lg border border-border/70 bg-muted", className)}>
        {src ? <img src={src} alt="" className="size-full object-cover" /> : null}
      </div>
    </div>
  );
}
