import { Link } from "@tanstack/react-router";

import { useLang } from "@/lib/language-context";
import { tr } from "@/lib/i18n";
import { useSiteData } from "./site-header";
import logoMark from "@/assets/upoharkabbo-logo.png";
import { SOCIAL_LINKS } from "./social-links";
import { cn } from "@/lib/utils";

export function SiteFooter() {
  const { lang } = useLang();
  const { brand, contact } = useSiteData();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-border bg-footer">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
        <div className="min-w-0">
          <div className="flex items-center">
            <img
              src={logoMark}
              alt={brand}
              loading="lazy"
              width={1040}
              height={375}
              className="h-16 w-auto shrink-0 object-contain sm:h-20"
            />
          </div>


          <p className="mt-3 text-sm font-medium leading-relaxed text-foreground">
            Follow us on
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {SOCIAL_LINKS.map(({ key, href, label, icon: Icon, colorClass }) => (
              <a
                key={key}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                aria-label={label}
                className={cn(
                  "flex items-center justify-center p-1 transition-transform hover:scale-110",
                  colorClass,
                )}
              >
                <Icon className="h-6 w-6" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold">About Upoharkabbo</h2>
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
