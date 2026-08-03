import { createFileRoute } from "@tanstack/react-router";

import { searchProducts } from "@/lib/catalog.functions";
import type { SearchData } from "@/lib/types";
import { useLang } from "@/lib/language-context";
import { formatNumber, tr } from "@/lib/i18n";
import { ProductGrid } from "@/components/site/product-card";
import { Breadcrumbs, Section } from "@/components/site/ui";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? search["q"] : "",
  }),
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: async ({ deps }): Promise<SearchData> => searchProducts({ data: { q: deps.q } }),
  head: ({ loaderData }) => {
    const term = loaderData?.query ?? "";
    const title = term ? `“${term}” — খোঁজার ফলাফল | উপহারকাব্য` : "পণ্য খুঁজুন | উপহারকাব্য";
    return {
      meta: [
        { title },
        { name: "description", content: "উপহারকাব্যের গিফট কম্বো ক্যাটালগে নাম, ব্র্যান্ড বা এসকেইউ দিয়ে খুঁজুন।" },
        { name: "robots", content: "noindex, follow" },
        { property: "og:title", content: title },
        { property: "og:url", content: "/search" },
      ],
      links: [{ rel: "canonical", href: "/search" }],
    };
  },
  component: SearchPage,
});

function SearchPage() {
  const { lang } = useLang();
  const { query, products } = Route.useLoaderData() as SearchData;

  return (
    <Section>
      <Breadcrumbs items={[{ label: tr(lang, "home"), to: "/" }, { label: tr(lang, "search") }]} />
      <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
        {query ? `“${query}”` : tr(lang, "search")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {formatNumber(lang, products.length)} {tr(lang, "results")}
      </p>
      <div className="mt-8">
        <ProductGrid products={products} />
      </div>
    </Section>
  );
}
