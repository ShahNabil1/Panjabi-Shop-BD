import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { adminOverview } from "@/lib/admin.functions";
import { AdminHeading, EmptyState, Panel, StatusPill } from "@/components/admin/kit";
import { formatPrice } from "@/lib/i18n";

export const Route = createFileRoute("/admin/")({
  component: AdminOverviewPage,
});

function AdminOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => adminOverview(),
  });

  const stats = [
    { label: "মোট বিক্রি", value: formatPrice("bn", data?.revenue ?? 0) },
    { label: "মোট অর্ডার", value: String(data?.orderCount ?? 0) },
    { label: "পেন্ডিং অর্ডার", value: String(data?.pending ?? 0) },
    { label: "প্রোডাক্ট", value: String(data?.productCount ?? 0) },
    { label: "ক্যাটাগরি", value: String(data?.categoryCount ?? 0) },
    { label: "প্রমোশন", value: String(data?.promotionCount ?? 0) },
  ];

  return (
    <div className="space-y-6">
      <AdminHeading title="ওভারভিউ" description="স্টোরের সারসংক্ষেপ ও সাম্প্রতিক অর্ডার।" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((s) => (
          <Panel key={s.label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-2 text-lg font-bold tabular-nums">{isLoading ? "…" : s.value}</p>
          </Panel>
        ))}
      </div>

      <Panel>
        <h2 className="text-sm font-bold">সাম্প্রতিক অর্ডার</h2>
        <div className="mt-3 space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">লোড হচ্ছে…</p>
          ) : (data?.recent.length ?? 0) === 0 ? (
            <EmptyState title="এখনো কোনো অর্ডার নেই" />
          ) : (
            data?.recent.map((o) => (
              <Link
                key={o.id}
                to="/admin/orders/$id"
                params={{ id: o.id }}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2.5 text-sm hover:bg-muted/60"
              >
                <span className="font-semibold">{o.order_number}</span>
                <span className="text-muted-foreground">{o.customer_name}</span>
                <StatusPill status={o.status} />
                <span className="font-semibold tabular-nums">{formatPrice("bn", o.total)}</span>
              </Link>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
