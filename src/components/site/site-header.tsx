import { Link, useLoaderData, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useLang } from "@/lib/language-context";
import type { CategoryWithSubs } from "@/lib/types";
import type { Lang } from "@/lib/i18n";
import { formatNumber, pick, tr } from "@/lib/i18n";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";
import logoMark from "@/assets/upoharkabbo-logo.png";


export type SiteData = {
  lang: Lang;
  categories: CategoryWithSubs[];
  brand: string;
  tagline: string;
  contact: { phone: string; email: string; address: string };
};

export function useSiteData(): SiteData {
  return useLoaderData({ from: "__root__" }) as SiteData;
}

function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div
      className={cn(
        "inline-flex items-center overflow-hidden rounded-sm border border-border/60",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setLang("bn")}
        aria-pressed={lang === "bn"}
        className={cn(
          "px-2 py-0.5 text-xs font-semibold transition-colors",
          lang === "bn" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
        )}
      >
        বাংলা
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
        className={cn(
          "font-en px-2 py-0.5 text-xs font-semibold transition-colors",
          lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
        )}
      >
        EN
      </button>
    </div>
  );
}

function SearchBox({ onDone }: { onDone?: () => void }) {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        if (!term) return;
        onDone?.();
        navigate({ to: "/search", search: { q: term } });
      }}
      className="flex w-full items-center gap-2 rounded-sm border border-border bg-card px-3 py-2"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.2-3.2" strokeLinecap="round" />
      </svg>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={tr(lang, "searchPlaceholder")}
        aria-label={tr(lang, "search")}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        className="shrink-0 rounded-sm bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
      >
        {tr(lang, "search")}
      </button>
    </form>
  );
}

function CartButton({ className }: { className?: string }) {
  const { lang } = useLang();
  const { count, ready, openCart } = useCart();

  return (
    <button
      type="button"
      onClick={() => openCart("cart")}
      aria-label={tr(lang, "cart")}
      className={cn(
        "relative grid h-10 w-10 place-items-center rounded-sm border border-border transition-colors hover:border-primary hover:text-primary",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M3 4h2l2.3 11.2a1.5 1.5 0 0 0 1.5 1.2h8.2a1.5 1.5 0 0 0 1.5-1.2L20 7H6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9.5" cy="20" r="1.2" />
        <circle cx="17.5" cy="20" r="1.2" />
      </svg>
      {ready && count > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
          {formatNumber(lang, count)}
        </span>
      ) : null}
    </button>
  );
}

export function SiteHeader() {

  const { lang } = useLang();
  const { categories, brand, tagline } = useSiteData();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const navLinks = (
    <>
      <Link
        to="/"
        onClick={() => setOpen(false)}
        activeOptions={{ exact: true }}
        activeProps={{ className: "text-primary" }}
        className="py-1 text-sm font-medium transition-colors hover:text-primary"
      >
        {tr(lang, "home")}
      </Link>
      <Link
        to="/offers"
        onClick={() => setOpen(false)}
        activeProps={{ className: "text-primary" }}
        className="py-1 text-sm font-medium transition-colors hover:text-primary"
      >
        {tr(lang, "offers")}
      </Link>
      <Link
        to="/faq"
        onClick={() => setOpen(false)}
        activeProps={{ className: "text-primary" }}
        className="py-1 text-sm font-medium transition-colors hover:text-primary"
      >
        {tr(lang, "faq")}
      </Link>
      <Link
        to="/about"
        onClick={() => setOpen(false)}
        activeProps={{ className: "text-primary" }}
        className="py-1 text-sm font-medium transition-colors hover:text-primary"
      >
        {tr(lang, "about")}
      </Link>
      <Link
        to="/contact"
        onClick={() => setOpen(false)}
        activeProps={{ className: "text-primary" }}
        className="py-1 text-sm font-medium transition-colors hover:text-primary"
      >
        {tr(lang, "contact")}
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="border-b border-border/60 bg-foreground text-background">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-1.5">
          <p className="truncate text-[11px] tracking-wide opacity-90 sm:text-xs">{tagline}</p>
          <LangToggle className="shrink-0 border-background/30" />
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2 px-4 py-3 lg:flex lg:gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={open}
          className="w-fit shrink-0 rounded-sm border border-border p-2 lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            )}
          </svg>
        </button>

        <Link
          to="/"
          className="flex min-w-0 items-center justify-center lg:shrink-0 lg:justify-start"
          aria-label={brand}
        >
          <img
            src={logoMark}
            alt={brand}
            width={1040}
            height={375}
            className="h-12 w-auto max-w-full object-contain xs:h-14 sm:h-16 lg:h-[4.5rem]"
          />
        </Link>

        <div className="ml-auto hidden max-w-md flex-1 lg:block">
          <SearchBox />
        </div>

        <nav className="ml-4 hidden items-center gap-5 lg:flex">{navLinks}</nav>

        <CartButton className="justify-self-end lg:ml-auto lg:shrink-0" />
      </div>



      <div className="mx-auto max-w-6xl px-4 pb-3 lg:hidden">
        <SearchBox />
      </div>

      <div className="hidden border-t border-border/70 bg-surface lg:block">
        <div className="mx-auto flex max-w-6xl items-center gap-6 overflow-x-auto px-4 py-2">
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/c/$category"
              params={{ category: c.slug }}
              activeProps={{ className: "text-primary" }}
              className="whitespace-nowrap text-sm font-medium text-surface-foreground transition-colors hover:text-primary"
            >
              {pick(lang, c.name_bn, c.name_en)}
            </Link>
          ))}
        </div>
      </div>

      {open ? (
        <div className="border-t border-border bg-background lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4">
            <nav className="flex flex-col gap-1">{navLinks}</nav>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {tr(lang, "categories")}
              </p>
              <div className="flex flex-col gap-1">
                {categories.map((c) => (
                  <div key={c.id}>
                    <Link
                      to="/c/$category"
                      params={{ category: c.slug }}
                      onClick={() => setOpen(false)}
                      className="block py-1 text-sm font-medium"
                    >
                      {pick(lang, c.name_bn, c.name_en)}
                    </Link>
                    {c.subcategories.length > 0 ? (
                      <div className="ml-3 flex flex-col border-l border-border pl-3">
                        {c.subcategories.map((s) => (
                          <Link
                            key={s.id}
                            to="/c/$category/$subcategory"
                            params={{ category: c.slug, subcategory: s.slug }}
                            onClick={() => setOpen(false)}
                            className="py-1 text-sm text-muted-foreground"
                          >
                            {pick(lang, s.name_bn, s.name_en)}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
