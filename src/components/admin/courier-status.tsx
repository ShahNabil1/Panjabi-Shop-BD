import { useQuery } from "@tanstack/react-query";
import { PlugZap, Gauge } from "lucide-react";

import { courierConnectionStatus, courierPlan } from "@/lib/courier.functions";
import { cn } from "@/lib/utils";

export function CourierStatusBar() {
  const conn = useQuery({
    queryKey: ["admin", "courier", "connection"],
    queryFn: () => courierConnectionStatus(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const plan = useQuery({
    queryKey: ["admin", "courier", "plan"],
    queryFn: () => courierPlan(),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const ok = conn.data?.ok ?? false;
  const p = plan.data;

  return (
    <div className="admin-rise flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <PlugZap className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold">BD Courier</span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1",
            conn.isLoading
              ? "bg-muted text-muted-foreground ring-border"
              : ok
                ? "bg-emerald-100 text-emerald-900 ring-emerald-200"
                : "bg-rose-100 text-rose-900 ring-rose-200",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              conn.isLoading ? "bg-muted-foreground" : ok ? "bg-emerald-600" : "bg-rose-600",
            )}
          />
          {conn.isLoading ? "Checking…" : ok ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div className="h-5 w-px bg-border max-sm:hidden" />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Gauge className="size-3.5" />
          Plan:{" "}
          <span className="font-semibold text-foreground">
            {plan.isLoading ? "…" : (p?.planName ?? "—")}
          </span>
        </span>
        {p && p.ok ? (
          <>
            <span>
              Free left:{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {p.remainingFreeCalls}/{p.callLimit}
              </span>
            </span>
            <span>
              Paid left:{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {p.remainingPaidCalls}/{p.paidLimit}
              </span>
            </span>
            <span>
              Used:{" "}
              <span className="font-semibold text-foreground tabular-nums">{p.apiCalls}</span>
            </span>
            {p.expiresAt ? (
              <span>
                Expires:{" "}
                <span className="font-semibold text-foreground">
                  {new Date(p.expiresAt).toLocaleDateString("en-GB")} ({p.daysRemaining}d)
                </span>
              </span>
            ) : null}
          </>
        ) : p && !p.ok ? (
          <span className="text-rose-700">{p.message}</span>
        ) : null}
      </div>
    </div>
  );
}

export function ratioTone(ratio: number) {
  if (ratio >= 80) return "bg-emerald-100 text-emerald-900 ring-emerald-200";
  if (ratio >= 50) return "bg-amber-100 text-amber-900 ring-amber-200";
  return "bg-rose-100 text-rose-900 ring-rose-200";
}
