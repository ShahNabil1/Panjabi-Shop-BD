import { Link } from "@tanstack/react-router";

import { useLang } from "@/lib/language-context";
import { discountPercent, formatPrice, pick, tr } from "@/lib/i18n";
import type { ProductCard as ProductCardData } from "@/lib/supabase-public";
import { cn } from "@/lib/utils";

export function ProductThumb({
  src,
  alt,
  label,
  className,
}: {
  src: string | null;
  alt: string;
  label: string;
  className?: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }
  return (
    <div
      aria-hidden
      className={cn(
        "flex h-full w-full items-center justify-center bg-secondary text-2xl font-bold text-muted-foreground/60",
        className,
      )}
    >
      {label.trim().charAt(0) || "•"}
    </div>
  );
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const { lang } = useLang();
  const name = pick(lang, product.nameBn, product.nameEn);
  const badge = pick(lang, product.badgeBn, product.badgeEn);
  const off = discountPercent(product.price, product.compareAtPrice);
  const soldOut = product.stock <= 0;

  return (
    <Link
      to="/p/$product"
      params={{ product: product.slug }}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow duration-200 hover:shadow-[var(--shadow-lift)]"
    >
      <div className="relative aspect-4/5 overflow-hidden bg-secondary">
        <ProductThumb
          src={product.image}
          alt={pick(lang, product.imageAltBn, product.imageAltEn) || name}
          label={name}
          className="transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute left-0 top-3 flex flex-col gap-1">
          {badge ? (
            <span className="bg-primary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground">
              {badge}
            </span>
          ) : null}
          {off > 0 ? (
            <span className="bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background">
              {lang === "bn" ? `${off}% ছাড়` : `${off}% off`}
            </span>
          ) : null}
        </div>
        {soldOut ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <span className="rounded-sm border border-border bg-card px-3 py-1.5 text-xs font-semibold">
              {tr(lang, "outOfStock")}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-card-foreground">
          {name}
        </h3>
        {product.reviewCount > 0 ? (
          <p className="text-xs text-muted-foreground">
            ★ {product.rating.toFixed(1)} · {product.reviewCount} {tr(lang, "reviews")}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-baseline gap-2 pt-1.5">
          <span className="text-base font-bold text-primary">
            {formatPrice(lang, product.price)}
          </span>
          {off > 0 ? (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(lang, product.compareAtPrice)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  const { lang } = useLang();
  if (products.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-muted-foreground">
        {tr(lang, "noProducts")}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
