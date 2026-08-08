import { Link, createFileRoute } from "@tanstack/react-router";

import { getHomeData } from "@/lib/catalog.functions";
import type { HomeData } from "@/lib/types";
import { useLang } from "@/lib/language-context";
import { pick, tr } from "@/lib/i18n";
import { ProductGrid, ProductThumb } from "@/components/site/product-card";
import { FaqList } from "@/components/site/faq-list";
import { HeroSlider, readHeroSlides } from "@/components/site/hero-slider";

import { Section } from "@/components/site/ui";

export const Route = createFileRoute("/")({
  loader: async (): Promise<HomeData> => getHomeData(),
  head: () => ({
    meta: [
      { title: "উপহারকাব্য — গিফট কম্বো ও উপহার সামগ্রীর অনলাইন শপ" },
      {
        name: "description",
        content:
          "জন্মদিন, বিবাহবার্ষিকী কিংবা কর্পোরেট — প্রতিটি উপলক্ষের জন্য সাজানো গিফট কম্বো ও উপহার বক্স। সারা দেশে ক্যাশ অন ডেলিভারি।",
      },
      { property: "og:title", content: "উপহারকাব্য — গিফট কম্বো ও উপহার সামগ্রীর অনলাইন শপ" },
      {
        property: "og:description",
        content: "জন্মদিন, বিবাহবার্ষিকী কিংবা কর্পোরেট — প্রতিটি উপলক্ষের জন্য সাজানো গিফট কম্বো ও উপহার বক্স। সারা দেশে ক্যাশ অন ডেলিভারি।",
      },
      { property: "og:url", content: "https://upoharkabbo.lovable.app/" },
      { property: "og:image", content: "https://upoharkabbo.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://upoharkabbo.lovable.app/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://upoharkabbo.lovable.app/" }],
  }),
  component: HomePage,
});

function HomePage() {
  const { lang } = useLang();
  const data = Route.useLoaderData() as HomeData;
  const slides = readHeroSlides(data.settings["hero"]);

  return (
    <>
      {slides.length > 0 ? (
        <HeroSlider slides={slides} />
      ) : (
        <section className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-12 text-center sm:items-start sm:py-16 sm:text-left">
            <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">

              {lang === "bn" ? (
                <>
                  উপহার হোক <span className="text-primary">একটা কবিতার মতো</span>
                </>
              ) : (
                <>
                  Let every gift read <span className="text-primary">like a poem</span>
                </>
              )}
            </h1>
            <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
              {data.categories[0] ? (
                <Link
                  to="/c/$category"
                  params={{ category: data.categories[0].slug }}
                  className="rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)] transition-opacity hover:opacity-90"
                >
                  {tr(lang, "shopNow")}
                </Link>
              ) : null}
              <Link
                to="/offers"
                className="rounded-full border border-border bg-card px-7 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
              >
                {tr(lang, "offers")}
              </Link>
            </div>
          </div>
        </section>
      )}



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
              <div className="p-3.5 text-center sm:text-left">
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
        <Section>
          <div className="mb-8 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Help Center
            </span>
            <h2 className="mx-auto mt-3 max-w-full text-xl font-bold tracking-tight text-primary min-[380px]:text-2xl sm:text-3xl">
              Frequently asked questions
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-balance px-2 text-sm font-semibold leading-6 text-muted-foreground lg:max-w-none lg:whitespace-nowrap">
              Everything you need to know about shopping, delivery and payments on Upoharkabbo.
            </p>
          </div>
          <FaqList items={data.faqs} />
        </Section>
      ) : null}
    </>
  );
}
