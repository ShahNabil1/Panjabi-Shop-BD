import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Pencil, Phone, Save, X } from "lucide-react";

import { BD_DIVISIONS } from "@/lib/bd-geo";
import { adminUpdateOrderCustomer } from "@/lib/order-admin.functions";
import { Panel } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export type OrderCustomer = {
  id: string;
  customer_name: string;
  customer_phone: string;
  alt_phone: string | null;
  division: string | null;
  district: string | null;
  upazila: string | null;
  address_line: string;
};

const labelClass =
  "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";
const controlClass =
  "h-10 w-full rounded-xl border border-border/80 bg-background/70 px-3 text-sm outline-none transition-colors focus:border-primary/60";

function Value({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className={labelClass}>{label}</p>
      <div className="text-sm font-semibold text-foreground">{children}</div>
    </div>
  );
}

export function CustomerCard({
  order,
  locked = false,
}: {
  order: OrderCustomer;
  locked?: boolean;
}) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const baseline = {
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    altPhone: order.alt_phone ?? "",
    division: order.division ?? "",
    district: order.district ?? "",
    upazila: order.upazila ?? "",
    addressLine: order.address_line,
  };
  const [form, setForm] = useState(baseline);
  const isDirty = JSON.stringify(form) !== JSON.stringify(baseline);

  const division = BD_DIVISIONS.find((d) => d.bn === form.division || d.en === form.division);
  const district = division?.districts.find(
    (d) => d.bn === form.district || d.en === form.district,
  );

  const save = useMutation({
    mutationFn: () => adminUpdateOrderCustomer({ data: { id: order.id, ...form } }),
    onSuccess: async () => {
      toast.success("Customer details saved");
      setEditing(false);
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Panel className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <MapPin className="size-4 text-primary" />
          Customer &amp; Delivery
        </h2>
        {locked ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground ring-1 ring-border">
            <Lock className="size-3" />
            Locked — sent to courier
          </span>
        ) : editing ? (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setForm(baseline);
                setEditing(false);
              }}
            >
              <X className="size-3.5" />
              Cancel
            </Button>
            <Button
              size="sm"
              loading={save.isPending}
              disabled={!isDirty || save.isPending}
              onClick={() => save.mutate()}
            >
              <Save className="size-3.5" />
              {isDirty ? "Save" : "Saved"}
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" />
            Edit
          </Button>
        )}
      </div>

      {editing && !locked ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className={labelClass}>Name *</Label>
            <Input
              className="rounded-xl"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>Phone *</Label>
            <Input
              className="rounded-xl"
              value={form.customerPhone}
              onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>Alternative phone</Label>
            <Input
              className="rounded-xl"
              placeholder="Optional"
              value={form.altPhone}
              onChange={(e) => setForm({ ...form, altPhone: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>Division *</Label>
            <select
              className={controlClass}
              value={form.division}
              onChange={(e) =>
                setForm({ ...form, division: e.target.value, district: "", upazila: "" })
              }
            >
              <option value="">— Select —</option>
              {BD_DIVISIONS.map((d) => (
                <option key={d.id} value={d.bn}>
                  {d.bn} / {d.en}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>District *</Label>
            <select
              className={controlClass}
              value={form.district}
              disabled={!division}
              onChange={(e) => setForm({ ...form, district: e.target.value, upazila: "" })}
            >
              <option value="">— Select —</option>
              {(division?.districts ?? []).map((d) => (
                <option key={d.id} value={d.bn}>
                  {d.bn} / {d.en}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>Thana / Upazila *</Label>
            <select
              className={controlClass}
              value={form.upazila}
              disabled={!district}
              onChange={(e) => setForm({ ...form, upazila: e.target.value })}
            >
              <option value="">— Select —</option>
              {(district?.upazilas ?? []).map((u) => (
                <option key={u.en} value={u.bn}>
                  {u.bn} / {u.en}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className={labelClass}>Address (village / area / house / road) *</Label>
            <Textarea
              className="rounded-xl"
              rows={3}
              value={form.addressLine}
              onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Value label="Name">{order.customer_name}</Value>
          <Value label="Phone">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-mono text-xs">
              <Phone className="size-3.5" />
              {order.customer_phone}
            </span>
          </Value>
          <Value label="Alternative phone">{order.alt_phone || "—"}</Value>
          <Value label="Division">{order.division || "—"}</Value>
          <Value label="District">{order.district || "—"}</Value>
          <Value label="Thana / Upazila">{order.upazila || "—"}</Value>
          <div className="sm:col-span-2">
            <Value label="Address (village / area / house / road)">{order.address_line}</Value>
          </div>
        </div>
      )}
    </Panel>
  );
}
