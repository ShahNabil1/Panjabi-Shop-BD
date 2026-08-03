import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, CheckCircle2, History } from "lucide-react";
import { useState } from "react";

import { adminEditOrder, adminGetOrder, adminUpdateOrderStatus } from "@/lib/admin.functions";
import { webOrderStatuses, type OrderStatus } from "@/lib/admin-schema";
import { TextField, AreaField, NumberField } from "@/components/admin/kit";
import { AdminHeading, Panel, StatusPill, statusLabels } from "@/components/admin/kit";
import { BrandLoader } from "@/components/admin/brand-loader";
import { CourierReport } from "@/components/admin/courier-report";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const updatableStatuses = ["no_response", "good_no_response", "hold", "cancelled"] as const;
type PendingStatus = (typeof updatableStatuses)[number] | "pending";

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

  const [edited, setEdited] = useState<null | {
    customerName: string;
    customerPhone: string;
    addressLine: string;
    note: string;
    discount: number;
    deliveryCharge: number;
  }>(null);

  const save = useMutation({
    mutationFn: () => {
      if (!edited) throw new Error("Nothing to save");
      return adminEditOrder({ data: { id, ...edited } });
    },
    onSuccess: async () => {
      toast.success("Order updated");
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [pending, setPending] = useState<PendingStatus | null>(null);
  const [reason, setReason] = useState("");

  const update = useMutation({
    mutationFn: (input: { status: OrderStatus; reason?: string }) =>
      adminUpdateOrderStatus({
        data: { id, status: input.status, ...(input.reason ? { reason: input.reason } : {}) },
      }),
    onSuccess: async () => {
      toast.success("Status updated");
      setPending(null);
      setReason("");
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
    order_activity?: Array<{
      id: string;
      kind: string;
      message: string | null;
      created_at: string;
    }>;
  };

  const isWeb = (webOrderStatuses as readonly string[]).includes(order.status);
  const form = edited ?? {
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    addressLine: order.address_line,
    note: order.note ?? "",
    discount: Number(order.discount ?? 0),
    deliveryCharge: Number(order.delivery_charge ?? 0),
  };
  const setForm = setEdited;

  return (
    <div className="space-y-5">
      <AdminHeading
        backTo="/admin/orders"
        backLabel="Orders"
        title={order.order_number}
        description={new Date(order.created_at).toLocaleString("en-GB")}

        action={
          <div className="flex items-center gap-2">
            <StatusPill status={order.status} />
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
          </div>
        }
      />

      <Panel className="space-y-4">
        {isWeb ? (
          <Button
            size="lg"
            disabled={update.isPending}
            onClick={() => update.mutate({ status: "pending" })}
            className="w-full"
          >
            <CheckCircle2 className="size-5" />
            Confirm Order
          </Button>
        ) : null}

        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Update status
          </p>
          <Select
            value={pending ?? ""}
            onValueChange={(v) => {
              setPending(v as PendingStatus);
              setReason("");
            }}
          >
            <SelectTrigger className="max-w-sm rounded-xl">
              <SelectValue placeholder="Select a status" />
            </SelectTrigger>
            <SelectContent>
              {updatableStatuses.map((s) => (
                <SelectItem key={s} value={s} disabled={s === order.status}>
                  {statusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {pending === "hold" || pending === "cancelled" ? (
            <div
              className={
                pending === "hold"
                  ? "max-w-sm space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3"
                  : "max-w-sm space-y-2 rounded-xl border border-rose-300 bg-rose-50 p-3"
              }
            >
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={pending === "hold" ? "Reason for hold" : "Reason for cancellation"}
                className="h-9 rounded-lg border-border/70 bg-white/80 text-sm"
              />
              <Button
                size="sm"
                variant={pending === "hold" ? "default" : "destructive"}
                disabled={update.isPending || reason.trim().length === 0}
                onClick={() => update.mutate({ status: pending, reason: reason.trim() })}
              >
                {pending === "hold" ? "Hold" : "Cancel Order"}
              </Button>
            </div>
          ) : pending ? (
            <Button
              size="sm"
              disabled={update.isPending}
              onClick={() => update.mutate({ status: pending })}
            >
              Confirm change to {statusLabels[pending]}
            </Button>
          ) : null}
        </div>
      </Panel>


      {isWeb ? (
        <Panel>
          <h2 className="ig-text text-sm font-bold">Edit customer details</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <TextField label="Customer name" value={form.customerName} onChange={(v) => setForm({ ...form, customerName: v })} />
            <TextField label="Phone" value={form.customerPhone} onChange={(v) => setForm({ ...form, customerPhone: v })} />
            <div className="sm:col-span-2">
              <AreaField label="Address" value={form.addressLine} onChange={(v) => setForm({ ...form, addressLine: v })} />
            </div>
            <NumberField label="Delivery charge" value={form.deliveryCharge} onChange={(v) => setForm({ ...form, deliveryCharge: v })} />
            <NumberField label="Discount" value={form.discount} onChange={(v) => setForm({ ...form, discount: v })} />
            <div className="sm:col-span-2">
              <AreaField label="Note" value={form.note} onChange={(v) => setForm({ ...form, note: v })} />
            </div>
          </div>
          <div className="mt-3">
            <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
              Save changes
            </Button>
          </div>
        </Panel>
      ) : null}

      <Panel>
        <h2 className="ig-text flex items-center gap-2 text-sm font-bold">
          <History className="size-4" />
          Activity log
        </h2>
        {(order.order_activity ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {[...(order.order_activity ?? [])]
              .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
              .map((a) => (
                <li key={a.id} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2 last:border-0">
                  <span>{a.message ?? a.kind}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </Panel>

      <CourierReport phone={order.customer_phone} />

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
