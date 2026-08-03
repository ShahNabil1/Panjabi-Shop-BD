import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, ArrowLeft } from "lucide-react";

import { adminGetOrder, adminUpdateOrderStatus } from "@/lib/admin.functions";
import { orderStatuses } from "@/lib/admin-schema";
import { AdminHeading, Panel, StatusPill, statusLabels } from "@/components/admin/kit";
import { BrandLoader } from "@/components/admin/brand-loader";
import { Button } from "@/components/ui/button";

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

function adminPrice(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return `৳ ${n.toLocaleString("en-US")}`;
}

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
      toast.success("Status updated");
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <BrandLoader size="md" message="Loading order…" className="py-8" />;
  if (!data) {
    return (
      <div className="space-y-4">
        <AdminHeading title="Order not found" />
        <Button asChild variant="outline">
          <Link to="/admin/orders">Back to orders</Link>
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
        backTo="/admin/orders"
        backLabel="Orders"
        title={order.order_number}
        description={new Date(order.created_at).toLocaleString("en-GB")}

        action={
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link
                to="/invoice/$orderNumber"
                params={{ orderNumber: order.order_number }}
                search={{ phone: order.customer_phone }}
                target="_blank"
              >
                <FileText className="size-4" />
                Invoice
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/orders">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>
          </div>
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
              className="transition-transform duration-200 hover:-translate-y-0.5"
            >
              {statusLabels[s]}
            </Button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="ig-text text-sm font-bold">Customer</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row label="Name" value={order.customer_name} />
            <Row label="Phone" value={order.customer_phone} />
            <Row label="Email" value={order.customer_email ?? "—"} />
            <Row label="Address" value={`${order.address_line}, ${order.city}`} />
            <Row label="Area" value={order.delivery_area ?? "—"} />
            <Row label="Note" value={order.note ?? "—"} />
            <Row label="Source" value={order.source} />
            <Row label="Payment" value={order.payment_method.toUpperCase()} />
          </dl>
        </Panel>

        <Panel>
          <h2 className="ig-text text-sm font-bold">Items</h2>
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
                <span className="tabular-nums">{adminPrice(item.line_total)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
            <Row label="Subtotal" value={adminPrice(order.subtotal)} />
            <Row label="Delivery" value={adminPrice(order.delivery_charge)} />
            <Row label="Discount" value={adminPrice(order.discount)} />
            <Row label="Total" value={adminPrice(order.total)} />
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
