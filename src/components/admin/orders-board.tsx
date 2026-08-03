import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Clock, Globe, Eye } from "lucide-react";

import { adminListOrders } from "@/lib/admin.functions";
import type { OrderBucket, OrderStatus } from "@/lib/admin-schema";
import { EmptyState, Panel, StatusPill, statusLabels } from "@/components/admin/kit";
import { BrandLoader } from "@/components/admin/brand-loader";
import { Input } from "@/components/ui/input";
import { courierCachedRatios } from "@/lib/courier.functions";
import { CourierStatusBar, ratioTone } from "@/components/admin/courier-status";
import { cn } from "@/lib/utils";

function adminPrice(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return `৳ ${n.toLocaleString("en-US")}`;
}

function formatBdDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Shared order board used by both the Web Orders and Order List screens. */
export function OrdersBoard({
  bucket,
  statuses,
  emptyTitle = "No orders found",
}: {
  bucket: OrderBucket;
  statuses: readonly OrderStatus[];
  emptyTitle?: string;
}) {
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", bucket, status, search],
    queryFn: () =>
      adminListOrders({
        data: {
          bucket,
          ...(status ? { status: status as OrderStatus } : {}),
          ...(search ? { search } : {}),
        },
      }),
  });

  const phones = [...new Set((data ?? []).map((o) => o.customer_phone))];
  const { data: ratios } = useQuery({
    queryKey: ["admin", "courier", "ratios", phones.join(",")],
    queryFn: () => courierCachedRatios({ data: { phones } }),
    enabled: phones.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <CourierStatusBar />
      </div>

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
          {["", ...statuses].map((s) => (
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
          <BrandLoader size="md" message="Loading orders…" className="py-8" />
        ) : (data?.length ?? 0) === 0 ? (
          <div className="p-4">
            <EmptyState title={emptyTitle} />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data?.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors duration-200 hover:bg-muted/40"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-bold text-foreground">{o.customer_name}</span>
                    <StatusPill status={o.status} />
                    <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                      {o.order_number}
                    </span>
                    {ratios?.[o.customer_phone] !== undefined ? (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-bold ring-1 tabular-nums",
                          ratioTone(ratios[o.customer_phone] as number),
                        )}
                      >
                        {ratios[o.customer_phone]}%
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      {formatBdDateTime(o.created_at)}
                    </span>
                    <span className="font-semibold tabular-nums text-primary">
                      {adminPrice(o.total)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-1.5 py-0.5 font-mono">
                      <Globe className="size-3" />
                      {(o as { customer_ip?: string | null }).customer_ip ?? "—"}
                    </span>
                  </div>
                </div>

                <Link
                  to="/admin/orders/$id"
                  params={{ id: o.id }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
                >
                  <Eye className="size-3.5" />
                  View
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
