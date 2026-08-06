import { cn } from "@/lib/utils";

export type SpecItem = {
  label?: string;
  value?: string;
};

type Props = {
  heading: string;
  items: SpecItem[];
  imageUrl?: string | null;
  imageAlt: string;
  className?: string;
};

function Callout({ item, side }: { item: SpecItem; side: "left" | "right" }) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-3",
        side === "left" ? "sm:flex-row-reverse sm:text-right" : "sm:text-left",
      )}
    >
      {/* connector */}
      <span aria-hidden className="hidden shrink-0 items-center sm:flex">
        <span className="h-2 w-2 rounded-full bg-primary" />
        <span className="h-px w-6 bg-linear-to-r from-primary/70 to-primary/20 sm:w-8" />
      </span>

      <div
        className={cn(
          "flex-1 rounded-xl border border-primary/15 bg-white/70 px-4 py-3 shadow-[0_1px_0_0_rgba(0,0,0,0.02),0_12px_28px_-24px_rgba(0,0,0,0.45)] backdrop-blur-[2px]",
        )}
      >
        {item.label ? (
          <p className="font-display-bn text-[15px] leading-snug text-primary sm:text-[17px]">{item.label}</p>
        ) : null}
        {item.value ? (
          <p
            className={cn(
              "lp-fat-bn text-[15px] leading-[1.65] text-foreground/85 sm:text-[16px]",
              item.label ? "mt-1" : "",
            )}
          >
            {item.value}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function SpecShowcase({ heading, items, imageUrl, imageAlt, className }: Props) {
  if (items.length === 0) return null;
  const half = Math.ceil(items.length / 2);
  const left = items.slice(0, half);
  const right = items.slice(half);

  return (
    <section className={cn("relative", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-10 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/[0.08] blur-3xl"
      />

      <div className="relative text-center">
        <h2 className="lp-headline text-[28px] leading-[1.2] sm:text-[42px] sm:leading-[1.15]">
          <span className="lp-slant text-gradient-lp inline-block">{heading}</span>
        </h2>
        <div aria-hidden className="mx-auto mt-4 flex items-center justify-center gap-2">
          <span className="h-px w-12 bg-linear-to-r from-transparent to-accent" />
          <span className="h-2 w-2 rotate-45 bg-linear-to-br from-primary to-accent" />
          <span className="h-px w-12 bg-linear-to-l from-transparent to-accent" />
        </div>
      </div>

      <div className="relative mt-8 grid items-center gap-6 sm:grid-cols-[1fr_auto_1fr] sm:gap-4">
        <div className="order-2 grid gap-4 sm:order-1">
          {left.map((item, i) => (
            <Callout key={`l-${i}`} item={item} side="left" />
          ))}
        </div>

        {imageUrl ? (
          <div className="order-1 mx-auto sm:order-2">
            <div className="relative h-52 w-52 sm:h-72 sm:w-72">
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-linear-to-br from-primary/10 via-transparent to-accent/15"
              />
              <span aria-hidden className="absolute inset-2 rounded-full border border-primary/15" />
              <img
                src={imageUrl}
                alt={imageAlt}
                loading="lazy"
                className="relative h-full w-full rounded-full object-cover p-3"
              />
            </div>
          </div>
        ) : (
          <div className="order-1 hidden sm:order-2 sm:block sm:w-6" />
        )}

        <div className="order-3 grid gap-4">
          {right.map((item, i) => (
            <Callout key={`r-${i}`} item={item} side="right" />
          ))}
        </div>
      </div>
    </section>
  );
}
