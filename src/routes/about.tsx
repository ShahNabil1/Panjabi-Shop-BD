import { createFileRoute } from "@tanstack/react-router";

import { useLang } from "@/lib/language-context";
import { tr } from "@/lib/i18n";
import { useSiteData } from "@/components/site/site-header";
import { Breadcrumbs, Prose, Section } from "@/components/site/ui";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "আমাদের কথা | About — উপহারকাব্য" },
      {
        name: "description",
        content:
          "উপহারকাব্য প্রতিটি উপলক্ষের জন্য যত্নে সাজানো গিফট কম্বো তৈরি করে। আমাদের গল্প, কাজের ধরন ও প্রতিশ্রুতি।",
      },
      { property: "og:title", content: "আমাদের কথা | About — উপহারকাব্য" },
      { property: "og:description", content: "উপহার সাজানোর কাজটা আমরা কবিতার মতো করে করি।" },
      { property: "og:url", content: "https://upoharkabbo.lovable.app/about" },
    ],
    links: [{ rel: "canonical", href: "https://upoharkabbo.lovable.app/about" }],
  }),
  component: AboutPage,
});

const BODY = {
  bn: `উপহারকাব্য শুরু হয়েছিল একটা সহজ ভাবনা থেকে — উপহার শুধু একটা জিনিস নয়, এটা একটা কথা বলার উপায়।

আমরা প্রতিটি গিফট কম্বো নিজেরা সাজাই। কোন উপলক্ষ, কার জন্য, বাজেট কত — এসব মাথায় রেখে পণ্য বাছাই করা হয়, তারপর হাতে মোড়ানো হয় সুন্দর বক্সে, সঙ্গে থাকে আপনার লেখা কার্ড।

পাঠানোর আগে প্রতিটি বক্স হাতে ধরে যাচাই করা হয় — পণ্যের মান, প্যাকেজিং আর মোড়কের নিখুঁততা। পছন্দ না হলে ডেলিভারির ৭ দিনের ভেতর ফেরত দেওয়া যাবে।`,
  en: `Upoharkabbo began with a simple thought — a gift is not just an object, it is a way of saying something.

We build every combo ourselves. The occasion, the person and the budget decide what goes in the box; then it is wrapped by hand and paired with a card in your own words.

Each box is checked by hand before it ships — product quality, packaging and finish. If it is not right, return it within 7 days of delivery.`,
};


export function AboutPage() {
  const { lang } = useLang();
  const { brand, contact } = useSiteData();

  return (
    <Section className="max-w-3xl">
      <Breadcrumbs items={[{ label: tr(lang, "home"), to: "/" }, { label: tr(lang, "about") }]} />
      <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
        {lang === "bn" ? `${brand} সম্পর্কে` : `About ${brand}`}
      </h1>
      <Prose text={BODY[lang]} className="mt-5" />

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { bn: "যত্নে সাজানো গিফট কম্বো", en: "Curated gift combos" },
          { bn: "হাতে যাচাই করা মান", en: "Hand-checked quality" },
          { bn: "৭ দিনের রিটার্ন", en: "7-day returns" },
        ].map((item) => (
          <div key={item.en} className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold">{lang === "bn" ? item.bn : item.en}</p>
          </div>
        ))}
      </div>

      {contact.phone ? (
        <p className="mt-8 text-sm text-muted-foreground">
          {lang === "bn" ? "প্রশ্ন থাকলে কল করুন " : "Questions? Call us at "}
          <a href={`tel:${contact.phone}`} className="font-semibold text-primary">
            {contact.phone}
          </a>
        </p>
      ) : null}
    </Section>
  );
}
