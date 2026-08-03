import { Link, createFileRoute } from "@tanstack/react-router";

import { getHomeData } from "@/lib/catalog.functions";
import type { HomeData } from "@/lib/types";
import { useLang } from "@/lib/language-context";
import { pick, tr } from "@/lib/i18n";
import { ProductGrid, ProductThumb } from "@/components/site/product-card";
import { FaqList } from "@/components/site/faq-list";
import { Section } from "@/components/site/ui";

export const Route = createFileRoute("/")({
  loader: async (): Promise<HomeData> => getHomeData(),
  head: () => ({
    meta: [
      { title: "তাঁতঘর — দেশীয় তাঁতের পোশাক ও ঘর সাজানোর সামগ্রী" },
      {
        name: "description",
        content:
          "বাংলাদেশের তাঁতিদের হাতে বোনা শাড়ি, পাঞ্জাবি ও ঘর সাজানোর সামগ্রী। সারা দেশে ক্যাশ অন ডেলিভারি।",
      },
      { property: "og:title", content: "তাঁতঘর — দেশীয় তাঁতের পোশাক ও ঘর সাজানোর সামগ্রী" },
      {
        property: "og:description",
        content: "হাতে বোনা দেশীয় পণ্য, সরাসরি তাঁতির কাছ থেকে। ক্যাশ অন ডেলিভারি সারা দেশে।",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

function HomePage() {
  const { lang } = useLang();
  const data = Route.useLoaderData() as HomeData;

  return (
    <>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="min-w-0">
            <span className="inline-block rounded-sm border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {tr(lang, "cod")}
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              {lang === "bn"
                ? "তাঁতির হাতে বোনা, আপনার ঘরে পৌঁছে দেওয়া"
                : "Handwoven by artisans, delivered to your door"}
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-muted-foreground">
              {lang === "bn"
                ? "সিরাজগঞ্জ, টাঙ্গাইল আর নরসিংদীর তাঁতিদের কাছ থেকে সরাসরি সংগ্রহ করা পণ্য। কোনো মধ্যস্বত্বভোগী নেই, তাই দামও কম।"
                : "Sourced straight from weaving families in Sirajganj, Tangail and Narsingdi. No middlemen, so the price stays fair."}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {data.categories[0] ? (
                <Link
                  to="/c/$category"
                  params={{ category: data.categories[0].slug }}
                  className="rounded-sm bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {tr(lang, "shopNow")}
                </Link>
              ) : null}
              <Link
                to="/offers"
                className="rounded-sm border border-border bg-card px-6 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
              >
                {tr(lang, "offers")}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {data.featured.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                to="/p/$product"
                params={{ product: p.slug }}
                className="aspect-square overflow-hidden rounded-lg border border-border bg-card"
              >
                <ProductThumb
                  src={p.image}
                  alt={pick(lang, p.nameBn, p.nameEn)}
                  label={pick(lang, p.nameBn, p.nameEn)}
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Section title={tr(lang, "allCategories")}>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {data.categories.map((c) => (
            <Link
              key={c.id}
              to="/c/$category"
              params={{ category: c.slug }}
              className="group overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-[var(--shadow-card)]"
            >
              <div className="aspect-16/10 overflow-hidden bg-secondary">
                <ProductThumb
                  src={c.image_url}
                  alt={pick(lang, c.name_bn, c.name_en)}
                  label={pick(lang, c.name_bn, c.name_en)}
                  className="transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-3.5">
                <h3 className="text-[15px] font-semibold">{pick(lang, c.name_bn, c.name_en)}</h3>
                {c.subcategories.length > 0 ? (
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {c.subcategories.map((s) => pick(lang, s.name_bn, s.name_en)).join(" · ")}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {data.promotions.map((promo) => (
        <Section
          key={promo.id}
          title={pick(lang, promo.titleBn, promo.titleEn)}
          description={pick(lang, promo.subtitleBn, promo.subtitleEn) || undefined}
          action={
            <Link
              to="/offers/$promotion"
              params={{ promotion: promo.slug }}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {tr(lang, "viewAll")}
            </Link>
          }
        >
          <ProductGrid products={promo.products.slice(0, 4)} />
        </Section>
      ))}

      <Section title={tr(lang, "popular")}>
        <ProductGrid products={data.featured.slice(0, 8)} />
      </Section>

      {data.faqs.length > 0 ? (
        <Section title={tr(lang, "faq")}>
          <FaqList items={data.faqs} />
        </Section>
      ) : null}
    </>
  );
}
