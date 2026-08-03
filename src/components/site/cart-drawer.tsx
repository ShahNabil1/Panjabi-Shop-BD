import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useCart } from "@/lib/cart-context";
import { useLang } from "@/lib/language-context";
import { formatNumber, formatPrice, pick, tr } from "@/lib/i18n";
import { getDeliveryRates } from "@/lib/order.functions";
import { ProductThumb } from "@/components/site/product-card";
import { QuantityStepper } from "@/components/site/add-to-cart";
import { CheckoutForm, type DeliveryRates } from "@/components/site/checkout-form";
import { cn } from "@/lib/utils";

export function CartDrawer() {
  const { lang } = useLang();
  const { items, subtotal, setQuantity, remove, open, step, setStep, closeCart } = useCart();
  const [mounted, setMounted] = useState(false);
  const [rates, setRates] = useState<DeliveryRates | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || rates) return;
    let active = true;
    void getDeliveryRates()
      .then((r) => {
        if (active) setRates(r as DeliveryRates);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [open, rates]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeCart]);

  if (!mounted) return null;

  const checkout = step === "checkout";

  return (
    <div
      className={cn("fixed inset-0 z-[70]", open ? "" : "pointer-events-none")}
      aria-hidden={!open}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label={tr(lang, "close")}
        onClick={closeCart}
        className={cn(
          "absolute inset-0 bg-foreground/50 backdrop-blur-[2px] transition-opacity duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      <aside
        role="dialog"
        aria-modal={open}
        aria-label={tr(lang, "cart")}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-background shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center gap-3 border-b border-border px-4 py-3">
          {checkout ? (
            <button
              type="button"
              onClick={() => setStep("cart")}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-border transition-colors hover:border-primary hover:text-primary"
              aria-label={tr(lang, "cart")}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ) : null}
          <h2 className="min-w-0 flex-1 truncate text-base font-bold">
            {checkout ? tr(lang, "checkout") : tr(lang, "cart")}
            {!checkout && items.length ? (
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                ({formatNumber(lang, items.length)})
              </span>
            ) : null}
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label={tr(lang, "close")}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-border transition-colors hover:border-primary hover:text-primary"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {items.length === 0 ? (
          <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 text-center">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-64 w-64 rounded-full bg-primary/5" />
              <div className="absolute h-44 w-44 rounded-full bg-secondary" />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-5">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-card shadow-lg ring-1 ring-border">
                <svg
                  viewBox="0 0 24 24"
                  className="h-11 w-11 text-primary"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 7h15l-1.5 8.5a2 2 0 0 1-2 1.5H8.5a2 2 0 0 1-2-1.5L5 4H2" />
                  <path d="M9 11V6a3 3 0 0 1 6 0v5" />
                  <circle cx="9" cy="20" r="1" />
                  <circle cx="17" cy="20" r="1" />
                </svg>
              </div>

              <div className="max-w-[16rem]">
                <h3 className="text-lg font-bold text-foreground">
                  {tr(lang, "emptyCartTitle")}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {tr(lang, "emptyCartBody")}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  to="/"
                  onClick={closeCart}
                  className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  {tr(lang, "browseGifts")}
                </Link>
                <button
                  type="button"
                  onClick={closeCart}
                  className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
                >
                  {tr(lang, "continueShopping")}
                </button>
              </div>
            </div>
          </div>
        ) : checkout ? (
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {rates ? (
              <CheckoutForm
                items={items}
                rates={rates}
                source="website"
                compact
                onSetQuantity={setQuantity}
                onRemove={remove}
                onPlaced={closeCart}
              />
            ) : (
              <div className="h-64 animate-pulse rounded-sm bg-secondary" />
            )}
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-4 py-4">
              {items.map((item) => (
                <li
                  key={item.key}
                  className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 border-b border-border/70 py-3 first:pt-0 last:border-0"
                >
                  <Link
                    to="/p/$product"
                    params={{ product: item.slug }}
                    onClick={closeCart}
                    className="aspect-square overflow-hidden rounded-sm bg-secondary"
                  >
                    <ProductThumb
                      src={item.image}
                      alt={pick(lang, item.nameBn, item.nameEn)}
                      label={item.nameEn}
                    />
                  </Link>
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        to="/p/$product"
                        params={{ product: item.slug }}
                        onClick={closeCart}
                        className="line-clamp-2 min-w-0 text-sm font-semibold hover:text-primary"
                      >
                        {pick(lang, item.nameBn, item.nameEn)}
                      </Link>
                      <span className="shrink-0 text-sm font-bold tabular-nums">
                        {formatPrice(lang, item.price * item.quantity)}
                      </span>
                    </div>
                    {item.variantLabelBn ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {pick(lang, item.variantLabelBn, item.variantLabelEn)}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <QuantityStepper
                        value={item.quantity}
                        max={item.stock}
                        onChange={(next) => setQuantity(item.key, next)}
                      />
                      <button
                        type="button"
                        onClick={() => remove(item.key)}
                        className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
                      >
                        {tr(lang, "remove")}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="border-t border-border bg-card px-4 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{tr(lang, "subtotal")}</span>
                <span className="text-base font-bold tabular-nums text-primary">
                  {formatPrice(lang, subtotal)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{tr(lang, "codNote")}</p>
              <button
                type="button"
                onClick={() => setStep("checkout")}
                className="mt-3 w-full rounded-sm bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {tr(lang, "checkout")}
              </button>
              <button
                type="button"
                onClick={closeCart}
                className="mt-2 w-full px-5 py-2 text-center text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
              >
                {tr(lang, "continueShopping")}
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
