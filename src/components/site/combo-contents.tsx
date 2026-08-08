import type { ComboContentItem } from "@/lib/types";
import { useLang } from "@/lib/language-context";
import { formatNumber, pick } from "@/lib/i18n";
import { ImageLightbox, useLightbox } from "@/components/site/image-lightbox";

export function ComboContents({
  items,
  selected,
  onSelect,
}: {
  items: ComboContentItem[];
  selected?: Record<string, string>;
  onSelect?: (itemId: string, variantId: string) => void;
}) {
  const { lang } = useLang();
  const lightbox = useLightbox();
  const galleryImages = items.map((item) => ({
    src: item.image,
    alt: pick(lang, item.nameBn, item.nameEn),
  })).filter((img) => img.src);
  if (items.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
        <h2 className="font-display-bn text-center text-xl font-bold leading-snug sm:text-2xl">
          {lang === "bn" ? "এই প্যাকেজে যা যা থাকছে" : "What's inside this package"}
        </h2>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
      </div>

      <p className="mt-2 text-center text-sm text-muted-foreground">
        {lang === "bn"
          ? `মোট ${formatNumber(lang, items.reduce((n, i) => n + i.quantity, 0))} টি আইটেম`
          : `${items.reduce((n, i) => n + i.quantity, 0)} items in total`}
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <li
            key={item.id}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]"
          >
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
              {item.image ? (
                <img
                  src={item.image}
                  alt={pick(lang, item.nameBn, item.nameEn)}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-sm font-bold text-muted-foreground/60">
                  {formatNumber(lang, i + 1)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold leading-snug">
                {pick(lang, item.nameBn, item.nameEn)}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-secondary px-2 py-0.5 font-semibold">
                  {lang === "bn"
                    ? `${formatNumber(lang, item.quantity)} টি`
                    : `Qty ${item.quantity}`}
                </span>
                {item.isFree ? (
                  <span className="rounded-full bg-success/10 px-2 py-0.5 font-semibold text-success">
                    {lang === "bn" ? "ফ্রি" : "Free"}
                  </span>
                ) : null}
              </p>
              {item.variants.length > 0 ? (
                <div className="mt-2">
                  <p className="mb-1 text-xs font-semibold text-foreground">
                    {pick(lang, item.variants[0]?.groupNameBn, item.variants[0]?.groupNameEn)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => onSelect?.(item.id, variant.id)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-bold transition-colors ${
                          selected?.[item.id] === variant.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:border-primary"
                        }`}
                      >
                        {pick(lang, variant.valueBn, variant.valueEn)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
