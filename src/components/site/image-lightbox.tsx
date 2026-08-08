import { ChevronLeft, ChevronRight, X } from "lucide-react";
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

    const html = document.documentElement;
    const body = document.body;
    const originalHtmlOverflow = html.style.overflow;
    const originalBodyOverflow = body.style.overflow;
    const originalBodyPosition = body.style.position;
    const originalBodyTop = body.style.top;
    const originalBodyWidth = body.style.width;
    const scrollY = window.scrollY;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    const onTouchMove = (e: TouchEvent) => {
      if (e.target === containerRef.current) e.preventDefault();
    };
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("touchmove", onTouchMove);
      html.style.overflow = originalHtmlOverflow;
      body.style.overflow = originalBodyOverflow;
      body.style.position = originalBodyPosition;
      body.style.top = originalBodyTop;
      body.style.width = originalBodyWidth;
      window.scrollTo(0, scrollY);
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/70 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      {images.length > 1 ? (
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
          className="absolute left-2 top-1/2 z-10 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-card/90 text-foreground shadow-lg backdrop-blur transition-all hover:bg-primary hover:text-primary-foreground active:scale-95 disabled:opacity-30 sm:left-5"
        >
          <ChevronLeft className="size-5" />
        </button>
      ) : null}

      {images.length > 1 ? (
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
          className="absolute right-2 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/90 text-foreground shadow-lg backdrop-blur transition-all hover:bg-primary hover:text-primary-foreground active:scale-95 disabled:opacity-30 sm:right-5"
        >
          <ChevronRight className="size-5" />
        </button>
      ) : null}

      <div
        className="relative inline-flex max-h-[86vh] max-w-[92vw] flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {current ? (
          <div className="relative overflow-hidden rounded-xl bg-card shadow-2xl ring-1 ring-border/40">
            <img
              key={current.src}
              src={current.src}
              alt={current.alt || ""}
              onClick={toggleZoom}
              className={cn(
                "block max-h-[80vh] w-auto max-w-[92vw] cursor-pointer object-contain transition-transform duration-300",
                isZoomed ? "cursor-zoom-out" : "cursor-zoom-in",
              )}
              style={{ transform: `scale(${scale})` }}
            />

            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="absolute right-2 top-2 z-10 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-background/70 transition-all hover:bg-primary/90 active:scale-95"
            >
              <X className="size-5" strokeWidth={2.5} />
            </button>

            {current.alt ? (
              <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/70 to-transparent px-4 pb-3 pt-8 text-center text-sm font-semibold text-background">
                {current.alt}
              </p>
            ) : null}
          </div>
        ) : null}

        {images.length > 1 ? (
          <div className="mt-3 flex items-center gap-1.5 rounded-full bg-card/95 px-3.5 py-1.5 text-sm font-semibold shadow-lg backdrop-blur">
            <span className="font-en text-primary">{index + 1}</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-en text-muted-foreground">{images.length}</span>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
