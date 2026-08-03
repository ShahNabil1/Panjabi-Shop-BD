import { createFileRoute } from "@tanstack/react-router";

import { getFaqPage } from "@/lib/catalog.functions";
import type { FaqData } from "@/lib/types";
import { useLang } from "@/lib/language-context";
import { tr } from "@/lib/i18n";
import { FaqList } from "@/components/site/faq-list";
import { Breadcrumbs, Section } from "@/components/site/ui";

export const Route = createFileRoute("/faq")({
  loader: async (): Promise<FaqData> => getFaqPage(),
  head: ({ loaderData }) => ({
    meta: [
      { title: "সাধারণ প্রশ্নোত্তর | FAQ — তাঁতঘর" },
      {
        name: "description",
        content:
          "ডেলিভারি, পেমেন্ট, রিটার্ন ও পণ্যের মান নিয়ে সবচেয়ে বেশি জিজ্ঞাসিত প্রশ্নের উত্তর।",
      },
      { property: "og:title", content: "সাধারণ প্রশ্নোত্তর | FAQ — তাঁতঘর" },
      { property: "og:description", content: "ডেলিভারি, পেমেন্ট ও রিটার্ন সংক্রান্ত প্রশ্নের উত্তর।" },
      { property: "og:url", content: "/faq" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
    scripts:
      loaderData && loaderData.length > 0
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: loaderData.map((f) => ({
                  "@type": "Question",
                  name: f.question_bn,
                  acceptedAnswer: { "@type": "Answer", text: f.answer_bn },
                })),
              }),
            },
          ]
        : [],
  }),
  component: FaqPage,
});

function FaqPage() {
  const { lang } = useLang();
  const faqs = Route.useLoaderData() as FaqData;

  return (
    <Section className="max-w-3xl">
      <Breadcrumbs items={[{ label: tr(lang, "home"), to: "/" }, { label: tr(lang, "faq") }]} />
      <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{tr(lang, "faq")}</h1>
      <div className="mt-6">
        {faqs.length > 0 ? (
          <FaqList items={faqs} />
        ) : (
          <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-10 text-center text-sm text-muted-foreground">
            {lang === "bn" ? "শীঘ্রই যুক্ত হবে।" : "Coming soon."}
          </p>
        )}
      </div>
    </Section>
  );
}
