import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShoppingBag, Zap } from "lucide-react";

import { useCart } from "@/lib/cart-context";
import { getComboSelections } from "@/lib/catalog.functions";


import { useLang } from "@/lib/language-context";
import { badgeLabel, discountPercent, formatNumber, formatPrice, pick, toBnDigits, tr } from "@/lib/i18n";
import type { ProductCard as ProductCardData } from "@/lib/supabase-public";
import { cn } from "@/lib/utils";

export function ProductThumb({
  src,
  alt,
  label,
  className,
  onClick,
}: {
  src: string | null;
  alt: string;
  label: string;
  className?: string;
  onClick?: () => void;
}) {
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        onClick={onClick}
        className={cn("h-full w-full object-cover", onClick ? "cursor-zoom-in" : "", className)}
      />
    );
  }

  return (
    <div
      aria-hidden
      onClick={onClick}
      className={cn(
        "flex h-full w-full items-center justify-center bg-secondary text-2xl font-bold text-muted-foreground/60",
        onClick ? "cursor-zoom-in" : "",
        className,
      )}
    >
      {label.trim().charAt(0) || "•"}
    </div>
  );
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const { lang } = useLang();
  const navigate = useNavigate();
  const { add, openCart } = useCart();
  const name = pick(lang, product.nameBn, product.nameEn);
  const badge = badgeLabel(product.badgeBn, product.badgeEn);
  const off = discountPercent(product.price, product.compareAtPrice);
  const soldOut = product.stock <= 0;

  // Cards don't carry combo contents, so fetch the full package list before
  // adding — otherwise combos added from listings reach checkout item-less.
  const addItem = async () => {
    let comboSelections: Awaited<ReturnType<typeof getComboSelections>> = [];
    try {
      comboSelections = await getComboSelections({ data: { productId: product.id } });
    } catch {
      comboSelections = [];
    }
    add({
      productId: product.id,
      slug: product.slug,
      nameBn: product.nameBn,
      nameEn: product.nameEn,
      image: product.image,
      price: product.price,
      quantity: 1,
      stock: product.stock,
      sku: product.sku,
      variantId: null,
      variantLabelBn: null,
      variantLabelEn: null,
      comboSelections,
    });
  };

  const onAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut) return;
    void addItem().then(() => openCart("cart"));
  };

  const onBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut) return;
    addItem();
    void navigate({ to: "/checkout" });
  };

  return (
    <Link
      to="/p/$product"
      params={{ product: product.slug }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card",
        "transition-all duration-300 ease-out will-change-transform",
        "hover:-translate-y-1.5 hover:border-primary/40 hover:shadow-[0_18px_40px_-18px_rgba(255,51,102,0.45)]",
      )}
    >
      <div className="relative aspect-4/5 overflow-hidden bg-secondary">
        <ProductThumb
          src={product.image}
          alt={pick(lang, product.imageAltBn, product.imageAltEn) || name}
          label={name}
          className="transition-transform duration-700 ease-out group-hover:scale-[1.07]"
        />
        {/* soft brand glow on hover */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/25 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute left-0 top-3 flex flex-col gap-1">
          {badge ? (
            <span className="rounded-r-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground shadow-sm">
              {badge}
            </span>
          ) : null}
          {off > 0 ? (
            <span className="rounded-r-full bg-foreground px-3 py-1 text-[11px] font-semibold text-background shadow-sm">
              {lang === "bn" ? `${off}% ছাড়` : `${off}% off`}
            </span>
          ) : null}
        </div>
        {soldOut ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
            <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold">
              {tr(lang, "outOfStock")}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3.5 text-center sm:text-left">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-card-foreground transition-colors duration-200 group-hover:text-primary">
          {name}
        </h3>
        {product.reviewCount > 0 ? (
          <p className="text-xs text-muted-foreground">
            ★ {lang === "bn" ? toBnDigits(product.rating.toFixed(1)) : product.rating.toFixed(1)} ·{" "}
            {formatNumber(lang, product.reviewCount)} {tr(lang, "reviews")}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-baseline justify-center gap-2 pt-1.5 sm:justify-start">
          <span className="text-base font-bold text-primary">
            {formatPrice(lang, product.price)}
          </span>
          {off > 0 ? (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(lang, product.compareAtPrice)}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={onAddToCart}
            disabled={soldOut}
            className={cn(
              "inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary/60 bg-primary/5 px-3 py-2 text-[13px] font-semibold text-primary",
              "transition-all duration-200 ease-out hover:bg-primary hover:text-primary-foreground hover:shadow-[0_8px_20px_-10px_rgba(255,51,102,0.8)] active:scale-[0.97]",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            <ShoppingBag className="size-4" />
            Add to Cart
          </button>
          <button
            type="button"
            onClick={onBuyNow}
            disabled={soldOut}
            className={cn(
              "inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[13px] font-bold text-primary-foreground shadow-sm",
              "transition-all duration-200 ease-out hover:brightness-110 hover:shadow-[0_10px_24px_-10px_rgba(255,51,102,0.9)] active:scale-[0.97]",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            <Zap className="size-4" />
            Buy Now
          </button>
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
