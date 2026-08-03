import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";

import { useCart, type CartItem } from "@/lib/cart-context";
import { useLang } from "@/lib/language-context";
import { formatNumber, formatPrice, pick, tr } from "@/lib/i18n";
import { placeOrder } from "@/lib/order.functions";
import type { DeliveryArea } from "@/lib/order-schema";
import { cn } from "@/lib/utils";

export type DeliveryRates = { inside_dhaka: number; outside_dhaka: number; freeAbove: number };

const inputClass =
  "w-full rounded-sm border border-border bg-background px-3 py-2.5 text-[15px] outline-none transition-colors focus:border-primary";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-foreground">{label}</span>
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
}: {
  items: CartItem[];
  rates: DeliveryRates;
  source: "website" | "landing";
  onPlaced?: () => void;
  compact?: boolean;
}) {
  const { lang } = useLang();
  const navigate = useNavigate();
  const submit = useServerFn(placeOrder);
  const { clear } = useCart();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState<DeliveryArea>("inside_dhaka");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    [items],
  );
  const delivery =
    rates.freeAbove > 0 && subtotal >= rates.freeAbove ? 0 : rates[area];
  const total = subtotal + delivery;

  const validate = () => {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next["name"] = tr(lang, "invalidForm");
    if (!/^01[3-9]\d{8}$/.test(phone.trim()))
      next["phone"] = lang === "bn" ? "সঠিক ১১ ডিজিটের নম্বর দিন" : "Enter a valid 11-digit number";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next["email"] = lang === "bn" ? "সঠিক ইমেইল দিন" : "Enter a valid email";
    if (address.trim().length < 6) next["address"] = tr(lang, "invalidForm");
    if (city.trim().length < 2) next["city"] = tr(lang, "invalidForm");
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
          customerEmail: email.trim(),
          addressLine: address.trim(),
          city: city.trim(),
          deliveryArea: area,
          note: note.trim(),
          source,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        },
      });
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

      <Field label={tr(lang, "address")} error={errors["address"]}>
        <textarea
          className={cn(inputClass, "min-h-20 resize-y")}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          autoComplete="street-address"
          maxLength={300}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr(lang, "city")} error={errors["city"]}>
          <input
            className={inputClass}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            autoComplete="address-level2"
            maxLength={80}
            required
          />
        </Field>
        <Field label={tr(lang, "area")}>
          <div className="grid grid-cols-2 gap-2">
            {(["inside_dhaka", "outside_dhaka"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setArea(value)}
                aria-pressed={area === value}
                className={cn(
                  "rounded-sm border px-3 py-2.5 text-sm font-semibold transition-colors",
                  area === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {tr(lang, value === "inside_dhaka" ? "insideDhaka" : "outsideDhaka")}
              </button>
            ))}
          </div>
        </Field>
      </div>

      {compact ? null : (
        <Field label={tr(lang, "email")} error={errors["email"]}>
          <input
            className={cn(inputClass, "font-en")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            maxLength={160}
          />
        </Field>
      )}

      <Field label={tr(lang, "note")}>
        <textarea
          className={cn(inputClass, "min-h-16 resize-y")}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
        />
      </Field>

      <div className="rounded-sm border border-border bg-card p-4">
        <ul className="grid gap-2 text-sm">
          {items.map((i) => (
            <li key={i.key} className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                {pick(lang, i.nameBn, i.nameEn)}
                {i.variantLabelBn ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · {pick(lang, i.variantLabelBn, i.variantLabelEn)}
                  </span>
                ) : null}
                <span className="text-muted-foreground"> × {formatNumber(lang, i.quantity)}</span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums">
                {formatPrice(lang, i.price * i.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 grid gap-1.5 border-t border-border pt-3 text-sm">
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
