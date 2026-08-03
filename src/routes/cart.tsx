import { Link, createFileRoute } from "@tanstack/react-router";

import { useCart } from "@/lib/cart-context";
import { useLang } from "@/lib/language-context";
import { formatNumber, formatPrice, pick, tr } from "@/lib/i18n";
import { ProductThumb } from "@/components/site/product-card";
import { QuantityStepper } from "@/components/site/add-to-cart";
import { Section } from "@/components/site/ui";

export const Route = createFileRoute("/cart")({
  component: CartPage,
  head: () => ({
    meta: [
      { title: "কার্ট | তাঁতঘর" },
      { name: "description", content: "আপনার নির্বাচিত পণ্যগুলো দেখুন এবং ক্যাশ অন ডেলিভারিতে অর্ডার করুন।" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "কার্ট | তাঁতঘর" },
      { property: "og:description", content: "আপনার নির্বাচিত পণ্যগুলো দেখুন।" },
      { property: "og:url", content: "https://upoharkabbo.lovable.app/cart" },
    ],
    links: [{ rel: "canonical", href: "https://upoharkabbo.lovable.app/cart" }],
  }),
});

function CartPage() {
  const { lang } = useLang();
  const { items, subtotal, setQuantity, remove, ready } = useCart();

  return (
    <Section title={tr(lang, "cart")}>
      {!ready ? (
        <div className="h-40 animate-pulse rounded-sm bg-secondary" />
      ) : items.length === 0 ? (
        <div className="rounded-sm border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground">{tr(lang, "emptyCart")}</p>
          <Link
            to="/"
            className="mt-5 inline-block rounded-sm bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {tr(lang, "continueShopping")}
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ul className="grid gap-3">
            {items.map((item) => (
              <li
                key={item.key}
                className="grid grid-cols-[80px_minmax(0,1fr)] gap-4 rounded-sm border border-border bg-card p-3 sm:grid-cols-[96px_minmax(0,1fr)_auto]"
              >
                <Link
                  to="/p/$product"
                  params={{ product: item.slug }}
                  className="aspect-square overflow-hidden rounded-sm bg-secondary"
                >
                  <ProductThumb
                    src={item.image}
                    alt={pick(lang, item.nameBn, item.nameEn)}
                    label={item.nameEn}
                  />
                </Link>

                <div className="min-w-0">
                  <Link
                    to="/p/$product"
                    params={{ product: item.slug }}
                    className="line-clamp-2 text-[15px] font-semibold hover:text-primary"
                  >
                    {pick(lang, item.nameBn, item.nameEn)}
                  </Link>
                  {item.variantLabelBn ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {pick(lang, item.variantLabelBn, item.variantLabelEn)}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm font-bold text-primary">
                    {formatPrice(lang, item.price)}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-3">
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

                <div className="col-span-2 border-t border-border pt-2 text-right font-bold tabular-nums sm:col-span-1 sm:border-0 sm:pt-0">
                  {formatPrice(lang, item.price * item.quantity)}
                </div>
              </li>
            ))}
          </ul>

          <aside className="h-fit rounded-sm border border-border bg-card p-5 lg:sticky lg:top-24">
            <h2 className="text-base font-bold">{tr(lang, "orderSummary")}</h2>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {tr(lang, "subtotal")} ({formatNumber(lang, items.length)})
                </dt>
                <dd className="font-semibold tabular-nums">{formatPrice(lang, subtotal)}</dd>
              </div>
              <p className="text-xs text-muted-foreground">{tr(lang, "codNote")}</p>
            </dl>
            <Link
              to="/checkout"
              className="mt-4 block rounded-sm bg-primary px-5 py-3 text-center text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {tr(lang, "checkout")}
            </Link>
            <Link
              to="/"
              className="mt-2 block px-5 py-2 text-center text-sm font-semibold text-muted-foreground hover:text-primary"
            >
              {tr(lang, "continueShopping")}
            </Link>
          </aside>
        </div>
      )}
    </Section>
  );
}
