import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Lock, MapPin, Pencil, Phone, Save, X } from "lucide-react";

import { BD_DIVISIONS } from "@/lib/bd-geo";
import { adminUpdateOrderCustomer } from "@/lib/order-admin.functions";
import { Panel } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { normalizePhoneInput } from "@/lib/phone";

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

function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.174.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.148-.669-1.611-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.988 2.898 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
    </svg>
  );
}

function waNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `880${digits.slice(1)}`;
  return digits;
}

function PhoneRow({ phone }: { phone: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(phone);
          toast.success("নাম্বার কপি হয়েছে", { description: phone });
        }}
        title="Copy number"
        className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 font-mono text-xs transition-colors hover:bg-muted/70 active:scale-[0.98]"
      >
        <Phone className="size-3.5" />
        {phone}
      </button>
      <a
        href={`https://wa.me/${waNumber(phone)}`}
        target="_blank"
        rel="noreferrer"
        title="WhatsApp"
        className="inline-flex size-7 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C7E] transition-colors hover:bg-[#25D366]/25"
      >
        <WhatsappIcon className="size-3.5" />
      </a>
      <a
        href={`tel:${phone}`}
        title="Call"
        className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20"
      >
        <PhoneCall className="size-3.5" />
      </a>
    </span>
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
              onChange={(e) => setForm({ ...form, customerPhone: normalizePhoneInput(e.target.value) })}
              inputMode="numeric"
              maxLength={11}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={labelClass}>Alternative phone</Label>
            <Input
              className="rounded-xl"
              placeholder="Optional"
              value={form.altPhone}
              onChange={(e) => setForm({ ...form, altPhone: normalizePhoneInput(e.target.value) })}
              inputMode="numeric"
              maxLength={11}
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
            <PhoneRow phone={order.customer_phone} />
          </Value>
          <Value label="Alternative phone">
            {order.alt_phone ? <PhoneRow phone={order.alt_phone} /> : "—"}
          </Value>

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
