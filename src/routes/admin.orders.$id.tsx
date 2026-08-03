import { Link, createFileRoute, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, FileText, History, MessageSquare, X } from "lucide-react";
import { useState } from "react";

import { adminUpdateOrderStatus } from "@/lib/admin.functions";
import { adminOrderWorkspace } from "@/lib/order-admin.functions";
import { webOrderStatuses, smsTemplates, type OrderStatus } from "@/lib/admin-schema";
import { renderSmsTemplate, orderSmsVars } from "@/lib/sms-template";

import { Panel, StatusPill, statusLabels } from "@/components/admin/kit";
import { BrandLoader } from "@/components/admin/brand-loader";
import { CourierReport } from "@/components/admin/courier-report";
import { CustomerCard } from "@/components/admin/order/customer-card";
import { DeliveryNoteCard, ItemsCard } from "@/components/admin/order/items-card";
import { CommunicationLog, SmsCard } from "@/components/admin/order/sms-card";
import {
  FulfillmentCard,
  InternalNotesCard,
  SecurityCard,
} from "@/components/admin/order/security-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const updatableStatuses = ["no_response", "good_no_response", "hold", "cancelled"] as const;
type PendingStatus = (typeof updatableStatuses)[number];

export const Route = createFileRoute("/admin/orders/$id")({
  component: AdminOrderDetail,
});

type OrderItemRow = {
  id: string;
  product_id: string | null;
  product_name: string;
  variant_label: string | null;
  sku: string | null;
  unit_price: number | string;
  quantity: number;
};

function AdminOrderDetail() {
  const { id } = useParams({ from: "/admin/orders/$id" });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "order-workspace", id],
    queryFn: () => adminOrderWorkspace({ data: { id } }),
  });

  const [pending, setPending] = useState<PendingStatus | "">("");
  const [reason, setReason] = useState("");

  const update = useMutation({
    mutationFn: (input: { status: OrderStatus; reason?: string }) =>
      adminUpdateOrderStatus({
        data: { id, status: input.status, ...(input.reason ? { reason: input.reason } : {}) },
      }),
    onSuccess: async () => {
      toast.success("Status updated");
      setPending("");
      setReason("");
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <BrandLoader size="md" message="Loading order…" className="py-8" />;
  if (!data) {
    return (
      <Panel className="space-y-3 text-center">
        <p className="text-sm font-bold">Order not found</p>
        <Button asChild variant="outline">
          <Link to="/admin/orders">Back to orders</Link>
        </Button>
      </Panel>
    );
  }

  const order = data.order as unknown as {
    id: string;
    order_number: string;
    status: string;
    created_at: string;
    customer_name: string;
    customer_phone: string;
    alt_phone: string | null;
    division: string | null;
    district: string | null;
    upazila: string | null;
    address_line: string;
    customer_ip: string | null;
    device_fingerprint: string | null;
    delivery_note: string | null;
    delivery_partner: string | null;
    delivery_charge: number | string;
    discount: number | string;
    total?: number | string | null;
    advance_amount?: number | string | null;
    advance_method?: string | null;
    fulfillment_status: string;
    auto_sms_status: string;
    source: string;
    order_items: OrderItemRow[];
    order_activity?: Array<{ id: string; kind: string; message: string | null; created_at: string }>;
  };

  const confirmSms = renderSmsTemplate(
    smsTemplates.find((t) => t.id === "order_confirm")?.body ?? "",
    orderSmsVars(order),
  );



  const isWeb = (webOrderStatuses as readonly string[]).includes(order.status);
  const isDanger = pending === "hold" || pending === "cancelled";

  return (
    <div className="space-y-5">
      {/* Header: order number + status + status controls */}
      <Panel className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-mono text-xl font-bold tracking-tight">{order.order_number}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(order.created_at).toLocaleString("en-US", {
                timeZone: "Asia/Dhaka",
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={order.status} />
            <Select
              {...(pending ? { value: pending } : {})}
              onValueChange={(v) => {
                setPending(v as PendingStatus);
                setReason("");
              }}
            >
              <SelectTrigger className="h-9 w-[190px] rounded-xl border-border bg-background text-sm font-semibold">
                <SelectValue placeholder="Update Status" />
              </SelectTrigger>
              <SelectContent>
                {updatableStatuses.map((s) => (
                  <SelectItem key={s} value={s} disabled={s === order.status}>
                    {statusLabels[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pending ? (
              <button
                aria-label="Clear"
                className="transition-transform active:scale-90"
                onClick={() => {
                  setPending("");
                  setReason("");
                }}
              >
                <X className="size-4 text-muted-foreground" />
              </button>
            ) : null}
            <Button asChild size="sm" variant="outline">
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
        </div>

        {isDanger ? (
          <div
            className={
              pending === "hold"
                ? "ml-auto max-w-md space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3"
                : "ml-auto max-w-md space-y-2 rounded-xl border border-rose-300 bg-rose-50 p-3"
            }
          >
            <p
              className={
                pending === "hold"
                  ? "text-[11px] font-bold uppercase tracking-[0.08em] text-amber-800"
                  : "text-[11px] font-bold uppercase tracking-[0.08em] text-rose-800"
              }
            >
              {pending === "hold" ? "Reason for hold" : "Reason for cancel"}
            </p>
            <Textarea
              rows={2}
              maxLength={500}
              autoFocus
              className="rounded-lg border-border/70 bg-white/80 text-sm"
              placeholder={
                pending === "hold"
                  ? "e.g. Customer asked to pause, awaiting stock…"
                  : "e.g. Customer requested cancellation, duplicate…"
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{reason.length}/500</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setPending("")}>
                  Back
                </Button>
                <Button
                  size="sm"
                  variant={pending === "hold" ? "default" : "destructive"}
                  loading={update.isPending}
                  disabled={reason.trim().length === 0}
                  onClick={() => update.mutate({ status: pending, reason: reason.trim() })}
                >
                  {pending === "hold" ? "Confirm Hold" : "Confirm Cancel"}
                </Button>
              </div>
            </div>
          </div>
        ) : pending ? (
          <div className="flex justify-end">
            <Button
              size="sm"
              loading={update.isPending}
              onClick={() => update.mutate({ status: pending })}
            >
              Confirm change to {statusLabels[pending]}
            </Button>
          </div>
        ) : null}

        {isWeb ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-primary" />
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  SMS preview — sent on confirm
                </p>
              </div>
              <p className="mt-2 whitespace-pre-wrap rounded-lg border border-border/70 bg-background p-3 text-sm leading-relaxed">
                {confirmSms}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                To {order.customer_phone} · {confirmSms.length} chars ·{" "}
                {order.auto_sms_status === "sent"
                  ? "Already sent for this order"
                  : "Variables rendered with live order data"}
              </p>
            </div>
            <Button
              size="lg"
              loading={update.isPending}
              onClick={() => update.mutate({ status: "pending" })}
              className="w-full"
            >
              <CheckCircle2 className="size-5" />
              Confirm Order
            </Button>
          </div>
        ) : null}

      </Panel>

      {/* Fraud checker directly under the order title */}
      <CourierReport phone={order.customer_phone} />

      <CustomerCard order={order} />

      <DeliveryNoteCard
        orderId={order.id}
        initial={order.delivery_note ?? ""}
        partner={order.delivery_partner}
      />

      <SmsCard orderId={order.id} phone={order.customer_phone} />

      <ItemsCard
        orderId={order.id}
        deliveryCharge={Number(order.delivery_charge ?? 0)}
        discount={Number(order.discount ?? 0)}
        advanceAmount={Number(order.advance_amount ?? 0)}
        advanceMethod={order.advance_method ?? null}
        initialItems={(order.order_items ?? []).map((i) => ({
          productId: i.product_id,
          productName: i.product_name,
          variantLabel: i.variant_label,
          sku: i.sku,
          unitPrice: Number(i.unit_price),
          quantity: i.quantity,
        }))}
      />

      <FulfillmentCard status={order.fulfillment_status} source={order.source} />

      <SecurityCard
        orderId={order.id}
        blocked={data.blocked}
        identifiers={[
          { kind: "ip", value: order.customer_ip },
          { kind: "fingerprint", value: order.device_fingerprint },
          { kind: "phone", value: order.customer_phone },
        ]}
      />

      <InternalNotesCard orderId={order.id} notes={data.notes as never[]} />

      <CommunicationLog logs={data.sms as never[]} autoStatus={order.auto_sms_status} />

      <Panel>
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <History className="size-4 text-primary" />
          Activity log
        </h2>
        {(order.order_activity ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {[...(order.order_activity ?? [])]
              .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
              .map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap justify-between gap-2 border-b border-border pb-2 last:border-0"
                >
                  <span>{a.message ?? a.kind}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
