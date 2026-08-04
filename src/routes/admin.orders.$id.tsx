import { Link, createFileRoute, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, FileText, MessageSquare, ShieldAlert, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { adminUpdateOrderStatus } from "@/lib/admin.functions";
import { adminListDeliveryPartners } from "@/lib/delivery.functions";
import { providerLabels } from "@/lib/delivery-shared";
import {
  adminClaimOrder,
  adminHeartbeatOrder,
  adminReleaseOrder,
} from "@/lib/presence.functions";
import { useOrderPresence } from "@/lib/use-order-presence";
import { useAuth } from "@/lib/auth-context";
import { adminOrderWorkspace } from "@/lib/order-admin.functions";
import { webOrderStatuses, type OrderStatus } from "@/lib/admin-schema";
import { adminListSmsTemplates } from "@/lib/sms-templates.functions";
import { renderSmsTemplate, orderSmsVars } from "@/lib/sms-template";

import { Panel, StatusPill, statusLabels } from "@/components/admin/kit";
import { BrandLoader } from "@/components/admin/brand-loader";
import { CourierReport } from "@/components/admin/courier-report";
import { ActivityLog } from "@/components/admin/order/activity-log";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const updatableStatuses = [
  "no_response",
  "good_no_response",
  "hold",
  "pre_order",
  "scheduled_order",
  "cancelled",
] as const;
type PendingStatus = (typeof updatableStatuses)[number];

/** `datetime-local` value for "one hour from now", used as the schedule default. */
function defaultScheduleValue(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const Route = createFileRoute("/admin/orders/$id")({
  validateSearch: (search: Record<string, unknown>): { takeover?: number; from?: "list" } => ({
    ...(search["takeover"] ? { takeover: 1 as const } : {}),
    ...(search["from"] === "list" ? { from: "list" as const } : {}),
  }),

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
  const { id: slug } = useParams({ from: "/admin/orders/$id" });
  const { takeover, from } = useSearch({ from: "/admin/orders/$id" });
  /** Return to whichever board the user came from. */
  const backTo = from === "list" ? "/admin/orders/list" : "/admin/orders";

  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "order-workspace", slug],
    queryFn: () => adminOrderWorkspace({ data: { id: slug } }),
  });

  /** Real UUID of the order — resolved from the pretty slug in the URL. */
  const id = ((data?.order as { id?: string } | undefined)?.id ?? "") as string;

  // ---- Live presence: claim the order, heartbeat, release, react to takeovers ----
  const presence = useOrderPresence(id ? [id] : []);
  const held = id ? presence[id] : undefined;
  const [blockedBy, setBlockedBy] = useState<string | null>(null);
  const [evictedBy, setEvictedBy] = useState<string | null>(null);
  const ownsRef = useRef(false);

  const claim = async (force: boolean) => {
    if (!id) return;
    const res = await adminClaimOrder({ data: { id, ...(force ? { force: true } : {}) } });
    if (res.ok) {
      ownsRef.current = true;
      setBlockedBy(null);
    } else {
      ownsRef.current = false;
      setBlockedBy(res.heldBy);
    }
  };

  useEffect(() => {
    if (!id) return;
    void claim(takeover === 1);
    const beat = setInterval(() => {
      if (ownsRef.current) void adminHeartbeatOrder({ data: { id } });
    }, 25_000);
    return () => {
      clearInterval(beat);
      if (ownsRef.current) void adminReleaseOrder({ data: { id } });
      ownsRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Someone else claimed the order while we were inside it.
  useEffect(() => {
    if (!user || !held || !ownsRef.current) return;
    if (held.user_id !== user.id) {
      ownsRef.current = false;
      setEvictedBy(held.actor_name);
    }
  }, [held, user]);


  const smsTemplates = useQuery({
    queryKey: ["admin", "sms-templates"],
    queryFn: () => adminListSmsTemplates(),
  });

  const partners = useQuery({
    queryKey: ["admin", "delivery-partners"],
    queryFn: () => adminListDeliveryPartners(),
  });
  const activePartners = (partners.data ?? []).filter((p) => p.enabled);
  const [courier, setCourier] = useState("");
  const defaultPartnerApplied = useRef(false);

  // Pre-select the courier marked as default in Settings → Delivery.
  useEffect(() => {
    if (defaultPartnerApplied.current || courier || activePartners.length === 0) return;
    const fallback = activePartners.find((p) => p.is_default);
    if (!fallback) return;
    defaultPartnerApplied.current = true;
    setCourier(providerLabels[fallback.provider]);
  }, [activePartners, courier]);

  const courierTemplate =
    activePartners.find((p) => providerLabels[p.provider] === courier)?.note_template ?? "";

  const [pending, setPending] = useState<PendingStatus | "">("");
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [silent, setSilent] = useState(false);

  const update = useMutation({
    mutationFn: (input: {
      status: OrderStatus;
      reason?: string;
      skipSms?: boolean;
      deliveryPartner?: string;
    }) =>
      adminUpdateOrderStatus({
        data: {
          id,
          status: input.status,
          ...(input.reason ? { reason: input.reason } : {}),
          ...(input.skipSms ? { skipSms: true } : {}),
          ...(input.deliveryPartner ? { deliveryPartner: input.deliveryPartner } : {}),
        },
      }),
    onSuccess: async () => {
      toast.success(silent ? "Order confirmed (no SMS sent)" : "Status updated");
      setConfirmOpen(false);
      setPending("");
      setReason("");
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <BrandLoader size="md" className="py-8" />;
  if (!data) {
    return (
      <Panel className="space-y-3 text-center">
        <p className="text-sm font-bold">Order not found</p>
        <Button asChild variant="outline">
          <Link to={backTo}>Back to orders</Link>
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
    courier_status?: string | null;
    courier_consignment_id?: string | null;
    courier_tracking_code?: string | null;
    courier_sent_at?: string | null;
    auto_sms_status: string;
    source: string;
    order_items: OrderItemRow[];
    order_activity?: Array<{
      id: string;
      kind: string;
      message: string | null;
      meta?: unknown;
      created_at: string;
    }>;
  };

  const confirmTemplate = (smsTemplates.data?.templates ?? []).find(
    (t) => t.key === "order_confirm",
  );
  const autoSmsEnabled = confirmTemplate?.enabled !== false;
  const confirmSms = renderSmsTemplate(confirmTemplate?.body ?? "", orderSmsVars(order));



  const isWeb = (webOrderStatuses as readonly string[]).includes(order.status);
  const isDanger = pending === "hold" || pending === "cancelled";
  /** Once dispatched to a courier the shipment data is frozen. */
  const dispatchLocked = [
    "rts",
    "shipped",
    "courier_hold",
    "partial_delivered",
    "exchange",
    "delivered",
    "awaiting_return",
    "returned",
    "lost_damaged",
  ].includes(order.status);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="outline" size="sm" className="rounded-xl">
          <Link to={backTo}>
            <ArrowLeft className="size-4" />
            Back to orders
          </Link>
        </Button>
        {held && user && held.user_id === user.id ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
            <UserRound className="size-3.5" />
            You are handling this order
          </span>
        ) : null}
      </div>

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
                {(order.status === "rts"
                  ? (["cancelled"] as const satisfies readonly PendingStatus[])
                  : updatableStatuses
                ).map((s) => (
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
            <Button
              asChild
              size="sm"
              className="border-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-md shadow-indigo-500/20 transition-all hover:brightness-110 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95"
            >
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
                  variant={pending === "hold" ? "outline" : "destructive"}
                  className={
                    pending === "hold"
                      ? "border-amber-500/30 bg-amber-500 text-white hover:bg-amber-600 hover:text-white"
                      : undefined
                  }
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
          <>
            <Button
              size="lg"
              onClick={() => setConfirmOpen(true)}
              className="w-full bg-[hsl(143,85%,32%)] text-white hover:bg-[hsl(143,85%,27%)] focus-visible:ring-[hsl(143,85%,32%)]"
            >
              <CheckCircle2 className="size-5" />
              Confirm Order
            </Button>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="size-4 text-[hsl(143,85%,32%)]" />
                    Confirm order {order.order_number}
                  </DialogTitle>
                  <DialogDescription>
                    {autoSmsEnabled
                      ? "This SMS will be sent to the customer and the order moves to Pending."
                      : "Auto SMS is turned off in Settings → SMS Templates. The order will move to Pending without any SMS."}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    Delivery partner
                  </p>
                  {activePartners.length === 0 ? (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                      No delivery partner saved yet. Add one in Settings → Delivery Settings.
                    </p>
                  ) : (
                    <Select value={courier} onValueChange={setCourier}>
                      <SelectTrigger className="h-10 rounded-xl border-border bg-background text-sm font-semibold">
                        <SelectValue placeholder="Select where this order will be shipped" />
                      </SelectTrigger>
                      <SelectContent>
                        {activePartners.map((p) => (
                          <SelectItem key={p.provider} value={providerLabels[p.provider]}>
                            {providerLabels[p.provider]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {autoSmsEnabled ? (
                  <div className="rounded-xl border border-border bg-muted/40 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      SMS preview
                    </p>
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
                ) : null}

                <DialogFooter className="gap-2 sm:gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => setConfirmOpen(false)}
                    disabled={update.isPending}
                  >
                    <X className="size-4" />
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    loading={update.isPending && silent}
                    disabled={update.isPending || !courier}
                    onClick={() => {
                      setSilent(true);
                      update.mutate({ status: "pending", skipSms: true, deliveryPartner: courier });
                    }}
                  >
                    <CheckCircle2 className="size-4" />
                    Confirm only
                  </Button>
                  {autoSmsEnabled ? (
                    <Button
                      loading={update.isPending && !silent}
                      disabled={update.isPending || !courier}
                      onClick={() => {
                        setSilent(false);
                        update.mutate({ status: "pending", deliveryPartner: courier });
                      }}
                      className="bg-[hsl(143,85%,32%)] text-white hover:bg-[hsl(143,85%,27%)] focus-visible:ring-[hsl(143,85%,32%)]"
                    >
                      <CheckCircle2 className="size-4" />
                      Send SMS & Confirm
                    </Button>
                  ) : null}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : null}

      </Panel>

      {/* Fraud checker directly under the order title */}
      <CourierReport phone={order.customer_phone} />

      <CustomerCard order={order} locked={dispatchLocked} />

      <DeliveryNoteCard
        orderId={order.id}
        initial={order.delivery_note ?? ""}
        partner={courier || order.delivery_partner}
        template={courierTemplate}
        locked={dispatchLocked}
      />

      <SmsCard orderId={order.id} phone={order.customer_phone} />

      <ItemsCard
        orderId={order.id}
        locked={dispatchLocked}
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

      <FulfillmentCard
        orderId={order.id}
        status={order.fulfillment_status}
        source={order.source}
        orderStatus={order.status}
        partner={order.delivery_partner}
        courierStatus={order.courier_status ?? null}
        consignmentId={order.courier_consignment_id ?? null}
        trackingCode={order.courier_tracking_code ?? null}
        sentAt={order.courier_sent_at ?? null}
        customerPhone={order.customer_phone ?? null}
        collectedAmount={(() => {
          const rows = (
            order as unknown as {
              order_consignments?: Array<{ collected_amount?: number | string | null }>;
            }
          ).order_consignments;
          const v = rows
            ?.map((r) => r.collected_amount)
            .find((x) => x !== null && x !== undefined);
          return v === null || v === undefined ? null : Number(v);
        })()}
        returnConsignmentId={(() => {
          const rows = (
            order as unknown as {
              order_consignments?: Array<{ return_consignment_id?: string | null }>;
            }
          ).order_consignments;
          return rows?.map((r) => r.return_consignment_id).find((x) => !!x) ?? null;
        })()}
        orderTotal={order.total != null ? Number(order.total) : null}
        paidAt={(() => {
          const rows = (
            order as unknown as { order_consignments?: Array<{ paid_at?: string | null }> }
          ).order_consignments;
          return rows?.map((r) => r.paid_at).find((x) => !!x) ?? null;
        })()}
        paymentInvoiceId={(() => {
          const rows = (
            order as unknown as {
              order_consignments?: Array<{ payment_invoice_id?: string | null }>;
            }
          ).order_consignments;
          return rows?.map((r) => r.payment_invoice_id).find((x) => !!x) ?? null;
        })()}
      />

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

      <ActivityLog entries={order.order_activity ?? []} />

      {/* Another staff member already holds this order */}
      <Dialog open={!!blockedBy} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="size-4 text-rose-600" />
              Order already open
            </DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-foreground">{blockedBy}</span> is handling this
              order right now. Taking over will remove them from this workspace immediately and log
              the takeover.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => void navigate({ to: backTo })}>
              <ArrowLeft className="size-4" />
              Back to orders
            </Button>
            <Button variant="destructive" onClick={() => void claim(true)}>
              <ShieldAlert className="size-4" />
              Takeover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* We were taken over by someone else */}
      <Dialog open={!!evictedBy} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="size-4 text-rose-600" />
              You were taken over
            </DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-foreground">{evictedBy}</span> has taken over this
              order. You no longer have it open.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => void navigate({ to: backTo })}>
              <ArrowLeft className="size-4" />
              Back to orders
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setEvictedBy(null);
                void claim(true);
              }}
            >
              <ShieldAlert className="size-4" />
              Takeover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
