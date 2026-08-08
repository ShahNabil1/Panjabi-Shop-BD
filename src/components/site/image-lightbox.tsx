import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

export type LightboxImage = {
  src: string;
  alt?: string;
};

export function useLightbox() {
  const [isOpen, setIsOpen] = useState(false);
  const [images, setImages] = useState<LightboxImage[]>([]);
  const [startIndex, setStartIndex] = useState(0);

  const open = (imgs: LightboxImage[], index = 0) => {
    setImages(imgs);
    setStartIndex(index);
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  return useMemo(
    () => ({ isOpen, images, startIndex, open, close }),
    [isOpen, images, startIndex],
  );
}

export function ImageLightbox({
  images,
  startIndex = 0,
  isOpen,
  onClose,
}: {
  images: LightboxImage[];
  startIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [scale, setScale] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) setIndex(startIndex);
  }, [isOpen, startIndex]);

  useEffect(() => {
    if (!isOpen) {
      setScale(1);
      setIsZoomed(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, images.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, images.length, onClose]);

  if (!isOpen || images.length === 0) return null;

  const current = images[index];

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) onClose();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0]?.screenX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    const end = e.changedTouches[0]?.screenX;
    touchStartX.current = null;
    if (start == null || end == null || images.length <= 1) return;
    const diff = end - start;
    if (Math.abs(diff) > 50) {
      if (diff < 0) setIndex((i) => Math.min(i + 1, images.length - 1));
      else setIndex((i) => Math.max(i - 1, 0));
      setScale(1);
      setIsZoomed(false);
    }
  };

  const toggleZoom = () => {
    setIsZoomed((z) => {
      const next = !z;
      setScale(next ? 2 : 1);
      return next;
    });
  };

  const canPrev = index > 0;
  const canNext = index < images.length - 1;

  return createPortal(
    <div
      ref={containerRef}
      onClick={handleBackdropClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="absolute right-3 top-3 z-10 flex size-10 items-center justify-center rounded-full bg-card text-foreground shadow-md transition-colors hover:bg-muted"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>

      {images.length > 1 ? (
        <div className="absolute left-3 top-1/2 z-10 -translate-y-1/2">
          <button
            type="button"
            disabled={!canPrev}
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => Math.max(i - 1, 0));
              setScale(1);
              setIsZoomed(false);
            }}
            aria-label="Previous image"
            className="flex size-10 items-center justify-center rounded-full bg-card text-foreground shadow-md transition-colors hover:bg-muted disabled:opacity-40"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        </div>
      ) : null}

      {images.length > 1 ? (
        <div className="absolute right-3 top-1/2 z-10 -translate-y-1/2">
          <button
            type="button"
            disabled={!canNext}
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => Math.min(i + 1, images.length - 1));
              setScale(1);
              setIsZoomed(false);
            }}
            aria-label="Next image"
            className="flex size-10 items-center justify-center rounded-full bg-card text-foreground shadow-md transition-colors hover:bg-muted disabled:opacity-40"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      ) : null}

      <div
        className="relative max-h-[85vh] w-full max-w-5xl px-12"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          key={current.src}
          src={current.src}
          alt={current.alt || ""}
          onClick={toggleZoom}
          className={cn(
            "mx-auto max-h-[85vh] w-auto max-w-full rounded-lg object-contain shadow-2xl transition-transform duration-300",
            isZoomed ? "cursor-zoom-out" : "cursor-zoom-in",
          )}
          style={{ transform: `scale(${scale})` }}
        />
      </div>

      {images.length > 1 ? (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-card px-3 py-1.5 text-sm font-medium shadow-md">
          <span>{index + 1}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{images.length}</span>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
