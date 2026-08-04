import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Search, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";

import {
  adminCreateOrder,
  adminLookupCustomer,
  adminSearchProducts,
} from "@/lib/admin.functions";
import {
  advanceMethods,
  orderSources,
} from "@/lib/admin-schema";
import { adminActiveDeliveryPartners } from "@/lib/delivery.functions";
import { providerLabels } from "@/lib/delivery-shared";
import { BD_DIVISIONS } from "@/lib/bd-geo";
import { AdminHeading, Panel } from "@/components/admin/kit";
import { BrandLoader } from "@/components/admin/brand-loader";
import { CourierReport } from "@/components/admin/courier-report";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { normalizePhoneInput } from "@/lib/phone";

export const Route = createFileRoute("/admin/orders/create")({
  component: CreateOrderPage,
});

const input =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary";

type Line = {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  variantLabel: string | null;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  imageUrl: string | null;
};

function money(n: number) {
  return `৳ ${n.toLocaleString("en-US")}`;
}

function Label({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-sm font-semibold text-foreground">{children}</span>;
}

function CreateOrderPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [division, setDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [upazila, setUpazila] = useState("");
  const [note, setNote] = useState("");

  const [lines, setLines] = useState<Line[]>([]);
  const [search, setSearch] = useState("");

  const [discount, setDiscount] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [advanceMethod, setAdvanceMethod] =
    useState<(typeof advanceMethods)[number]>("bKash");
  const [source, setSource] = useState<(typeof orderSources)[number]>("Facebook");
  const [deliveryPartner, setDeliveryPartner] = useState<string>("");
  const [deliveryNoteOn, setDeliveryNoteOn] = useState(true);
  const [deliveryNote, setDeliveryNote] = useState("");

  const activePartners = useQuery({
    queryKey: ["admin", "active-delivery-partners"],
    queryFn: () => adminActiveDeliveryPartners(),
    staleTime: 60_000,
  });

  const partnerOptions = activePartners.data ?? [];

  /** Applies a partner's saved note template to the delivery note field. */
  const applyPartner = (label: string) => {
    setDeliveryPartner(label);
    const match = partnerOptions.find((p) => providerLabels[p.provider] === label);
    setDeliveryNote(deliveryNoteOn ? (match?.noteTemplate ?? "") : "");
  };

  // Pre-select the default courier (and its note template) once partners load.
  const defaultApplied = useRef(false);
  useEffect(() => {
    if (defaultApplied.current || partnerOptions.length === 0) return;
    const fallback = partnerOptions.find((p) => p.isDefault);
    if (!fallback) return;
    defaultApplied.current = true;
    setDeliveryPartner(providerLabels[fallback.provider]);
    setDeliveryNote((prev) => (prev ? prev : fallback.noteTemplate));
  }, [partnerOptions]);

  const phoneValid = /^01[3-9]\d{8}$/.test(phone.trim());

  const divisionObj = useMemo(
    () => BD_DIVISIONS.find((d) => d.bn === division) ?? null,
    [division],
  );
  const districtObj = useMemo(
    () => divisionObj?.districts.find((d) => d.bn === district) ?? null,
    [divisionObj, district],
  );

  const lookup = useQuery({
    queryKey: ["admin", "customer", phone.trim()],
    queryFn: () => adminLookupCustomer({ data: { phone: phone.trim() } }),
    enabled: phoneValid,
    staleTime: 60_000,
  });

  const products = useQuery({
    queryKey: ["admin", "order-product-search", search],
    queryFn: () => adminSearchProducts({ data: { query: search } }),
    staleTime: 60_000,
  });

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const total = Math.max(0, subtotal + deliveryCharge - discount);
  const due = Math.max(0, total - advanceAmount);

  const applyFill = () => {
    const last = lookup.data;
    if (!last) return;
    setName(last.customer_name);
    const parts = last.address_line.split(",").map((p) => p.trim());
    if (parts.length >= 4) {
      const div = parts[parts.length - 1] ?? "";
      const dist = parts[parts.length - 2] ?? "";
      const upa = parts[parts.length - 3] ?? "";
      setAddress(parts.slice(0, parts.length - 3).join(", "));
      const dv = BD_DIVISIONS.find((d) => d.bn === div);
      if (dv) {
        setDivision(dv.bn);
        const ds = dv.districts.find((d) => d.bn === dist);
        if (ds) {
          setDistrict(ds.bn);
          if (ds.upazilas.some((u) => u.bn === upa)) setUpazila(upa);
        }
      }
    } else {
      setAddress(last.address_line);
    }
    if (last.note) setNote(last.note);
    toast.success("Previous customer details filled");
  };

  const addLine = (
    product: {
      id: string;
      name_bn: string;
      sku: string | null;
      price: number | string;
      product_images?: Array<{ url: string; sort_order: number | null }>;
      product_variants?: Array<{
        id: string;
        value_bn: string;
        group_name_bn: string;
        sku: string | null;
        price_delta: number | string;
        is_active: boolean;
      }>;
    },
    variantId: string | null,
  ) => {
    const variant = product.product_variants?.find((v) => v.id === variantId) ?? null;
    const imageUrl =
      [...(product.product_images ?? [])].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
      )[0]?.url ?? null;
    const unitPrice = Number(product.price) + Number(variant?.price_delta ?? 0);
    const key = `${product.id}:${variantId ?? "-"}`;
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          variantId,
          name: product.name_bn,
          variantLabel: variant ? `${variant.group_name_bn}: ${variant.value_bn}` : null,
          sku: variant?.sku ?? product.sku,
          unitPrice,
          quantity: 1,
          imageUrl,
        },
      ];
    });
  };

  const create = useMutation({
    mutationFn: () =>
      adminCreateOrder({
        data: {
          customerName: name.trim(),
          customerPhone: phone.trim(),
          addressLine: address.trim(),
          division,
          district,
          upazila,
          note: note.trim(),
          discount,
          deliveryCharge,
          advanceAmount,
          advanceMethod: advanceAmount > 0 ? advanceMethod : null,
          source,
          deliveryPartner: deliveryPartner === "" ? null : deliveryPartner,
          deliveryNote: deliveryNoteOn ? deliveryNote.trim() : "",
          items: lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
          })),
        },
      }),
    onSuccess: (res) => {
      toast.success(`Order ${res.orderNumber} created`);
      void navigate({ to: "/admin/orders/$id", params: { id: (res.orderNumber || res.id).toLowerCase() } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit =
    phoneValid &&
    name.trim().length >= 2 &&
    address.trim().length >= 4 &&
    division &&
    district &&
    upazila &&
    lines.length > 0 &&
    !create.isPending;

  return (
    <div className="space-y-5">
      <AdminHeading
        backTo="/admin/orders"
        backLabel="Order list"
        title="Create Order"
        description="Place a manual order on behalf of a customer."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Panel>
            <h2 className="text-sm font-bold">Customer</h2>

            {phoneValid ? (
              <div className="mt-3">
                <CourierReport phone={phone.trim()} />
              </div>
            ) : null}

            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <Label>Phone number</Label>
                <div className="flex gap-2">
                  <input
                    className={input}
                    value={phone}
                    onChange={(e) => setPhone(normalizePhoneInput(e.target.value))}
                    inputMode="numeric"
                    placeholder="01XXXXXXXXX"
                    maxLength={11}
                  />
                  {lookup.data ? (
                    <Button type="button" size="sm" onClick={applyFill} className="shrink-0">
                      <UserCheck className="size-4" />
                      Fill
                    </Button>
                  ) : null}
                </div>
                {lookup.data ? (
                  <span className="mt-1 block text-xs font-semibold text-primary">
                    Returning customer · {lookup.data.orderCount} previous order(s)
                  </span>
                ) : null}
              </label>

              <label className="block">
                <Label>Customer name</Label>
                <input
                  className={input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                />
              </label>
            </div>

            <label className="mt-4 block">
              <Label>Detailed address (area / road / block / flat)</Label>
              <textarea
                className={cn(input, "min-h-20 resize-y")}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                maxLength={300}
              />
            </label>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="block">
                <Label>Division</Label>
                <select
                  className={input}
                  value={division}
                  onChange={(e) => {
                    setDivision(e.target.value);
                    setDistrict("");
                    setUpazila("");
                  }}
                >
                  <option value="">Select division</option>
                  {BD_DIVISIONS.map((d) => (
                    <option key={d.id} value={d.bn}>
                      {d.en}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <Label>District</Label>
                <select
                  className={cn(input, !divisionObj && "opacity-60")}
                  value={district}
                  disabled={!divisionObj}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    setUpazila("");
                  }}
                >
                  <option value="">Select district</option>
                  {(divisionObj?.districts ?? []).map((d) => (
                    <option key={d.id} value={d.bn}>
                      {d.en}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <Label>Upazila / Thana</Label>
                <select
                  className={cn(input, !districtObj && "opacity-60")}
                  value={upazila}
                  disabled={!districtObj}
                  onChange={(e) => setUpazila(e.target.value)}
                >
                  <option value="">Select upazila</option>
                  {(districtObj?.upazilas ?? []).map((u) => (
                    <option key={u.en} value={u.bn}>
                      {u.en}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="mt-4 block">
              <Label>Note (optional)</Label>
              <textarea
                className={cn(input, "min-h-16 resize-y")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
              />
            </label>
          </Panel>



          <Panel>
            <h2 className="text-sm font-bold">Items</h2>

            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className={cn(input, "pl-9")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by product name or SKU"
              />
            </div>

            {products.isLoading ? (
              <BrandLoader size="sm" className="py-6" />
            ) : (
              <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto">
                {(products.data ?? []).map((p) => {
                  const variants = (p.product_variants ?? []).filter((v) => v.is_active);
                  const thumb = [...(p.product_images ?? [])].sort(
                    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
                  )[0]?.url;
                  return (
                    <li
                      key={p.id}
                      className="rounded-xl border border-border/70 bg-background px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={p.name_bn}
                              loading="lazy"
                              className="size-11 shrink-0 rounded-lg border border-border/70 object-cover"
                            />
                          ) : (
                            <div className="grid size-11 shrink-0 place-items-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">
                              No img
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{p.name_bn}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.sku ?? "—"} · {money(Number(p.price))} · stock {p.stock}
                            </p>
                          </div>
                        </div>
                        {variants.length === 0 ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => addLine(p, null)}
                          >
                            <Plus className="size-4" />
                            Add
                          </Button>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {variants.map((v) => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => addLine(p, v.id)}
                                className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold transition-colors hover:border-primary/50 hover:bg-accent"
                              >
                                + {v.value_bn}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
                {(products.data ?? []).length === 0 ? (
                  <li className="py-4 text-center text-sm text-muted-foreground">
                    No products found
                  </li>
                ) : null}
              </ul>
            )}

            <ul className="mt-4 divide-y divide-border border-t border-border">
              {lines.map((l) => (
                <li key={l.key} className="flex flex-wrap items-center gap-3 py-2.5">
                  {l.imageUrl ? (
                    <img
                      src={l.imageUrl}
                      alt={l.name}
                      loading="lazy"
                      className="size-10 shrink-0 rounded-lg border border-border/70 object-cover"
                    />
                  ) : (
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">
                      No img
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {l.name}
                      {l.variantLabel ? (
                        <span className="text-muted-foreground"> · {l.variantLabel}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {l.sku ?? "—"} · {money(l.unitPrice)}
                    </p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={l.quantity}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((x) =>
                          x.key === l.key
                            ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) }
                            : x,
                        ),
                      )
                    }
                    className={cn(input, "w-20 text-center")}
                  />
                  <span className="w-24 text-right text-sm font-bold tabular-nums">
                    {money(l.unitPrice * l.quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setLines((prev) => prev.filter((x) => x.key !== l.key));
                      toast.success(`${l.name} removed`);
                    }}
                    className="grid size-9 shrink-0 place-items-center rounded-lg border border-border/70 text-muted-foreground transition-all duration-150 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 active:scale-90 active:bg-destructive active:text-white"
                    aria-label="Remove item"
                    title="Remove item"
                  >
                    <Trash2 className="size-4" />
                  </button>

                </li>
              ))}
              {lines.length === 0 ? (
                <li className="py-4 text-center text-sm text-muted-foreground">
                  No items added yet
                </li>
              ) : null}
            </ul>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel>
            <h2 className="text-sm font-bold">Payment</h2>
            <div className="mt-3 grid gap-3">
              <label className="block">
                <Label>Discount</Label>
                <input
                  type="number"
                  min={0}
                  className={input}
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>
              <label className="block">
                <Label>Delivery charge</Label>
                <input
                  type="number"
                  min={0}
                  className={input}
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>
              <label className="block">
                <Label>Advance amount</Label>
                <input
                  type="number"
                  min={0}
                  className={input}
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>
              {advanceAmount > 0 ? (
                <label className="block">
                  <Label>Advance received via</Label>
                  <select
                    className={input}
                    value={advanceMethod}
                    onChange={(e) =>
                      setAdvanceMethod(e.target.value as (typeof advanceMethods)[number])
                    }
                  >
                    {advanceMethods.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <dl className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
              <Row label="Subtotal" value={money(subtotal)} />
              <Row label="Delivery" value={money(deliveryCharge)} />
              <Row label="Discount" value={`− ${money(discount)}`} />
              <Row label="Total" value={money(total)} strong />
              {advanceAmount > 0 ? (
                <>
                  <Row label="Advance" value={money(advanceAmount)} />
                  <Row label="Due (COD)" value={money(due)} strong />
                </>
              ) : null}
            </dl>
          </Panel>

          <Panel>
            <h2 className="text-sm font-bold">Order meta</h2>
            <div className="mt-3 grid gap-3">
              <label className="block">
                <Label>Order source</Label>
                <select
                  className={input}
                  value={source}
                  onChange={(e) => setSource(e.target.value as (typeof orderSources)[number])}
                >
                  {orderSources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <Label>Delivery partner</Label>
                <select
                  className={input}
                  value={deliveryPartner}
                  onChange={(e) => applyPartner(e.target.value)}
                  disabled={activePartners.isLoading}
                >
                  <option value="">Not selected</option>
                  {partnerOptions.map((p) => (
                    <option key={p.provider} value={providerLabels[p.provider]}>
                      {providerLabels[p.provider]}
                      {p.isDefault ? " (default)" : ""}
                    </option>
                  ))}
                </select>
                {!activePartners.isLoading && partnerOptions.length === 0 ? (
                  <span className="mt-1 block text-xs font-semibold text-muted-foreground">
                    No delivery partner is enabled yet — add one in Settings → Delivery.
                  </span>
                ) : null}
              </label>

              <div className="sm:col-span-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={deliveryNoteOn}
                    onChange={(e) => {
                      const on = e.target.checked;
                      setDeliveryNoteOn(on);
                      if (!on) setDeliveryNote("");
                      else {
                        const match = partnerOptions.find(
                          (p) => providerLabels[p.provider] === deliveryPartner,
                        );
                        setDeliveryNote(match?.noteTemplate ?? "");
                      }
                    }}
                  />
                  Add delivery note
                </label>
                {deliveryNoteOn ? (
                  <textarea
                    rows={3}
                    maxLength={500}
                    className={cn(input, "mt-2 h-auto py-2")}
                    placeholder="Sent to the courier as special instruction"
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                  />
                ) : null}
              </div>
            </div>

            <Button
              type="button"
              className="mt-4 w-full"
              disabled={!canSubmit}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Creating…" : "Create order"}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              New orders are created with the Pending status.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("tabular-nums", strong ? "font-bold text-primary" : "font-medium")}>
        {value}
      </dd>
    </div>
  );
}
