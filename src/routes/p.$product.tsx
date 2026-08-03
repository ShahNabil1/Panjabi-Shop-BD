import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";

import { getProductPage } from "@/lib/catalog.functions";
import type { ProductPageData } from "@/lib/types";
import { useLang } from "@/lib/language-context";
import { discountPercent, formatPrice, pick, tr, formatNumber, toBnDigits } from "@/lib/i18n";
import { ProductGrid, ProductThumb } from "@/components/site/product-card";
import { NotFoundView } from "@/components/site/not-found-view";
import { absoluteUrl } from "@/lib/site";
import { FaqList } from "@/components/site/faq-list";
import { Breadcrumbs, Prose, Section } from "@/components/site/ui";
import { AddToCartBar } from "@/components/site/add-to-cart";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/p/$product")({
  loader: async ({ params }): Promise<ProductPageData> => {
    const data = await getProductPage({ data: { slug: params.product } });
    if (!data) throw notFound();
    return data;
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "পণ্যটি পাওয়া যায়নি" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.product;
    const image = p.ogImageUrl ?? loaderData.images[0]?.url ?? null;
    const title = p.metaTitle || `${p.nameBn} | ${p.nameEn}`;
    const description =
      p.metaDescription ||
      p.shortBn ||
      `${p.nameBn} — ${formatPrice("bn", p.price)}. সারা দেশে ক্যাশ অন ডেলিভারি।`;
    const url = `/p/${params.product}`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(image ? [{ property: "og:image", content: image }] : []),
        ...(image ? [{ name: "twitter:image", content: image }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: p.nameBn,
            alternateName: p.nameEn,
            description,
            sku: p.sku ?? undefined,
            brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
            image: image ? [image] : undefined,
            aggregateRating:
              p.reviewCount > 0
                ? {
                    "@type": "AggregateRating",
                    ratingValue: p.rating,
                    reviewCount: p.reviewCount,
                  }
                : undefined,
            offers: {
              "@type": "Offer",
              price: p.price,
              priceCurrency: "BDT",
              availability:
                p.stock > 0
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
              url: absoluteUrl(url),
              priceValidUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90)
                .toISOString()
                .slice(0, 10),
              itemCondition: "https://schema.org/NewCondition",
              seller: { "@type": "Organization", name: "তাঁতঘর" },
              shippingDetails: {
                "@type": "OfferShippingDetails",
                shippingDestination: {
                  "@type": "DefinedRegion",
                  addressCountry: "BD",
                },
              },
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "হোম", item: absoluteUrl("/") },
              ...(loaderData.category
                ? [
                    {
                      "@type": "ListItem",
                      position: 2,
                      name: loaderData.category.name_bn,
                      item: absoluteUrl(`/c/${loaderData.category.slug}`),
                    },
                  ]
                : []),
              {
                "@type": "ListItem",
                position: loaderData.category ? 3 : 2,
                name: p.nameBn,
                item: absoluteUrl(url),
              },
            ],
          }),
        },
        ...(Array.isArray(p.faq) && p.faq.length > 0
          ? [
              {
                type: "application/ld+json",
                children: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: p.faq.map((f) => ({
                    "@type": "Question",
                    name: f["question_bn"] ?? f["question"] ?? "",
                    acceptedAnswer: {
                      "@type": "Answer",
                      text: f["answer_bn"] ?? f["answer"] ?? "",
                    },
                  })),
                }),
              },
            ]
          : []),
      ],
    };
  },
  notFoundComponent: () => <NotFoundView />,
  component: ProductPage,
});

function ProductPage() {
  const { lang } = useLang();
  const { product, images, variants, category, subcategory, related, landingSlug } =
    Route.useLoaderData() as ProductPageData;
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});

  const name = pick(lang, product.nameBn, product.nameEn);
  const off = discountPercent(product.price, product.compareAtPrice);
  const short = pick(lang, product.shortBn, product.shortEn);
  const description = pick(lang, product.descriptionBn, product.descriptionEn);
  const badge = pick(lang, product.badgeBn, product.badgeEn);

  const groups = new Map<string, typeof variants>();
  for (const v of variants) {
    const key = pick(lang, v.group_name_bn, v.group_name_en);
    const list = groups.get(key) ?? [];
    list.push(v);
    groups.set(key, list);
  }

  const selectedIds = Object.values(selected);
  const activeVariant =
    variants.find((v) => selectedIds.includes(v.id)) ??
    (groups.size === 1 ? (variants[0] ?? null) : null);
  const unitPrice = product.price + Number(activeVariant?.price_delta ?? 0);



  const productFaqs = (product.faq ?? []).map((f, i) => ({
    id: String(i),
    question_bn: f["question_bn"] ?? f["question"] ?? "",
    question_en: f["question_en"] ?? f["question"] ?? "",
    answer_bn: f["answer_bn"] ?? f["answer"] ?? "",
    answer_en: f["answer_en"] ?? f["answer"] ?? "",
  }));

  return (
    <>
      <Section>
        <Breadcrumbs
          items={[
            { label: tr(lang, "home"), to: "/" },
            ...(category
              ? [
                  {
                    label: pick(lang, category.name_bn, category.name_en),
                    to: "/c/$category",
                    params: { category: category.slug },
                  },
                ]
              : []),
            ...(category && subcategory
              ? [
                  {
                    label: pick(lang, subcategory.name_bn, subcategory.name_en),
                    to: "/c/$category/$subcategory",
                    params: { category: category.slug, subcategory: subcategory.slug },
                  },
                ]
              : []),
            { label: name },
          ]}
        />

        <div className="mt-5 grid gap-8 lg:grid-cols-2">
          <div className="min-w-0">
            <div className="aspect-4/5 overflow-hidden rounded-lg border border-border bg-card">
              <ProductThumb
                src={images[active]?.url ?? null}
                alt={pick(lang, images[active]?.alt_bn, images[active]?.alt_en) || name}
                label={name}
              />
            </div>
            {images.length > 1 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`${name} ${i + 1}`}
                    className={cn(
                      "h-16 w-16 shrink-0 overflow-hidden rounded-sm border",
                      i === active ? "border-primary" : "border-border",
                    )}
                  >
                    <ProductThumb src={img.url} alt="" label={name} />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="min-w-0">
            {badge ? (
              <span className="inline-block rounded-sm bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {badge}
              </span>
            ) : null}
            <h1 className="mt-2 text-2xl font-bold leading-snug tracking-tight sm:text-3xl">
              {name}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {product.reviewCount > 0 ? (
                <span>
                  ★ {lang === "bn" ? toBnDigits(product.rating.toFixed(1)) : product.rating.toFixed(1)} ·{" "}
                  {formatNumber(lang, product.reviewCount)} {tr(lang, "reviews")}
                </span>
              ) : null}
              {product.brand ? (
                <span>
                  {tr(lang, "brand")}: {product.brand}
                </span>
              ) : null}
              {product.sku ? (
                <span className="font-en">
                  {tr(lang, "sku")}: {product.sku}
                </span>
              ) : null}
            </div>

            {short ? <p className="mt-4 text-[15px] leading-7 text-foreground/90">{short}</p> : null}

            <div className="mt-5 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">
                {formatPrice(lang, product.price)}
              </span>
              {off > 0 ? (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(lang, product.compareAtPrice)}
                  </span>
                  <span className="rounded-sm bg-foreground px-2 py-0.5 text-xs font-semibold text-background">
                    {formatNumber(lang, off)}% {tr(lang, "off")}
                  </span>
                </>
              ) : null}
            </div>

            <p
              className={cn(
                "mt-2 text-sm font-medium",
                product.stock > 0 ? "text-success" : "text-destructive",
              )}
            >
              {product.stock > 0 ? tr(lang, "inStock") : tr(lang, "outOfStock")}
            </p>

            {groups.size > 0 ? (
              <div className="mt-6 space-y-4">
                {[...groups.entries()].map(([group, options]) => (
                  <div key={group}>
                    <p className="mb-2 text-sm font-semibold">{group}</p>
                    <div className="flex flex-wrap gap-2">
                      {options.map((opt) => {
                        const label = pick(lang, opt.value_bn, opt.value_en);
                        const isOn = selected[group] === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              setSelected((prev) => ({ ...prev, [group]: opt.id }))
                            }
                            className={cn(
                              "rounded-sm border px-3.5 py-2 text-sm transition-colors",
                              isOn
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-card hover:border-primary",
                            )}
                          >
                            {label}
                            {Number(opt.price_delta) !== 0 ? (
                              <span className="ml-1 text-xs text-muted-foreground">
                                {Number(opt.price_delta) > 0 ? "+" : ""}
                                {formatPrice(lang, opt.price_delta)}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <AddToCartBar
              className="mt-6"
              stock={activeVariant ? activeVariant.stock : product.stock}
              item={{
                productId: product.id,
                slug: product.slug,
                nameBn: product.nameBn,
                nameEn: product.nameEn,
                image: images[0]?.url ?? null,
                price: unitPrice,
                stock: activeVariant ? activeVariant.stock : product.stock,
                sku: product.sku,
                variantId: activeVariant?.id ?? null,
                variantLabelBn: activeVariant
                  ? `${activeVariant.group_name_bn}: ${activeVariant.value_bn}`
                  : null,
                variantLabelEn: activeVariant
                  ? `${activeVariant.group_name_en}: ${activeVariant.value_en}`
                  : null,
              }}
            />

            {landingSlug ? (
              <Link
                to="/lp/$slug"
                params={{ slug: landingSlug }}
                className="mt-3 block text-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                {tr(lang, "orderNow2")}
              </Link>
            ) : null}

            <div className="mt-7 rounded-lg border border-border bg-surface p-4">
              <p className="text-sm font-semibold">{tr(lang, "cod")}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === "bn"
                  ? "পণ্য হাতে পেয়ে টাকা পরিশোধ করুন। ঢাকার ভেতরে ২৪ ঘণ্টা, বাইরে ৪৮–৭২ ঘণ্টা।"
                  : "Pay when the parcel reaches you. 24 hours inside Dhaka, 48–72 hours elsewhere."}
              </p>
            </div>
          </div>
        </div>

        {description ? (
          <div className="mt-10 max-w-3xl">
            <h2 className="text-lg font-bold">{tr(lang, "description")}</h2>
            <Prose text={description} className="mt-3" />
          </div>
        ) : null}

        {product.specs.length > 0 ? (
          <div className="mt-10 max-w-3xl">
            <h2 className="text-lg font-bold">{tr(lang, "specs")}</h2>
            <dl className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {product.specs.map((spec, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-3 px-4 py-3">
                  <dt className="min-w-0 text-sm text-muted-foreground">
                    {pick(lang, spec["label_bn"], spec["label_en"]) || spec["label"] || ""}
                  </dt>
                  <dd className="min-w-0 text-sm font-medium">
                    {pick(lang, spec["value_bn"], spec["value_en"]) || spec["value"] || ""}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {productFaqs.length > 0 ? (
          <div className="mt-10 max-w-3xl">
            <h2 className="text-lg font-bold">{tr(lang, "productFaq")}</h2>
            <FaqList items={productFaqs} className="mt-3" />
          </div>
        ) : null}
      </Section>

      {related.length > 0 ? (
        <Section title={tr(lang, "related")}>
          <ProductGrid products={related} />
        </Section>
      ) : null}

      {category ? (
        <div className="mx-auto max-w-6xl px-4 pb-8">
          <Link
            to="/c/$category"
            params={{ category: category.slug }}
            className="text-sm font-semibold text-primary hover:underline"
          >
            ← {pick(lang, category.name_bn, category.name_en)}
          </Link>
        </div>
      ) : null}
    </>
  );
}
