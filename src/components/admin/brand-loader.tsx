import { cn } from "@/lib/utils";

interface BrandLoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  fullScreen?: boolean;
}

const sizeMap = {
  sm: "size-10",
  md: "size-14",
  lg: "size-20",
  xl: "size-28",
};

export function BrandLoader({ message, size = "md", className, fullScreen }: BrandLoaderProps) {
  const wrapper = (
    <div className={cn("flex flex-col items-center justify-center gap-4", className)}>
      <div className="relative">
        <div className="absolute -inset-3 animate-ping rounded-full bg-primary/10" />
        <div className="absolute -inset-1 animate-pulse rounded-full bg-primary/5" />
        <img
          src="/favicon.png"
          alt="Upoharkabbo"
          className={cn(
            "relative z-10 rounded-full bg-white object-contain p-1.5 shadow-lg ring-1 ring-border",
            sizeMap[size],
          )}
        />
      </div>
      {message && <p className="text-sm font-medium text-muted-foreground">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="admin-scope flex min-h-[70vh] flex-col items-center justify-center">
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
