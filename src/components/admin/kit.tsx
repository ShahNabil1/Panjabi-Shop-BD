import type { CSSProperties, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";


import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  onBlur,
  hint,
  placeholder,
  type = "text",
  className,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  hint?: string;
  placeholder?: string;
  type?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Field label={label} {...(hint ? { hint } : {})} {...(className ? { className } : {})}>
      <Input
        className={inputClass}
        type={type}
        value={value}
        disabled={disabled ?? false}
        placeholder={placeholder ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
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
  incomplete: "bg-orange-100 text-orange-900 ring-orange-200",
  no_response: "bg-zinc-100 text-zinc-800 ring-zinc-200",
  good_no_response: "bg-teal-100 text-teal-900 ring-teal-200",
  hold: "bg-fuchsia-100 text-fuchsia-900 ring-fuchsia-200",
  pre_order: "bg-purple-100 text-purple-900 ring-purple-200",
  scheduled_order: "bg-cyan-100 text-cyan-900 ring-cyan-200",
  rts: "bg-sky-100 text-sky-900 ring-sky-200",
  shipped: "bg-violet-100 text-violet-900 ring-violet-200",
  courier_hold: "bg-orange-100 text-orange-900 ring-orange-200",
  partial_delivered: "bg-lime-100 text-lime-900 ring-lime-200",
  exchange: "bg-violet-200 text-violet-900 ring-violet-300",
  delivered: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  cancelled: "bg-rose-100 text-rose-900 ring-rose-200",
  awaiting_return: "bg-amber-100 text-amber-900 ring-amber-200",
  returned: "bg-stone-200 text-stone-800 ring-stone-300",
  unpaid: "bg-red-100 text-red-900 ring-red-200",
  paid: "bg-green-100 text-green-900 ring-green-200",
  lost_damaged: "bg-neutral-800 text-neutral-100 ring-neutral-700",
};

export const statusLabels: Record<string, string> = {
  pending: "Pending",
  rts: "RTS",
  confirmed: "Confirmed",
  processing: "Processing",
  incomplete: "Incomplete",
  no_response: "No Response",
  good_no_response: "Good But No Response",
  hold: "Hold",
  pre_order: "Pre-Order",
  scheduled_order: "Scheduled Order",
  shipped: "Shipped",
  courier_hold: "Courier Hold",
  partial_delivered: "Partial Delivered",
  exchange: "Exchange",
  delivered: "Delivered",
  cancelled: "Cancelled",
  awaiting_return: "Awaiting Return",
  returned: "Returned",
  unpaid: "Unpaid",
  paid: "Paid",
  lost_damaged: "Lost/Damaged",
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

/* ------------------------------------------------------------------ */
/* Tooltip helper — replaces long helper paragraphs under titles.      */
/* ------------------------------------------------------------------ */

export function InfoTip({ text, className }: { text: string; className?: string }) {
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={text}
            onClick={(e) => e.preventDefault()}
            className={cn(
              "inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-border/70 text-[10px] font-bold text-muted-foreground transition-all duration-200 hover:scale-110 hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
              className,
            )}
          >
            i
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[260px] rounded-xl border border-border/70 bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground shadow-lg"
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Section title with an inline tooltip instead of a description line. */
export function TipTitle({
  title,
  tip,
  icon,
  className,
}: {
  title: string;
  tip: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("flex items-center gap-2 text-sm font-bold", className)}>
      {icon}
      {title}
      <InfoTip text={tip} />
    </h2>
  );
}

/** Compact KPI tile used across the Inventory module. */
export function StatCard({
  label,
  value,
  sub,
  tip,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tip?: string;
  icon?: ReactNode;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const tones: Record<string, string> = {
    default: "text-foreground",
    good: "text-emerald-600",
    warn: "text-amber-600",
    bad: "text-rose-600",
  };
  return (
    <div className="admin-rise group rounded-2xl border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
        {tip ? <InfoTip text={tip} /> : null}
      </div>
      <p
        className={cn(
          "font-en mt-2 text-2xl font-bold tabular-nums tracking-tight transition-colors",
          tones[tone],
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
