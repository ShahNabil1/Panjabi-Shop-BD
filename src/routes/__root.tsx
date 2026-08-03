import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  useRouterState,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { getLayoutData } from "../lib/catalog.functions";
import { getLang } from "../lib/lang.functions";
import { LanguageProvider, useLang } from "../lib/language-context";
import { tr } from "../lib/i18n";
import { SiteHeader } from "../components/site/site-header";
import { SiteFooter } from "../components/site/site-footer";
import { NotFoundView } from "../components/site/not-found-view";
import { CartProvider } from "../lib/cart-context";
import { AuthProvider } from "../lib/auth-context";
import { Toaster } from "../components/ui/sonner";

function str(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async () => {
    const [lang, layout] = await Promise.all([getLang(), getLayoutData()]);
    const general = layout.settings["general"] ?? {};
    const contactSetting = layout.settings["contact"] ?? {};

    return {
      lang,
      categories: layout.categories,
      brand: str(general["brand_name"], "তাঁতঘর"),
      tagline: str(general["tagline"], "সারা দেশে ক্যাশ অন ডেলিভারি · ৪৮ ঘণ্টায় ডেলিভারি"),
      contact: {
        phone: str(contactSetting["phone"], ""),
        email: str(contactSetting["email"], ""),
        address: str(contactSetting["address"], ""),
      },
    };
  },
  head: ({ loaderData }) => {
    const brand = loaderData?.brand ?? "তাঁতঘর";
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: brand },
        { property: "og:site_name", content: brand },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "theme-color", content: "#fbf8f3" },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: RootNotFound,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="bn">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Chrome({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const bare = pathname.startsWith("/admin") || pathname.startsWith("/auth");

  if (bare) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { lang } = Route.useLoaderData();

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider initialLang={lang}>
        <AuthProvider>
          <CartProvider>
            <Chrome>
              {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
              <Outlet />
            </Chrome>
            <Toaster position="top-center" richColors closeButton />
          </CartProvider>
        </AuthProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

function RootNotFound() {
  return <NotFoundView />;
}

function ErrorBody({ error, reset }: { error: Error; reset: () => void }) {
  const { lang } = useLang();
  const router = useRouter();

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{tr(lang, "errorTitle")}</h1>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{tr(lang, "errorBody")}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="rounded-sm bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {tr(lang, "tryAgain")}
        </button>
        <a
          href="/"
          className="rounded-sm border border-border bg-card px-5 py-2.5 text-sm font-semibold"
        >
          {tr(lang, "backHome")}
        </a>
      </div>
      <p className="sr-only">{error.message}</p>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col">
      <ErrorBody error={error} reset={reset} />
    </div>
  );
}
