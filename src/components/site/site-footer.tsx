import { Link } from "@tanstack/react-router";
import { Phone, Mail, MapPin } from "lucide-react";

import { useLang } from "@/lib/language-context";
import { tr } from "@/lib/i18n";
import { useSiteData } from "./site-header";
import logoMark from "@/assets/upoharkabbo-logo.png";
import { SOCIAL_LINKS } from "./social-links";
import { cn } from "@/lib/utils";

export function SiteFooter() {
  const { lang } = useLang();
  const { brand, contact } = useSiteData();

  return (
    <footer className="mt-16 border-t border-border bg-footer">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
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


          <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
            <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
            Follow us on
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {SOCIAL_LINKS.filter(({ key }) => key !== "phone").map(({ key, href, label, icon: Icon, colorClass }) => (
              <a
                key={key}
                href={href}
                target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                aria-label={label}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary transition-all hover:scale-110 hover:bg-primary hover:text-primary-foreground",
                  colorClass,
                )}
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-base font-bold text-primary">Important Links</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <Link to="/about" className="text-sm text-foreground/80 hover:text-primary">
                {tr(lang, "about")}
              </Link>
            </li>
            <li>
              <Link to="/faq" className="text-sm text-foreground/80 hover:text-primary">
                {tr(lang, "faq")}
              </Link>
            </li>
            <li>
              <Link to="/offers" className="text-sm text-foreground/80 hover:text-primary">
                {tr(lang, "offers")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-base font-bold text-primary">Legal</h2>
          <ul className="mt-3 space-y-2">
            <li>
              <span className="cursor-default text-sm text-foreground/80 hover:text-primary">
                Privacy Policy
              </span>
            </li>
            <li>
              <span className="cursor-default text-sm text-foreground/80 hover:text-primary">
                Terms & Conditions
              </span>
            </li>
            <li>
              <span className="cursor-default text-sm text-foreground/80 hover:text-primary">
                Return Policy
              </span>
            </li>
          </ul>
        </div>

        <div className="min-w-0">
          <h2 className="text-base font-bold text-primary">{tr(lang, "contact")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-foreground/80">
            {contact.phone ? (
              <li className="flex items-center gap-2 truncate">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <a href={`tel:${contact.phone}`} className="hover:text-primary">
                  {contact.phone}
                </a>
              </li>
            ) : null}
            {contact.email ? (
              <li className="flex items-center gap-2 truncate">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <a href={`mailto:${contact.email}`} className="font-en hover:text-primary">
                  {contact.email}
                </a>
              </li>
            ) : null}
            {contact.address ? (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="hover:text-primary">{contact.address}</span>
              </li>
            ) : null}
            <li className="pt-2">
              <span className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-2 text-center text-xs font-bold text-primary-foreground shadow-sm sm:flex-row sm:gap-2 sm:px-3 sm:text-sm">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20 text-xs">✓</span>
                <span>সম্পূর্ণ ক্যাশ অন ডেলিভারি</span>
              </span>
            </li>
            <li className="pt-1">
              <span className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-primary bg-primary/5 px-2 py-2 text-center text-xs font-bold text-primary sm:flex-row sm:gap-2 sm:px-3 sm:text-sm">
                <span className="shrink-0 animate-pulse text-base sm:text-sm">🚚</span>
                <span>সারা বাংলাদেশে ফ্রী ডেলিভারি</span>
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-primary py-3">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-1 px-4 text-sm font-semibold text-primary-foreground sm:flex-row">
          <p>© 2026 Upoharkabbo. All Rights Reserved.</p>
          <p>
            Design & Developed By{" "}
            <a
              href="https://shahnabil.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline underline-offset-2 transition-opacity hover:opacity-80"
            >
              Shahriar Nabil
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
