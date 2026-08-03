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
  Menu,

  Package,
  PlusCircle,

  Rocket,
  Settings,
  ShoppingCart,
  ListOrdered,
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
      { to: "/admin/orders", label: "Web Orders", icon: ShoppingCart, exact: true },
      { to: "/admin/orders/list", label: "Order List", icon: ListOrdered },
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
      <div className="admin-scope fixed inset-0 z-50 flex h-screen w-screen flex-col items-center justify-center bg-background">
        <BrandLoader size="lg" />
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
    <div className="relative flex h-full flex-col">
      {/* Ambient glow — warm neutral, no deep blue */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 -top-32 h-64 w-64 rounded-full bg-white/[0.03] blur-3xl" />
        <div className="absolute -right-16 top-1/3 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-[7rem] items-center justify-center border-b border-white/10 px-4 py-6">
        <Link
          to="/"
          title="Upoharkabbo"
          className={cn("shrink-0 transition-all duration-300", collapsed ? "block" : "hidden")}
        >
          <img
            src="/favicon.png"
            alt="Upoharkabbo"
            className="size-12 rounded-xl bg-white object-contain p-1.5 ring-1 ring-white/15"
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
            className="h-16 w-auto rounded-xl bg-white object-contain px-4 py-2.5 ring-1 ring-white/15"
          />
        </Link>
      </div>

      <nav className="relative flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
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
                        "group relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200",
                        collapsed && "justify-center px-0",
                        active
                          ? "bg-white/10 text-white shadow-lg shadow-black/30 ring-1 ring-inset ring-white/15 backdrop-blur-xl"
                          : "text-slate-300 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      {active && !collapsed && (
                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-indigo-400 to-fuchsia-400" />
                      )}
                      <item.icon
                        className={cn(
                          "size-[17px] shrink-0 transition-colors",
                          active ? "text-white" : "text-slate-400 group-hover:text-white",
                        )}
                      />
                      <span
                        className={cn(
                          "min-w-0 truncate whitespace-nowrap transition-all duration-200",
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

      <div className="relative space-y-1 border-t border-white/10 px-3 py-3">
        <Link
          to="/"
          title="Go to Main Website"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/5 hover:text-white",
            collapsed && "justify-center px-0",
          )}
        >
          <ExternalLink className="size-[18px] shrink-0 text-slate-400" />
          <span className={cn("truncate transition-all duration-200", collapsed && "hidden")}>
            Go to Main Website
          </span>
        </Link>
        <button
          onClick={() => void signOut()}
          title="Sign out"
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200",
            collapsed && "justify-center px-0",
          )}
        >
          <LogOut className="size-[18px] shrink-0" />
          <span className={cn("truncate transition-all duration-200", collapsed && "hidden")}>
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
          "fixed inset-y-0 left-0 z-40 hidden bg-[#0a0a0a] shadow-2xl shadow-black/40 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:block",
          collapsed ? "w-20" : "w-72",
        )}
      >
        {sidebar}
        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-label="Toggle sidebar"
          className="absolute -right-3 top-24 z-10 grid size-6 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow transition-all duration-300 hover:scale-110 hover:text-primary"
        >
          <ChevronLeft className={cn("size-4 transition-transform duration-500", collapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <img src="/favicon.png" alt="" className="size-8 rounded-lg object-contain" />
          <span className="text-base font-bold tracking-tight">Upoharkabbo</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="grid size-9 place-items-center rounded-lg text-foreground transition-transform duration-150 hover:bg-accent active:scale-95"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      <div
        onClick={() => setMobileOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 bg-[#0a0a0a] text-slate-100 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {sidebar}
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          className="absolute right-2 top-4 z-10 grid size-8 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </aside>

      <div
        className={cn(
          "transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          collapsed ? "lg:pl-20" : "lg:pl-72",
        )}
      >
        <main key={pathname} className="admin-rise mx-auto w-full max-w-6xl space-y-6 px-4 py-6 lg:px-10 lg:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

