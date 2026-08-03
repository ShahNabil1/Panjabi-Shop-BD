import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";

import { adminListOrders } from "@/lib/admin.functions";
import { orderStatuses } from "@/lib/admin-schema";
import { AdminHeading, EmptyState, Panel, StatusPill, statusLabels } from "@/components/admin/kit";
import { BrandLoader } from "@/components/admin/brand-loader";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/orders/")({
  component: AdminOrdersPage,
});

function adminPrice(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return `৳ ${n.toLocaleString("en-US")}`;
}

function AdminOrdersPage() {
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", status, search],
    queryFn: () =>
      adminListOrders({
        data: {
          ...(status ? { status: status as (typeof orderStatuses)[number] } : {}),
          ...(search ? { search } : {}),
        },
      }),
  });

  return (
    <div className="space-y-5">
      <AdminHeading title="Orders" description="View all orders and update their status." />

      <div className="admin-rise flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-card p-3">
        <div className="relative max-w-xs flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Order number, name or phone"
            className="rounded-xl border-border/80 bg-background/70 pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["", ...orderStatuses].map((s) => (
            <button
              key={s || "all"}
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5",
                status === s
                  ? "ig-gradient text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {s ? statusLabels[s] : "All"}
            </button>
          ))}
        </div>
      </div>

      <Panel className="p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading…</p>
        ) : (data?.length ?? 0) === 0 ? (
          <div className="p-4">
            <EmptyState title="No orders found" />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data?.map((o) => (
              <li key={o.id}>
                <Link
                  to="/admin/orders/$id"
                  params={{ id: o.id }}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm transition-colors duration-200 hover:bg-muted/50"
                >
                  <div className="min-w-40">
                    <p className="font-semibold">{o.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("en-GB")}
                    </p>
                  </div>
                  <div className="min-w-40">
                    <p>{o.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{o.customer_phone}</p>
                  </div>
                  <StatusPill status={o.status} />
                  <span className="font-semibold tabular-nums">{adminPrice(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
