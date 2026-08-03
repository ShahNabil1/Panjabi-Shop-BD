import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { adminListOrders } from "@/lib/admin.functions";
import { orderStatuses } from "@/lib/admin-schema";
import { AdminHeading, EmptyState, Panel, StatusPill, statusLabels } from "@/components/admin/kit";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/orders/")({
  component: AdminOrdersPage,
});

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
      <AdminHeading title="অর্ডার" description="সব অর্ডার দেখুন ও স্ট্যাটাস আপডেট করুন।" />

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="অর্ডার নম্বর, নাম বা ফোন"
          className="max-w-xs"
        />
        <div className="flex flex-wrap gap-1">
          {["", ...orderStatuses].map((s) => (
            <button
              key={s || "all"}
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                status === s ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {s ? statusLabels[s] : "সব"}
            </button>
          ))}
        </div>
      </div>

      <Panel className="p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">লোড হচ্ছে…</p>
        ) : (data?.length ?? 0) === 0 ? (
          <div className="p-4">
            <EmptyState title="কোনো অর্ডার পাওয়া যায়নি" />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data?.map((o) => (
              <li key={o.id}>
                <Link
                  to="/admin/orders/$id"
                  params={{ id: o.id }}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-muted/50"
                >
                  <div className="min-w-40">
                    <p className="font-semibold">{o.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString("bn-BD")}
                    </p>
                  </div>
                  <div className="min-w-40">
                    <p>{o.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{o.customer_phone}</p>
                  </div>
                  <StatusPill status={o.status} />
                  <span className="font-semibold tabular-nums">{formatPrice("bn", o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
