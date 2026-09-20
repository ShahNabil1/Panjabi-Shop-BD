import { createFileRoute } from "@tanstack/react-router";

import { useLang } from "@/lib/language-context";
import { tr } from "@/lib/i18n";
import { useSiteData } from "@/components/site/site-header";
import { Breadcrumbs, Prose, Section } from "@/components/site/ui";
import { SITE_URL } from "@/lib/site";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "আমাদের কথা | About — Panjabi Shop BD" },
      {
        name: "description",
        content:
          "Panjabi Shop BD আধুনিক ডিজাইন, আরামদায়ক কাপড় ও নির্ভরযোগ্য মানের পাঞ্জাবি সরবরাহ করে। আমাদের গল্প ও প্রতিশ্রুতি জানুন।",
      },
      { property: "og:title", content: "আমাদের কথা | About — Panjabi Shop BD" },
      { property: "og:description", content: "মানসম্মত পাঞ্জাবি সহজে পৌঁছে দেওয়াই আমাদের লক্ষ্য।" },
      { property: "og:url", content: `${SITE_URL}/about` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/about` }],
  }),
  component: AboutPage,
});

const BODY = {
  bn: `Panjabi Shop BD শুরু হয়েছিল একটি সহজ লক্ষ্য নিয়ে — মানসম্মত, আরামদায়ক ও রুচিশীল পাঞ্জাবি অনলাইনে সহজে সবার কাছে পৌঁছে দেওয়া।

আমরা কাপড়ের মান, সেলাই, ফিট ও ডিজাইনের দিকে বিশেষ গুরুত্ব দিয়ে প্রতিটি পাঞ্জাবি নির্বাচন করি। উৎসব, অনুষ্ঠান বা দৈনন্দিন পরিধানের জন্য আমাদের কালেকশনে রয়েছে বিভিন্ন রঙ, নকশা ও সাইজ।

পাঠানোর আগে প্রতিটি পণ্যের মান ও প্যাকেজিং যাচাই করা হয়। সারা বাংলাদেশে ক্যাশ অন ডেলিভারি এবং নীতিমালা অনুযায়ী সহজ এক্সচেঞ্জ ও রিটার্ন সুবিধা রয়েছে।`,
  en: `Panjabi Shop BD began with one clear goal: making well-made, comfortable and stylish Panjabis easy to shop online.

We select every Panjabi with close attention to fabric, stitching, fit and design. Our collection covers different colors, patterns and sizes for festivals, occasions and everyday wear.

Every item and its packaging are checked before dispatch. We offer cash on delivery across Bangladesh and straightforward exchanges and returns under our policy.`,
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
          { bn: "আধুনিক পাঞ্জাবি কালেকশন", en: "Modern Panjabi collection" },
          { bn: "যাচাইকৃত কাপড় ও সেলাই", en: "Checked fabric and stitching" },
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
