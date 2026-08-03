import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";

import { useCart, type CartItem } from "@/lib/cart-context";
import { useLang } from "@/lib/language-context";
import { formatNumber, formatPrice, pick, tr } from "@/lib/i18n";
import { captureIncompleteOrder, placeOrder } from "@/lib/order.functions";
import { BD_DIVISIONS } from "@/lib/bd-geo";
import { ProductThumb } from "@/components/site/product-card";
import { QuantityStepper } from "@/components/site/add-to-cart";
import { cn } from "@/lib/utils";

export type DeliveryRates = { inside_dhaka: number; outside_dhaka: number; freeAbove: number };

const inputClass =
  "w-full rounded-sm border border-border bg-background px-3 py-2.5 text-[15px] outline-none transition-colors focus:border-primary";

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-foreground">
        {label}
        {hint ? <span className="ml-1 font-normal text-muted-foreground">{hint}</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

export function CheckoutForm({
  items,
  rates,
  source,
  onPlaced,
  compact,
  onSetQuantity,
  onRemove,
  allowAddMore,
}: {
  items: CartItem[];
  rates: DeliveryRates;
  source: "website" | "landing";
  onPlaced?: () => void;
  compact?: boolean;
  onSetQuantity?: (key: string, quantity: number) => void;
  onRemove?: (key: string) => void;
  allowAddMore?: boolean;
}) {
  const { lang } = useLang();
  const navigate = useNavigate();
  const submit = useServerFn(placeOrder);
  const { clear } = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [division, setDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [upazila, setUpazila] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const placedRef = useRef(false);
  const capturedRef = useRef("");

  // Abandoned checkout capture: a valid phone number with items in the cart is
  // reported to the admin panel when the visitor leaves without ordering.
  const snapshot = useRef({ name, phone, address, division, district, upazila, note, items, source });
  snapshot.current = { name, phone, address, division, district, upazila, note, items, source };

  useEffect(() => {
    const flush = () => {
      const s = snapshot.current;
      if (placedRef.current) return;
      if (!/^01[3-9]\d{8}$/.test(s.phone.trim())) return;
      if (!s.items.length) return;
      const key = `${s.phone.trim()}|${s.items.map((i) => `${i.productId}:${i.variantId ?? ""}:${i.quantity}`).join(",")}|${s.name}|${s.address}`;
      if (capturedRef.current === key) return;
      capturedRef.current = key;
      void captureIncompleteOrder({
        data: {
          customerPhone: s.phone.trim(),
          customerName: s.name.trim(),
          addressLine: s.address.trim(),
          division: s.division,
          district: s.district,
          upazila: s.upazila,
          note: s.note.trim(),
          source: s.source,
          items: s.items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        },
      }).catch(() => undefined);
    };

    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  const divisionObj = useMemo(
    () => BD_DIVISIONS.find((d) => d.bn === division) ?? null,
    [division],
  );
  const districtObj = useMemo(
    () => divisionObj?.districts.find((d) => d.bn === district) ?? null,
    [divisionObj, district],
  );

  const area: "inside_dhaka" | "outside_dhaka" =
    district === "ঢাকা" ? "inside_dhaka" : "outside_dhaka";

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items],
  );
  const delivery = rates.freeAbove > 0 && subtotal >= rates.freeAbove ? 0 : rates[area];
  const total = subtotal + delivery;

  const validate = () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next["name"] = tr(lang, "invalidForm");
    if (!/^01[3-9]\d{8}$/.test(phone.trim()))
      next["phone"] = lang === "bn" ? "সঠিক ১১ ডিজিটের নম্বর দিন" : "Enter a valid 11-digit number";
    if (address.trim().length < 6) next["address"] = tr(lang, "invalidForm");
    if (!division) next["division"] = tr(lang, "selectDivision");
    if (!district) next["district"] = tr(lang, "selectDistrict");
    if (!upazila) next["upazila"] = tr(lang, "selectUpazila");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFailed(false);
    if (!items.length || pending) return;
    if (!validate()) return;

    setPending(true);
    try {
      const result = await submit({
        data: {
          customerName: name.trim(),
          customerPhone: phone.trim(),
          addressLine: address.trim(),
          division,
          district,
          upazila,
          note: note.trim(),
          source,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        },
      });
      placedRef.current = true;
      onPlaced?.();
      clear();
      void navigate({
        to: "/order/$orderNumber",
        params: { orderNumber: result.orderNumber },
        search: { phone: phone.trim() },
      });
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className={cn("grid gap-4", compact ? "" : "gap-5")} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr(lang, "fullName")} error={errors["name"]}>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={80}
            required
          />
        </Field>
        <Field label={tr(lang, "phone")} error={errors["phone"]}>
          <input
            className={cn(inputClass, "font-en")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="numeric"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            maxLength={14}
            required
          />
        </Field>
      </div>

      <Field label={tr(lang, "address")} hint={tr(lang, "addressHint")} error={errors["address"]}>
        <textarea
          className={cn(inputClass, "min-h-20 resize-y")}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          autoComplete="street-address"
          maxLength={300}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={tr(lang, "division")} error={errors["division"]}>
          <select
            className={inputClass}
            value={division}
            onChange={(e) => {
              setDivision(e.target.value);
              setDistrict("");
              setUpazila("");
            }}
            required
          >
            <option value="">{tr(lang, "selectDivision")}</option>
            {BD_DIVISIONS.map((d) => (
              <option key={d.id} value={d.bn}>
                {pick(lang, d.bn, d.en)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={tr(lang, "district")} error={errors["district"]}>
          <select
            className={cn(inputClass, !divisionObj && "opacity-60")}
            value={district}
            disabled={!divisionObj}
            onChange={(e) => {
              setDistrict(e.target.value);
              setUpazila("");
            }}
            required
          >
            <option value="">{tr(lang, "selectDistrict")}</option>
            {(divisionObj?.districts ?? []).map((d) => (
              <option key={d.id} value={d.bn}>
                {pick(lang, d.bn, d.en)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={tr(lang, "upazila")} error={errors["upazila"]}>
          <select
            className={cn(inputClass, !districtObj && "opacity-60")}
            value={upazila}
            disabled={!districtObj}
            onChange={(e) => setUpazila(e.target.value)}
            required
          >
            <option value="">{tr(lang, "selectUpazila")}</option>
            {(districtObj?.upazilas ?? []).map((u) => (
              <option key={u.en} value={u.bn}>
                {pick(lang, u.bn, u.en)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label={tr(lang, "note")}>
        <textarea
          className={cn(inputClass, "min-h-16 resize-y")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
        />
      </Field>

      <div className="rounded-sm border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold">{tr(lang, "yourItems")}</h3>
          {allowAddMore ? (
            <Link
              to="/"
              className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
            >
              + {tr(lang, "addMoreProducts")}
            </Link>
          ) : null}
        </div>

        <ul className="grid gap-3">
          {items.map((i) => (
            <li key={i.key} className="grid grid-cols-[56px_minmax(0,1fr)] gap-3">
              <div className="aspect-square overflow-hidden rounded-sm bg-secondary">
                <ProductThumb
                  src={i.image}
                  alt={pick(lang, i.nameBn, i.nameEn)}
                  label={i.nameEn}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-semibold">
                    {pick(lang, i.nameBn, i.nameEn)}
                    {i.variantLabelBn ? (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {pick(lang, i.variantLabelBn, i.variantLabelEn)}
                      </span>
                    ) : null}
                  </p>
                  <span className="shrink-0 text-sm font-bold tabular-nums">
                    {formatPrice(lang, i.price * i.quantity)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {onSetQuantity ? (
                    <QuantityStepper
                      value={i.quantity}
                      max={i.stock}
                      onChange={(next) => onSetQuantity(i.key, next)}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      × {formatNumber(lang, i.quantity)}
                    </span>
                  )}
                  {onRemove ? (
                    <button
                      type="button"
                      onClick={() => onRemove(i.key)}
                      className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
                    >
                      {tr(lang, "remove")}
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>

        <dl className="mt-4 grid gap-1.5 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{tr(lang, "subtotal")}</dt>
            <dd className="font-semibold tabular-nums">{formatPrice(lang, subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{tr(lang, "deliveryCharge")}</dt>
            <dd className="font-semibold tabular-nums">
              {delivery === 0 ? tr(lang, "free") : formatPrice(lang, delivery)}
            </dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base">
            <dt className="font-bold">{tr(lang, "total")}</dt>
            <dd className="font-bold tabular-nums text-primary">{formatPrice(lang, total)}</dd>
          </div>
        </dl>
      </div>

      {failed ? (
        <p className="rounded-sm border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {tr(lang, "orderFailed")}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || items.length === 0}
        className="rounded-sm bg-primary px-6 py-3.5 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {pending ? tr(lang, "placing") : tr(lang, "placeOrder")}
      </button>
      <p className="text-center text-xs text-muted-foreground">{tr(lang, "codNote")}</p>
    </form>
  );
}
