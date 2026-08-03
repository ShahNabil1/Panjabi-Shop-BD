import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface BrandLoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  fullScreen?: boolean;
  showProgress?: boolean;
}

const sizeMap = {
  sm: "size-10",
  md: "size-14",
  lg: "size-20",
  xl: "size-28",
};

export function BrandLoader({
  message = "Loading",
  size = "md",
  className,
  fullScreen,
  showProgress = true,
}: BrandLoaderProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!showProgress) return;
    let raf = 0;
    const duration = 2200;

    const loop = () => {
      const start = Date.now();
      const tick = () => {
        const elapsed = Date.now() - start;
        const pct = Math.min(100, Math.round((elapsed / duration) * 100));
        setProgress(pct);
        if (pct < 100) {
          raf = requestAnimationFrame(tick);
        } else {
          setTimeout(() => {
            setProgress(0);
            raf = requestAnimationFrame(loop);
          }, 260);
        }
      };
      raf = requestAnimationFrame(tick);
    };

    loop();
    return () => cancelAnimationFrame(raf);
  }, [showProgress]);

  const wrapper = (
    <div className={cn("flex flex-col items-center justify-center gap-5", className)}>
      <div className="relative">
        <div className="absolute -inset-4 animate-ping rounded-full bg-primary/10" />
        <div className="absolute -inset-2 animate-pulse rounded-full bg-primary/5" />
        <img
          src="/favicon.png"
          alt="Upoharkabbo"
          className={cn(
            "relative z-10 rounded-full bg-white object-contain p-1.5 shadow-lg ring-1 ring-border",
            sizeMap[size],
          )}
        />
      </div>
      <div className="flex w-full min-w-0 flex-col items-center gap-4">
        <p className="text-sm font-medium tracking-wide text-muted-foreground">{message}</p>
        {showProgress && (
          <div className="flex w-full flex-col items-center gap-2">
            <div className="w-48 overflow-hidden rounded-full border border-border bg-muted p-1 shadow-inner sm:w-56">
              <div
                className="loader-progress relative h-2.5 rounded-full bg-gradient-to-r from-primary via-accent to-primary shadow-[0_0_18px_rgba(238,42,123,0.55)]"
                style={{ width: `${progress}%` }}
              >
                <span className="absolute inset-y-0 right-0 w-1 bg-white/40" />
              </div>
            </div>
            <span className="text-xs font-semibold tabular-nums text-muted-foreground">{progress}%</span>
          </div>
        )}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="admin-scope fixed inset-0 z-50 flex h-screen w-screen flex-col items-center justify-center bg-background">
        {wrapper}
      </div>
    );
  }

  return wrapper;
}

export function BrandSkeleton({ className, rows = 4 }: { className?: string; rows?: number }) {
  return (
    <div className={cn("space-y-3 p-4", className)}>
      <div className="flex items-center gap-3 pb-2">
        <div className="relative">
          <img
            src="/favicon.png"
            alt="Upoharkabbo"
            className="size-10 rounded-full bg-white object-contain p-1 ring-1 ring-border"
          />
        </div>
        <div className="h-3 w-32 animate-pulse rounded-md bg-muted" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-xl bg-muted/70" />
      ))}
    </div>
  );
}
