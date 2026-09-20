import { useLang } from "@/lib/language-context";
import { tr } from "@/lib/i18n";
import type { LegalPageContent } from "@/lib/legal-content";
import { RichText } from "@/components/site/rich-text";
import { Breadcrumbs, Section } from "@/components/site/ui";

export function LegalPage({ page }: { page: LegalPageContent }) {
  const { lang } = useLang();
  return (
    <Section className="max-w-3xl">
      <Breadcrumbs items={[{ label: tr(lang, "home"), to: "/" }, { label: page.title }]} />
      <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{page.title}</h1>
      <RichText html={page.content} className="mt-6" />
    </Section>
  );
}