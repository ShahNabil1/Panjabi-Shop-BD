import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { getLandingPage } from "@/lib/catalog.functions";
import { getDeliveryRates } from "@/lib/order.functions";
import type { LandingPageData } from "@/lib/types";
import { useLang } from "@/lib/language-context";
import { discountPercent, formatNumber, formatPrice, pick, toBnDigits, tr } from "@/lib/i18n";
import { ProductThumb } from "@/components/site/product-card";
import { NotFoundView } from "@/components/site/not-found-view";
import { FaqList } from "@/components/site/faq-list";
import { CheckoutForm } from "@/components/site/checkout-form";
import { QuantityStepper } from "@/components/site/add-to-cart";
import { Prose } from "@/components/site/ui";
import { SpecShowcase } from "@/components/site/spec-showcase";
import type { CartItem } from "@/lib/cart-context";
import { cn } from "@/lib/utils";
import logoMark from "@/assets/upoharkabbo-logo.png";

async function retryNetworkRequest<T>(request: () => Promise<T>): Promise<T> {
  const delays = [150, 400];

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      const isTransientNetworkError =
        error instanceof TypeError && /failed to fetch|networkerror/i.test(error.message);
      const delay = delays[attempt];
      if (!isTransientNetworkError || delay === undefined) throw error;
      await new Promise<void>((resolve) => globalThis.setTimeout(resolve, delay));
    }
  }
}

export const Route = createFileRoute("/lp/$slug")({
  loader: async ({ params }) => {
    const [data, rates] = await Promise.all([
      retryNetworkRequest(() => getLandingPage({ data: { slug: params.slug } })),
      retryNetworkRequest(() => getDeliveryRates()),
    ]);
    if (!data) throw notFound();
    return { ...data, rates };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "পেইজটি পাওয়া যায়নি" }, { name: "robots", content: "noindex" }] };
    }
    const { landing, product, images } = loaderData;
    const seo = landing.seo;
    const title = landing.metaTitle || landing.headlineBn || product.nameBn;
    const description =
      landing.metaDescription ||
      product.shortBn ||
      `${product.nameBn} — ${formatPrice("bn", product.price)}. ক্যাশ অন ডেলিভারিতে অর্ডার করুন।`;
    const ogTitle = seo.ogTitle || title;
    const ogDescription = seo.ogDescription || description;
    const image = landing.ogImageUrl ?? images[0]?.url ?? null;
    const url = seo.canonicalUrl || `https://upoharkabbo.lovable.app/lp/${params.slug}`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        ...(seo.noindex ? [{ name: "robots", content: "noindex, nofollow" }] : []),
        { property: "og:title", content: ogTitle },
        { property: "og:description", content: ogDescription },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(image ? [{ property: "og:image", content: image }] : []),
        ...(image ? [{ name: "twitter:image", content: image }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: seo.productJsonLd
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                name: product.nameBn,
                alternateName: product.nameEn,
                description,
                sku: product.sku ?? undefined,
                brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
                image: image ? [image] : undefined,
                offers: {
                  "@type": "Offer",
                  price: product.price,
                  priceCurrency: "BDT",
                  availability:
                    product.stock > 0
                      ? "https://schema.org/InStock"
                      : "https://schema.org/OutOfStock",
                  url,
                },
              }),
            },
          ]
        : [],
    };
  },

  notFoundComponent: () => <NotFoundView />,
  component: LandingPage,
});

function LandingPage() {
  const { lang } = useLang();
  const { landing, product, images, variants, rates } = Route.useLoaderData() as LandingPageData & {
    rates: { inside_dhaka: number; outside_dhaka: number; freeAbove: number; freeAll?: boolean };
  };

  const [variantId, setVariantId] = useState<string | null>(variants[0]?.id ?? null);
  const [qty, setQty] = useState(1);

  const activeVariant = variants.find((v) => v.id === variantId) ?? null;
  const unitPrice = product.price + Number(activeVariant?.price_delta ?? 0);
  const stock = activeVariant ? activeVariant.stock : product.stock;
  const off = discountPercent(product.price, product.compareAtPrice);

  const items = useMemo<CartItem[]>(
    () => [
      {
        key: `${product.id}::${activeVariant?.id ?? "base"}`,
        productId: product.id,
        slug: product.slug,
        nameBn: product.nameBn,
        nameEn: product.nameEn,
        image: images[0]?.url ?? null,
        price: unitPrice,
        quantity: Math.min(qty, stock > 0 ? stock : qty),
        stock,
        sku: activeVariant ? null : product.sku,
        variantId: activeVariant?.id ?? null,
        variantLabelBn: activeVariant
          ? `${activeVariant.group_name_bn}: ${activeVariant.value_bn}`
          : null,
        variantLabelEn: activeVariant
          ? `${activeVariant.group_name_en}: ${activeVariant.value_en}`
          : null,
      },
    ],
    [product, images, activeVariant, unitPrice, qty, stock],
  );

  const landingFaqs = (product.faq ?? []).map((f, i) => ({
    id: String(i),
    question_bn: f["question_bn"] ?? f["question"] ?? "",
    question_en: f["question_en"] ?? f["question"] ?? "",
    answer_bn: f["answer_bn"] ?? f["answer"] ?? "",
    answer_en: f["answer_en"] ?? f["answer"] ?? "",
  }));

  const headline = pick(lang, landing.headlineBn, landing.headlineEn) || pick(lang, product.nameBn, product.nameEn);
  const subheadline = pick(lang, landing.subheadlineBn, landing.subheadlineEn) || pick(lang, product.shortBn, product.shortEn);
  const description = pick(lang, product.descriptionBn, product.descriptionEn);

  return (
    <div className="lp-canvas -mt-px min-h-screen">
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:px-6">
      <header className="relative px-5 py-8 text-center sm:px-10 sm:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-primary/[0.06] blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-accent/[0.10] blur-3xl"
        />

        <img
          src={logoMark}
          alt={pick(lang, product.nameBn, product.nameEn)}
          width={1040}
          height={375}
          className="relative mx-auto h-14 w-auto object-contain sm:h-16"
        />

        <h1 className="lp-headline relative mt-6 text-[34px] leading-[1.18] sm:text-[58px] sm:leading-[1.12]">
          <span className="lp-slant text-gradient-lp inline-block">{headline}</span>
        </h1>

        <div aria-hidden className="relative mx-auto mt-6 flex items-center justify-center gap-2">
          <span className="h-px w-14 bg-linear-to-r from-transparent to-accent" />
          <span className="h-2.5 w-2.5 rotate-45 bg-linear-to-br from-primary to-accent" />
          <span className="h-px w-14 bg-linear-to-l from-transparent to-accent" />
        </div>

        {subheadline ? (
          <p className="lp-italic relative mx-auto mt-6 max-w-2xl text-[17px] font-medium leading-[1.72] text-foreground/75 sm:text-[21px] sm:leading-[1.62]">
            {subheadline}
          </p>
        ) : null}

      </header>



      <div className="mt-7 grid gap-6 sm:grid-cols-2">
        <div className="grid gap-3">
          {images.slice(0, 3).map((img, i) => (
            <div
              key={img.id}
              className={cn(
                "overflow-hidden rounded-lg border border-border bg-card",
                i === 0 ? "aspect-4/5" : "aspect-video",
              )}
            >
              <ProductThumb
                src={img.url}
                alt={pick(lang, img.alt_bn, img.alt_en) || headline}
                label={product.nameEn}
              />
            </div>
          ))}
        </div>

        <div>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold text-primary">{formatPrice(lang, unitPrice)}</span>
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

          {product.reviewCount > 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              ★ {lang === "bn" ? toBnDigits(product.rating.toFixed(1)) : product.rating.toFixed(1)} ·{" "}
              {formatNumber(lang, product.reviewCount)} {tr(lang, "reviews")}
            </p>
          ) : null}

          {landing.blocks.length > 0 ? (
            <ul className="mt-5 grid gap-2">
              {landing.blocks.map((block, i) => (
                <li key={i} className="flex gap-2 text-[15px] leading-7">
                  <span aria-hidden className="text-primary">
                    ✓
                  </span>
                  <span>{pick(lang, block["text_bn"], block["text_en"])}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {variants.length > 0 ? (
            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold">
                {pick(lang, variants[0]?.group_name_bn, variants[0]?.group_name_en)}
              </p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariantId(v.id)}
                    className={cn(
                      "rounded-sm border px-3.5 py-2 text-sm transition-colors",
                      v.id === variantId
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:border-primary",
                    )}
                  >
                    {pick(lang, v.value_bn, v.value_en)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex items-center gap-3">
            <span className="text-sm font-semibold">{tr(lang, "quantity")}</span>
            <QuantityStepper value={qty} onChange={setQty} max={stock} />
          </div>

          <a
            href="#order"
            className="mt-6 block rounded-sm bg-primary px-6 py-3.5 text-center text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {pick(lang, "এখনই অর্ডার করুন", "Order now")}
          </a>

          <p className="mt-3 text-center text-xs text-muted-foreground">{tr(lang, "codNote")}</p>
        </div>
      </div>

      {description ? (
        <section className="mx-auto mt-12 max-w-3xl">
          <h2 className="font-display-bn text-center text-xl leading-snug sm:text-2xl">{tr(lang, "description")}</h2>
          <Prose text={description} className="mt-3" />
        </section>
      ) : null}

      {product.specs.length > 0 ? (
        <SpecShowcase
          className="mx-auto mt-14 max-w-4xl"
          heading={tr(lang, "specs")}
          imageUrl={images[0]?.url ?? null}
          imageAlt={headline}
          items={product.specs.map((spec) => ({
            label: pick(lang, spec["label_bn"], spec["label_en"]),
            value: pick(lang, spec["value_bn"], spec["value_en"]),
          }))}
        />
      ) : null}


      {landingFaqs.length > 0 ? (
        <section className="mx-auto mt-14 max-w-3xl">
          <div className="relative text-center">
            <h2 className="lp-headline text-[28px] leading-[1.2] sm:text-[42px] sm:leading-[1.15]">
              <span className="lp-slant text-gradient-lp inline-block">{tr(lang, "productFaq")}</span>
            </h2>
            <div aria-hidden className="mx-auto mt-3 flex items-center justify-center gap-2">
              <span className="h-px w-12 bg-linear-to-r from-transparent to-accent" />
              <span className="h-2 w-2 rotate-45 bg-linear-to-br from-primary to-accent" />
              <span className="h-px w-12 bg-linear-to-l from-transparent to-accent" />
            </div>
          </div>
          <FaqList items={landingFaqs} className="mt-6" />
        </section>
      ) : null}

      <section id="order" className="mt-12 scroll-mt-24">
        <h2 className="font-display-bn text-center text-2xl leading-snug sm:text-3xl">{tr(lang, "deliveryInfo")}</h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">{tr(lang, "codNote")}</p>
        <div className="mx-auto mt-5 max-w-2xl">
          {stock > 0 ? (
            <CheckoutForm
              items={items}
              rates={rates}
              source="landing"
              compact
              onSetQuantity={(_key, next) => setQty(next)}
            />
          ) : (
            <p className="rounded-sm border border-border bg-secondary px-4 py-3 text-center text-sm font-semibold text-muted-foreground">
              {tr(lang, "outOfStock")}
            </p>
          )}
        </div>
      </section>

      </div>
    </div>

  );
}
