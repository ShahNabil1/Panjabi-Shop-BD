import type { CSSProperties, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";


import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function AdminHeading({
  title,
  description,
  action,
  backTo,
  backLabel = "Back",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  backTo?: string;
  backLabel?: string;
}) {
  if (backTo) {
    return (
      <div className="admin-rise flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-5">
        <Link
          to={backTo}
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-background px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="shrink-0">{action}</div>
      </div>
    );
  }

  return (
    <div className="admin-rise flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-5">
      <div className="relative pl-4">
        <span className="ig-gradient absolute left-0 top-1 h-[calc(100%-0.5rem)] w-1 rounded-full" />
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}


export function Panel({
  className,
  children,
  style,
}: {
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        "admin-rise rounded-2xl border border-border bg-card p-4 transition-colors duration-200 hover:border-primary/25 sm:p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("group/field space-y-1.5", className)}>
      <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground transition-colors group-focus-within/field:text-primary">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const inputClass =
  "rounded-xl border-border/80 bg-background/70 transition-all duration-200 focus-visible:border-primary/60 focus-visible:ring-primary/25";

export function TextField({
  label,
  value,
  onChange,
  hint,
  placeholder,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <Field label={label} {...(hint ? { hint } : {})} {...(className ? { className } : {})}>
      <Input
        className={inputClass}
        type={type}
        value={value}
        placeholder={placeholder ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  hint,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
  step?: number;
}) {
  return (
    <Field label={label} {...(hint ? { hint } : {})}>
      <Input
        className={inputClass}
        type="number"
        step={step ?? 1}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

export function AreaField({
  label,
  value,
  onChange,
  rows = 4,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <Field label={label} {...(hint ? { hint } : {})}>
      <Textarea
        className={inputClass}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition-all duration-300",
        checked
          ? "ig-gradient-soft border-primary/40"
          : "border-border bg-background/60 hover:border-primary/30",
      )}
    >
      <span className="text-sm font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="admin-rise rounded-2xl border border-dashed border-primary/25 bg-background/50 px-6 py-14 text-center">
      <p className="text-sm font-bold text-foreground">{title}</p>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const statusStyles: Record<string, string> = {
  pending: "bg-slate-100 text-slate-800 ring-slate-200",
  confirmed: "bg-sky-100 text-sky-900 ring-sky-200",
  processing: "bg-indigo-100 text-indigo-900 ring-indigo-200",
  shipped: "bg-violet-100 text-violet-900 ring-violet-200",
  delivered: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  cancelled: "bg-rose-100 text-rose-900 ring-rose-200",
  returned: "bg-stone-200 text-stone-800 ring-stone-300",
};

export const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 transition-transform duration-200 hover:scale-105",
        statusStyles[status] ?? "bg-muted text-muted-foreground ring-border",
      )}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
