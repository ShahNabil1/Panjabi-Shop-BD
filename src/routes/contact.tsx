import { createFileRoute } from "@tanstack/react-router";

import { useLang } from "@/lib/language-context";
import { tr } from "@/lib/i18n";
import { useSiteData } from "@/components/site/site-header";
import { Breadcrumbs, Section } from "@/components/site/ui";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "যোগাযোগ | Contact — তাঁতঘর" },
      {
        name: "description",
        content: "অর্ডার, ডেলিভারি বা পণ্য সংক্রান্ত যেকোনো প্রশ্নে ফোন, ইমেইল বা হোয়াটসঅ্যাপে যোগাযোগ করুন।",
      },
      { property: "og:title", content: "যোগাযোগ | Contact — তাঁতঘর" },
      { property: "og:description", content: "ফোন, ইমেইল বা সরাসরি দোকানে যোগাযোগ করুন।" },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { lang } = useLang();
  const { brand, contact } = useSiteData();

  const rows = [
    contact.phone
      ? { label: lang === "bn" ? "ফোন" : "Phone", value: contact.phone, href: `tel:${contact.phone}` }
      : null,
    contact.email
      ? {
          label: lang === "bn" ? "ইমেইল" : "Email",
          value: contact.email,
          href: `mailto:${contact.email}`,
        }
      : null,
    contact.address
      ? { label: lang === "bn" ? "ঠিকানা" : "Address", value: contact.address, href: null }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string; href: string | null }>;

  return (
    <Section className="max-w-3xl">
      <Breadcrumbs items={[{ label: tr(lang, "home"), to: "/" }, { label: tr(lang, "contact") }]} />
      <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{tr(lang, "contact")}</h1>
      <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
        {lang === "bn"
          ? `${brand}-এর সাপোর্ট টিম প্রতিদিন সকাল ১০টা থেকে রাত ৮টা পর্যন্ত পাওয়া যাবে।`
          : `The ${brand} support team is available every day from 10am to 8pm.`}
      </p>

      <dl className="mt-6 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)] gap-3 px-4 py-4">
            <dt className="min-w-0 text-sm text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0 text-sm font-medium break-words">
              {row.href ? (
                <a href={row.href} className="text-primary hover:underline">
                  {row.value}
                </a>
              ) : (
                row.value
              )}
            </dd>
          </div>
        ))}
        <div className="grid grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)] gap-3 px-4 py-4">
          <dt className="min-w-0 text-sm text-muted-foreground">
            {lang === "bn" ? "পেমেন্ট" : "Payment"}
          </dt>
          <dd className="min-w-0 text-sm font-medium">{tr(lang, "cod")}</dd>
        </div>
      </dl>
    </Section>
  );
}
