import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeDollarSign,
  Boxes,
  Clock,
  Layers,
  Package,
  Sparkles,
} from "lucide-react";

import { adminOverview } from "@/lib/admin.functions";
import { AdminHeading, EmptyState, Panel, StatusPill } from "@/components/admin/kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/")({
  component: AdminOverviewPage,
});

function adminPrice(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return `৳ ${n.toLocaleString("en-US")}`;
}

function AdminOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => adminOverview(),
  });

  const stats = [
    {
      label: "Total revenue",
      value: adminPrice(data?.revenue ?? 0),
      icon: BadgeDollarSign,
      gradient: "from-primary to-accent",
    },
    {
      label: "Total orders",
      value: String(data?.orderCount ?? 0),
      icon: Package,
      gradient: "from-accent to-primary",
    },
    {
      label: "Pending orders",
      value: String(data?.pending ?? 0),
      icon: Clock,
      gradient: "from-amber-500 to-primary",
    },
    {
      label: "Products",
      value: String(data?.productCount ?? 0),
      icon: Boxes,
      gradient: "from-primary to-violet-500",
    },
    {
      label: "Categories",
      value: String(data?.categoryCount ?? 0),
      icon: Layers,
      gradient: "from-violet-500 to-accent",
    },
    {
      label: "Promotions",
      value: String(data?.promotionCount ?? 0),
      icon: Sparkles,
      gradient: "from-accent to-amber-500",
    },
  ];

  return (
    <div className="space-y-6">
      <AdminHeading title="Overview" description="Store summary and recent orders." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className="admin-rise group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-[0_16px_40px_-34px_rgba(98,40,215,0.8)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_-30px_rgba(238,42,123,0.55)]"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div
              className={cn(
                "absolute -right-6 -top-6 size-20 rounded-full bg-gradient-to-br opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-30",
                s.gradient,
              )}
            />
            <div
              className={cn(
                "ig-gradient inline-flex size-9 items-center justify-center rounded-xl text-primary-foreground shadow-sm",
              )}
            >
              <s.icon className="size-4.5" />
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums">
              {isLoading ? (
                <span className="admin-shimmer inline-block h-5 w-16 rounded-md bg-muted" />
              ) : (
                s.value
              )}
            </p>
          </div>
        ))}
      </div>

      <Panel>
        <h2 className="ig-text text-sm font-bold">Recent orders</h2>
        <div className="mt-3 space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (data?.recent.length ?? 0) === 0 ? (
            <EmptyState title="No orders yet" />
          ) : (
            data?.recent.map((o) => (
              <Link
                key={o.id}
                to="/admin/orders/$id"
                params={{ id: o.id }}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 px-3 py-2.5 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/60"
              >
                <span className="font-semibold">{o.order_number}</span>
                <span className="text-muted-foreground">{o.customer_name}</span>
                <StatusPill status={o.status} />
                <span className="font-semibold tabular-nums">{adminPrice(o.total)}</span>
              </Link>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
