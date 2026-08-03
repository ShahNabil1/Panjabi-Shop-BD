import { useState } from "react";
import { toast } from "sonner";

import { useCart, type NewCartItem } from "@/lib/cart-context";
import { useLang } from "@/lib/language-context";
import { formatNumber, pick, tr } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  onChange,
  max,
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  max: number;
  className?: string;
}) {
  const { lang } = useLang();
  const limit = max > 0 ? max : 99;
  return (
    <div
      className={cn(
        "inline-flex items-center overflow-hidden rounded-sm border border-border",
        className,
      )}
    >
      <button
        type="button"
        aria-label="-"
        onClick={() => onChange(Math.max(1, value - 1))}
        className="px-3 py-2 text-base leading-none text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
        disabled={value <= 1}
      >
        −
      </button>
      <span className="min-w-10 px-2 text-center text-sm font-semibold tabular-nums">
        {formatNumber(lang, value)}
      </span>
      <button
        type="button"
        aria-label="+"
        onClick={() => onChange(Math.min(limit, value + 1))}
        className="px-3 py-2 text-base leading-none text-foreground transition-colors hover:bg-secondary disabled:opacity-40"
        disabled={value >= limit}
      >
        +
      </button>
    </div>
  );
}

export function AddToCartBar({
  item,
  stock,
  className,
}: {
  item: Omit<NewCartItem, "quantity">;
  stock: number;
  className?: string;
}) {
  const { lang } = useLang();
  const { add, openCart } = useCart();
  const [qty, setQty] = useState(1);
  const soldOut = stock <= 0;

  const addItem = () => {
    add({ ...item, quantity: qty });
    toast.success(tr(lang, "added"), {
      description: pick(lang, item.nameBn, item.nameEn),
    });
    openCart("cart");
  };

  if (soldOut) {
    return (
      <div
        className={cn(
          "rounded-sm border border-border bg-secondary px-4 py-3 text-center text-sm font-semibold text-muted-foreground",
          className,
        )}
      >
        {tr(lang, "outOfStock")}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <QuantityStepper value={qty} onChange={setQty} max={stock} />
      <button
        type="button"
        onClick={addItem}
        className="min-w-36 flex-1 rounded-sm border border-primary px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
      >
        {tr(lang, "addToCart")}
      </button>
      <button
        type="button"
        onClick={() => {
          addItem();
          openCart("checkout");
        }}
        className="min-w-36 flex-1 rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {tr(lang, "buyNow")}
      </button>
    </div>
  );
}
