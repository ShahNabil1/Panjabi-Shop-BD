/**
 * Browser-side image compression.
 * Downscales to a max edge and re-encodes to WebP before upload so R2 only
 * ever stores web-sized assets.
 */

export type CompressOptions = {
  maxEdge?: number;
  quality?: number;
  mimeType?: "image/webp" | "image/jpeg";
};

export type CompressedImage = {
  blob: Blob;
  fileName: string;
  contentType: string;
  width: number;
  height: number;
  originalSize: number;
  size: number;
};

const DEFAULTS: Required<CompressOptions> = {
  maxEdge: 2000,
  quality: 0.82,
  mimeType: "image/webp",
};

function baseName(name: string): string {
  const withoutExt = name.replace(/\.[^.]+$/, "");
  return (
    withoutExt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "image"
  );
}

async function loadBitmap(file: File): Promise<{ width: number; height: number; draw: CanvasImageSource; cleanup: () => void }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: bitmap,
      cleanup: () => bitmap.close(),
    };
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("ছবিটি পড়া যায়নি"));
    img.src = url;
  });
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    draw: img,
    cleanup: () => URL.revokeObjectURL(url),
  };
}

export async function compressImage(file: File, options: CompressOptions = {}): Promise<CompressedImage> {
  const opts = { ...DEFAULTS, ...options };

  // SVG and GIF do not survive canvas re-encoding well — pass them through.
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return {
      blob: file,
      fileName: `${baseName(file.name)}${file.type === "image/gif" ? ".gif" : ".svg"}`,
      contentType: file.type,
      width: 0,
      height: 0,
      originalSize: file.size,
      size: file.size,
    };
  }

  const source = await loadBitmap(file);
  try {
    const scale = Math.min(1, opts.maxEdge / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("ক্যানভাস তৈরি করা যায়নি");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source.draw, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, opts.mimeType, opts.quality),
    );
    if (!blob) throw new Error("ছবি কমপ্রেস করা যায়নি");

    const ext = blob.type === "image/jpeg" ? ".jpg" : ".webp";
    return {
      blob,
      fileName: `${baseName(file.name)}${ext}`,
      contentType: blob.type,
      width,
      height,
      originalSize: file.size,
      size: blob.size,
    };
  } finally {
    source.cleanup();
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
