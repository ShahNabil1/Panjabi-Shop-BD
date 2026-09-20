import { Link, useLoaderData, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { useLang } from "@/lib/language-context";
import type { CategoryWithSubs } from "@/lib/types";
import type { Lang } from "@/lib/i18n";
import { formatNumber, formatPrice, pick, tr } from "@/lib/i18n";
import { useCart } from "@/lib/cart-context";
import { cn } from "@/lib/utils";
import { searchProducts } from "@/lib/catalog.functions";
import type { ProductCard } from "@/lib/supabase-public";
import { SmartImage } from "@/components/site/smart-image";
import logoMark from "@/assets/panjabishopbd-logo.png";


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
        className="shrink-0 rounded-sm bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95"
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
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function SiteHeader() {

  const { lang } = useLang();
  const { categories, brand } = useSiteData();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLanding = pathname.startsWith("/lp/");
  const isCheckout = pathname === "/checkout";

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
        className="group relative py-1 text-sm font-medium transition-colors hover:text-primary"
      >
        {tr(lang, "home")}
        <span className="absolute -bottom-0.5 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
      </Link>
      <Link
        to="/offers"
        onClick={() => setOpen(false)}
        activeProps={{ className: "text-primary" }}
        className="group relative py-1 text-sm font-medium transition-colors hover:text-primary"
      >
        {tr(lang, "offers")}
        <span className="absolute -bottom-0.5 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
      </Link>
      <Link
        to="/faq"
        onClick={() => setOpen(false)}
        activeProps={{ className: "text-primary" }}
        className="group relative py-1 text-sm font-medium transition-colors hover:text-primary"
      >
        {tr(lang, "faq")}
        <span className="absolute -bottom-0.5 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
      </Link>
      <Link
        to="/about"
        onClick={() => setOpen(false)}
        activeProps={{ className: "text-primary" }}
        className="group relative py-1 text-sm font-medium transition-colors hover:text-primary"
      >
        {tr(lang, "about")}
        <span className="absolute -bottom-0.5 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
      </Link>
      <Link
        to="/contact"
        onClick={() => setOpen(false)}
        activeProps={{ className: "text-primary" }}
        className="group relative py-1 text-sm font-medium transition-colors hover:text-primary"
      >
        {tr(lang, "contact")}
        <span className="absolute -bottom-0.5 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
      </Link>
    </>
  );

  if (isLanding) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">

      <div
        className={cn(
          "mx-auto grid max-w-6xl items-center gap-2 px-4 py-3 lg:flex lg:gap-3",
          isLanding ? "grid-cols-1" : "grid-cols-[3rem_minmax(0,1fr)_3rem]",
        )}
      >
        {isLanding ? null : (
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
        )}

        {isLanding ? (
          <a
            href={pathname}
            onClick={(e) => {
              e.preventDefault();
              window.location.reload();
            }}
            className="flex min-w-0 items-center justify-center lg:justify-center"
            aria-label={brand}
          >
            <img
              src={logoMark}
              alt={brand}
              width={1040}
              height={375}
              className="h-12 w-auto max-w-full object-contain min-[380px]:h-14 sm:h-16 lg:h-[4.5rem]"
            />
          </a>
        ) : (
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
              className="h-12 w-auto max-w-full object-contain min-[380px]:h-14 sm:h-16 lg:h-[4.5rem]"
            />
          </Link>
        )}

        {isLanding ? null : (
          <>
            <div className="ml-auto hidden max-w-md flex-1 lg:block">
              <SearchBox />
            </div>

            <nav className="ml-4 hidden items-center gap-5 lg:flex">{navLinks}</nav>

            <CartButton className="justify-self-end lg:ml-auto lg:shrink-0" />
          </>
        )}
      </div>

      {isLanding ? null : (
        <div className={cn("mx-auto max-w-6xl px-4 pb-3 lg:hidden", isCheckout && "hidden")}>
          <SearchBox />
        </div>
      )}


      <div className="hidden border-t border-secondary-foreground/10 bg-secondary text-secondary-foreground lg:block">
        <div className="mx-auto flex max-w-6xl items-center gap-6 overflow-x-auto px-4 py-2">
          {categories
            .filter((c) => c.show_in_header)
            .map((c) => (
            <Link
              key={c.id}
              to="/c/$category"
              params={{ category: c.slug }}
              activeProps={{ className: "text-primary" }}
              className="group relative whitespace-nowrap text-sm font-medium text-secondary-foreground transition-all duration-200 hover:scale-105 hover:text-primary active:scale-95"
            >
              {pick(lang, c.name_bn, c.name_en)}
              <span className="absolute -bottom-0.5 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
          <Link
            to="/categories"
            activeProps={{ className: "text-primary" }}
            className="group relative ml-auto whitespace-nowrap text-sm font-semibold text-primary transition-all duration-200 hover:scale-105 active:scale-95"
          >
            {tr(lang, "allCategories")}
            <span className="absolute -bottom-0.5 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
          </Link>
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
                <Link
                  to="/categories"
                  onClick={() => setOpen(false)}
                  className="block py-1 text-sm font-semibold text-primary"
                >
                  {tr(lang, "allCategories")}
                </Link>
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
