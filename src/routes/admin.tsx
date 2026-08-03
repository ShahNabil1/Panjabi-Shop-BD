import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  BadgePercent,
  Boxes,
  ChevronLeft,
  ExternalLink,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Package,
  PlusCircle,

  Rocket,
  Settings,
  ShoppingCart,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { checkIsAdmin } from "@/lib/admin.functions";
import { BrandLoader } from "@/components/admin/brand-loader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logoMark from "@/assets/upoharkabbo-logo.png";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Upoharkabbo" },
      { name: "description", content: "Manage products, orders and content." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin Dashboard — Upoharkabbo" },
      { property: "og:description", content: "Store management panel." },
    ],
  }),
  component: AdminLayout,
});

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };

const sections: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Overview",
    items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    title: "Catalog",
    items: [
      { to: "/admin/products", label: "Products", icon: Package },
      { to: "/admin/taxonomy", label: "Categories", icon: Boxes },
    ],
  },
  {
    title: "Orders",
    items: [
      { to: "/admin/orders/create", label: "Create Order", icon: PlusCircle },
      { to: "/admin/orders", label: "Order List", icon: ShoppingCart, exact: true },
    ],
  },
  {
    title: "Sales",
    items: [{ to: "/admin/promotions", label: "Promotions", icon: BadgePercent }],
  },

  {
    title: "Content",
    items: [
      { to: "/admin/landing", label: "Landing Pages", icon: Rocket },
      { to: "/admin/faqs", label: "FAQs", icon: HelpCircle },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

function AdminLayout() {
  const { session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("admin-sidebar-collapsed");
    if (saved === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("admin-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const isAdmin = useQuery({
    queryKey: ["is-admin", session?.user.id ?? null],
    queryFn: () => checkIsAdmin(),
    enabled: Boolean(session),
  });

  if (loading || !session || isAdmin.isLoading) {
    return (
      <div className="admin-scope flex min-h-[70vh] flex-col items-center justify-center bg-background">
        <BrandLoader size="lg" message="Loading dashboard…" />
      </div>
    );
  }

  if (isAdmin.data === false) {
    return (
      <div className="admin-scope mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="ig-text text-2xl font-bold">No access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This account does not have the admin role. Add an admin role in the{" "}
          <code>user_roles</code> table and try again.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={() => void signOut()}>
            Sign out
          </Button>
          <Button asChild>
            <Link to="/">Back to site</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.to : pathname.startsWith(item.to);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex min-h-[5.5rem] items-center justify-center px-3 py-5">
        <Link
          to="/"
          title="Upoharkabbo"
          className={cn("shrink-0 transition-all duration-300", collapsed ? "block" : "hidden")}
        >
          <img
            src="/favicon.png"
            alt="Upoharkabbo"
            className="size-14 rounded-full bg-white object-contain p-1 ring-1 ring-border"
          />
        </Link>
        <Link
          to="/"
          title="Upoharkabbo"
          className={cn("shrink-0 transition-all duration-300", collapsed ? "hidden" : "block")}
        >
          <img
            src={logoMark}
            alt="Upoharkabbo"
            className="h-16 w-auto object-contain"
          />
        </Link>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-2 pb-4">
        {sections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {section.title}
              </p>
            )}

            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item);
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to as "/admin"}
                      title={item.label}
                      className={cn(
                        "group relative flex items-center gap-3 overflow-hidden rounded-xl px-2.5 py-2.5 text-sm font-medium transition-all duration-300",
                        active
                          ? "ig-gradient text-white shadow-[0_12px_26px_-16px_rgba(238,42,123,0.95)]"
                          : "text-foreground/75 hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "size-[18px] shrink-0 transition-transform duration-300 group-hover:scale-110",
                          active && "drop-shadow",
                        )}
                      />
                      <span
                        className={cn(
                          "min-w-0 truncate transition-all duration-300",
                          collapsed ? "w-0 opacity-0" : "w-auto opacity-100",
                        )}
                      >
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-border/70 px-2 py-3">
        <Link
          to="/"
          title="View site"
          className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium text-foreground/75 transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <ExternalLink className="size-[18px] shrink-0" />
          <span className={cn("truncate transition-all duration-300", collapsed && "hidden")}>
            View site
          </span>
        </Link>
        <button
          onClick={() => void signOut()}
          title="Sign out"
          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="size-[18px] shrink-0" />
          <span className={cn("truncate transition-all duration-300", collapsed && "hidden")}>
            Sign out
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="admin-scope min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-border/70 bg-card/85 backdrop-blur-xl transition-[width] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] lg:block",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        {sidebar}
        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-label="Toggle sidebar"
          className="absolute -right-3 top-20 grid size-6 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow transition-all duration-300 hover:scale-110 hover:text-primary"
        >
          <ChevronLeft className={cn("size-4 transition-transform duration-500", collapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Mobile drawer */}
      <div
        onClick={() => setMobileOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm transition-opacity duration-500 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-border/70 bg-card transition-transform duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebar}
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          className="absolute right-2 top-4 grid size-8 place-items-center rounded-full hover:bg-accent"
        >
          <X className="size-4" />
        </button>
      </aside>

      <div
        className={cn(
          "transition-[padding] duration-500 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
          collapsed ? "lg:pl-[76px]" : "lg:pl-64",
        )}
      >
        <main key={pathname} className="admin-rise mx-auto max-w-6xl space-y-6 px-4 py-6 pt-4 lg:pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
