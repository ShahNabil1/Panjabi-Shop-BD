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
      { title: "উপহারকাব্য — গিফট কম্বো ও উপহার সামগ্রীর অনলাইন শপ" },
      {
        name: "description",
        content:
          "জন্মদিন, বিবাহবার্ষিকী কিংবা কর্পোরেট — প্রতিটি উপলক্ষের জন্য সাজানো গিফট কম্বো ও উপহার বক্স। সারা দেশে ক্যাশ অন ডেলিভারি।",
      },
      { property: "og:title", content: "উপহারকাব্য — গিফট কম্বো ও উপহার সামগ্রীর অনলাইন শপ" },
      {
        property: "og:description",
        content: "প্রতিটি উপলক্ষের জন্য যত্নে সাজানো গিফট কম্বো। সারা দেশে ক্যাশ অন ডেলিভারি।",
      },
      { property: "og:url", content: "https://upoharkabbo.lovable.app/" },
      { property: "og:image", content: "https://upoharkabbo.lovable.app/og-image.jpg" },
      { name: "twitter:image", content: "https://upoharkabbo.lovable.app/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://upoharkabbo.lovable.app/" }],
  }),
  component: HomePage,
});

const HERO_POINTS = [
  { bn: "যত্নে সাজানো গিফট বক্স", en: "Curated gift boxes" },
  { bn: "ফ্রি উপহার মোড়ক ও কার্ড", en: "Free wrapping & card" },
  { bn: "সারা দেশে ডেলিভারি", en: "Nationwide delivery" },
];

function HomePage() {
  const { lang } = useLang();
  const data = Route.useLoaderData() as HomeData;

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-surface">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-3.5 py-1.5 text-xs font-semibold text-accent-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {tr(lang, "cod")}
            </span>
            <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[3.25rem]">
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
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
              {lang === "bn"
                ? "জন্মদিন, বিবাহবার্ষিকী, ঈদ কিংবা কর্পোরেট — প্রতিটি উপলক্ষের জন্য হাতে বাছাই করা গিফট কম্বো ও উপহার বক্স, সুন্দর মোড়কে সাজিয়ে পাঠানো হয়।"
                : "Birthdays, anniversaries, Eid or corporate — hand-picked gift combos and boxes, wrapped beautifully and sent ready to give."}
            </p>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {HERO_POINTS.map((point) => (
                <li key={point.en} className="flex items-center gap-2">
                  <svg viewBox="0 0 20 20" className="h-4 w-4 text-primary" fill="currentColor">
                    <path d="M8.2 13.6 5 10.4l1.2-1.2 2 2 5.6-5.6L15 6.8z" />
                  </svg>
                  {pick(lang, point.bn, point.en)}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
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

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {data.featured.slice(0, 4).map((p, i) => (
              <Link
                key={p.id}
                to="/p/$product"
                params={{ product: p.slug }}
                className={`overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-transform hover:-translate-y-1 ${
                  i % 3 === 0 ? "aspect-4/5" : "aspect-square"
                }`}
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
