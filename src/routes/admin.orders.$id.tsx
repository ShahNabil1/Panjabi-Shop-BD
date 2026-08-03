import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { adminGetOrder, adminUpdateOrderStatus } from "@/lib/admin.functions";
import { orderStatuses } from "@/lib/admin-schema";
import { AdminHeading, Panel, StatusPill, statusLabels } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/i18n";

export const Route = createFileRoute("/admin/orders/$id")({
  component: AdminOrderDetail,
});

type OrderItem = {
  id: string;
  product_name: string;
  variant_label: string | null;
  sku: string | null;
  unit_price: number | string;
  quantity: number;
  line_total: number | string;
};

function AdminOrderDetail() {
  const { id } = useParams({ from: "/admin/orders/$id" });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "order", id],
    queryFn: () => adminGetOrder({ data: { id } }),
  });

  const update = useMutation({
    mutationFn: (status: (typeof orderStatuses)[number]) =>
      adminUpdateOrderStatus({ data: { id, status } }),
    onSuccess: async () => {
      toast.success("স্ট্যাটাস আপডেট হয়েছে");
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">লোড হচ্ছে…</p>;
  if (!data) {
    return (
      <div className="space-y-4">
        <AdminHeading title="অর্ডার পাওয়া যায়নি" />
        <Button asChild variant="outline">
          <Link to="/admin/orders">অর্ডার তালিকায় ফিরুন</Link>
        </Button>
      </div>
    );
  }

  const order = data as unknown as {
    order_number: string;
    status: string;
    created_at: string;
    customer_name: string;
    customer_phone: string;
    customer_email: string | null;
    address_line: string;
    city: string;
    delivery_area: string | null;
    note: string | null;
    subtotal: number | string;
    delivery_charge: number | string;
    discount: number | string;
    total: number | string;
    payment_method: string;
    source: string;
    order_items: OrderItem[];
  };

  return (
    <div className="space-y-5">
      <AdminHeading
        title={order.order_number}
        description={new Date(order.created_at).toLocaleString("bn-BD")}
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/orders">ফিরে যান</Link>
          </Button>
        }
      />

      <Panel>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={order.status} />
          {orderStatuses.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={s === order.status ? "default" : "outline"}
              disabled={update.isPending || s === order.status}
              onClick={() => update.mutate(s)}
            >
              {statusLabels[s]}
            </Button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="text-sm font-bold">কাস্টমার</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row label="নাম" value={order.customer_name} />
            <Row label="ফোন" value={order.customer_phone} />
            <Row label="ইমেইল" value={order.customer_email ?? "—"} />
            <Row label="ঠিকানা" value={`${order.address_line}, ${order.city}`} />
            <Row label="এলাকা" value={order.delivery_area ?? "—"} />
            <Row label="নোট" value={order.note ?? "—"} />
            <Row label="সোর্স" value={order.source} />
            <Row label="পেমেন্ট" value={order.payment_method.toUpperCase()} />
          </dl>
        </Panel>

        <Panel>
          <h2 className="text-sm font-bold">আইটেম</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {order.order_items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 py-2">
                <span>
                  {item.product_name}
                  {item.variant_label ? (
                    <span className="text-muted-foreground"> · {item.variant_label}</span>
                  ) : null}
                  <span className="text-muted-foreground"> × {item.quantity}</span>
                </span>
                <span className="tabular-nums">{formatPrice("bn", item.line_total)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
            <Row label="সাবটোটাল" value={formatPrice("bn", order.subtotal)} />
            <Row label="ডেলিভারি" value={formatPrice("bn", order.delivery_charge)} />
            <Row label="ডিসকাউন্ট" value={formatPrice("bn", order.discount)} />
            <Row label="মোট" value={formatPrice("bn", order.total)} />
          </dl>
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
