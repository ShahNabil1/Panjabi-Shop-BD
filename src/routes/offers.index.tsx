import { Link, createFileRoute } from "@tanstack/react-router";

import { getPromotions } from "@/lib/catalog.functions";
import type { PromotionListData } from "@/lib/types";
import { useLang } from "@/lib/language-context";
import { pick, tr } from "@/lib/i18n";
import { ProductThumb } from "@/components/site/product-card";
import { Breadcrumbs, Section } from "@/components/site/ui";
import { absoluteUrl } from "@/lib/site";


export const Route = createFileRoute("/offers/")({
  loader: async (): Promise<PromotionListData> => getPromotions(),
  head: ({ loaderData }) => {
    const empty = (loaderData ?? []).length === 0;
    const url = absoluteUrl("/offers");
    return {
      meta: [
        { title: "অফার ও ক্যাম্পেইন | Offers — Panjabi Shop BD" },
        {
          name: "description",
          content:
            "চলমান সব অফার, ফ্ল্যাশ সেল আর নতুন কালেকশন এক জায়গায়। ক্যাশ অন ডেলিভারি সারা দেশে।",
        },
        { property: "og:title", content: "অফার ও ক্যাম্পেইন | Offers — Panjabi Shop BD" },
        { property: "og:description", content: "চলমান সব অফার আর নতুন কালেকশন এক জায়গায়।" },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
        // No running offers = empty page; keep it out of the index until it has content.
        ...(empty ? [{ name: "robots", content: "noindex, follow" }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },

  component: OffersPage,
});

function OffersPage() {
  const { lang } = useLang();
  const promotions = Route.useLoaderData() as PromotionListData;

  return (
    <Section>
      <Breadcrumbs items={[{ label: tr(lang, "home"), to: "/" }, { label: tr(lang, "offers") }]} />
      <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{tr(lang, "offers")}</h1>

      {promotions.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-muted-foreground">
          {lang === "bn" ? "এই মুহূর্তে কোনো অফার চলছে না।" : "No running offers right now."}
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {promotions.map((p) => (
            <Link
              key={p.id}
              to="/offers/$promotion"
              params={{ promotion: p.slug }}
              className="group overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-[var(--shadow-card)]"
            >
              <div className="aspect-16/7 overflow-hidden bg-secondary">
                <ProductThumb
                  src={p.banner_url}
                  alt={pick(lang, p.title_bn, p.title_en)}
                  label={pick(lang, p.title_bn, p.title_en)}
                  className="transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <h2 className="text-base font-semibold">{pick(lang, p.title_bn, p.title_en)}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pick(lang, p.subtitle_bn, p.subtitle_en)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Section>
  );
}
