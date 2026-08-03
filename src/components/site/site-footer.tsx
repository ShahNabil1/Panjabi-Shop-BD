import { Link } from "@tanstack/react-router";

import { useLang } from "@/lib/language-context";
import { pick, tr } from "@/lib/i18n";
import { useSiteData } from "./site-header";
import logoMark from "@/assets/upoharkabbo-logo.png";

export function SiteFooter() {
  const { lang } = useLang();
  const { categories, brand, tagline, contact } = useSiteData();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <img
              src={logoMark}
              alt={brand}
              loading="lazy"
              width={36}
              height={36}
              className="h-8 w-8 shrink-0 object-contain"
            />
            <span className="truncate text-base font-bold">{brand}</span>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tagline}</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold">{tr(lang, "categories")}</h2>
          <ul className="mt-3 space-y-2">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  to="/c/$category"
                  params={{ category: c.slug }}
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  {pick(lang, c.name_bn, c.name_en)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold">{lang === "bn" ? "তথ্য" : "Information"}</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <Link to="/about" className="text-sm text-muted-foreground hover:text-primary">
                {tr(lang, "about")}
              </Link>
            </li>
            <li>
              <Link to="/faq" className="text-sm text-muted-foreground hover:text-primary">
                {tr(lang, "faq")}
              </Link>
            </li>
            <li>
              <Link to="/offers" className="text-sm text-muted-foreground hover:text-primary">
                {tr(lang, "offers")}
              </Link>
            </li>
            <li>
              <Link to="/contact" className="text-sm text-muted-foreground hover:text-primary">
                {tr(lang, "contact")}
              </Link>
            </li>
          </ul>
        </div>

        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{tr(lang, "contact")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {contact.phone ? (
              <li className="truncate">
                <a href={`tel:${contact.phone}`} className="hover:text-primary">
                  {contact.phone}
                </a>
              </li>
            ) : null}
            {contact.email ? (
              <li className="truncate">
                <a href={`mailto:${contact.email}`} className="font-en hover:text-primary">
                  {contact.email}
                </a>
              </li>
            ) : null}
            {contact.address ? <li>{contact.address}</li> : null}
            <li className="pt-1 font-medium text-foreground">{tr(lang, "cod")}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-muted-foreground">
          © {year} {brand}. {lang === "bn" ? "সর্বস্বত্ব সংরক্ষিত।" : "All rights reserved."}
        </p>
      </div>
    </footer>
  );
}
