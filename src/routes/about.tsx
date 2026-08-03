import { createFileRoute } from "@tanstack/react-router";

import { useLang } from "@/lib/language-context";
import { tr } from "@/lib/i18n";
import { useSiteData } from "@/components/site/site-header";
import { Breadcrumbs, Prose, Section } from "@/components/site/ui";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "আমাদের কথা | About — তাঁতঘর" },
      {
        name: "description",
        content:
          "তাঁতঘর সরাসরি তাঁতি পরিবারের কাছ থেকে পণ্য সংগ্রহ করে। আমাদের গল্প, কাজের ধরন ও প্রতিশ্রুতি।",
      },
      { property: "og:title", content: "আমাদের কথা | About — তাঁতঘর" },
      { property: "og:description", content: "সরাসরি তাঁতির কাছ থেকে, ন্যায্য দামে।" },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

const BODY = {
  bn: `তাঁতঘর শুরু হয়েছিল একটা সহজ প্রশ্ন থেকে — তাঁতির হাতে বোনা একটা শাড়ি ঢাকার দোকানে পৌঁছাতে দাম তিনগুণ হয়ে যায় কেন?

আমরা সিরাজগঞ্জ, টাঙ্গাইল ও নরসিংদীর তাঁতি পরিবারের সঙ্গে সরাসরি কাজ করি। কোনো মধ্যস্বত্বভোগী নেই, তাই তাঁতি ন্যায্য দাম পান আর আপনি কম দামে আসল পণ্য পান।

প্রতিটি পণ্য পাঠানোর আগে হাতে ধরে যাচাই করা হয় — সুতার মান, রঙের স্থায়িত্ব আর বুননের নিখুঁততা। পছন্দ না হলে ডেলিভারির ৭ দিনের ভেতর ফেরত দেওয়া যাবে।`,
  en: `Tantghor started with one question — why does a handwoven saree cost three times more by the time it reaches a Dhaka shop?

We work directly with weaving families in Sirajganj, Tangail and Narsingdi. No middlemen, so the weaver earns fairly and you pay less for the real thing.

Every parcel is checked by hand before it ships — yarn quality, colour fastness and weave consistency. If it is not right, return it within 7 days of delivery.`,
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
          { bn: "সরাসরি তাঁতির কাছ থেকে", en: "Straight from the weaver" },
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
