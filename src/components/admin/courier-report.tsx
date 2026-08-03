import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ShieldAlert, Truck } from "lucide-react";
import { toast } from "sonner";

import { courierCheck } from "@/lib/courier.functions";
import { Panel } from "@/components/admin/kit";
import { BrandLoader } from "@/components/admin/brand-loader";
import { Button } from "@/components/ui/button";
import { ratioTone } from "@/components/admin/courier-status";
import { cn } from "@/lib/utils";

const VISIBLE_COURIERS = ["steadfast", "pathao", "redx", "carrybee"];

export function CourierReport({ phone }: { phone: string }) {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "courier", "check", phone],
    queryFn: () => courierCheck({ data: { phone, refresh: false } }),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const refresh = useMutation({
    mutationFn: () => courierCheck({ data: { phone, refresh: true } }),
    onSuccess: (fresh) => {
      qc.setQueryData(["admin", "courier", "check", phone], fresh);
      qc.invalidateQueries({ queryKey: ["admin", "courier", "ratios"] });
      toast.success("Courier data refreshed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Panel>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="ig-text inline-flex items-center gap-2 text-base font-bold">
          <Truck className="size-5 text-primary" />
          Courier Fraud Check
        </h2>
        <div className="flex items-center gap-2">
          {data ? (
            <span className="text-[11px] text-muted-foreground">
              Cached: {new Date(data.checkedAt).toLocaleString("en-GB")}
            </span>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            disabled={refresh.isPending}
            onClick={() => refresh.mutate()}
          >
            <RefreshCw className={cn("size-4", refresh.isPending && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading || refresh.isPending ? (
        <BrandLoader size="sm" message="Loading courier data…" className="py-6" />
      ) : error ? (
        <p className="mt-3 text-sm text-rose-700">{(error as Error).message}</p>
      ) : !data ? (
        <p className="mt-3 text-sm text-muted-foreground">No courier data.</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <div className="flex flex-col items-center rounded-xl border border-border bg-muted/40 p-2 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                All
              </p>
              <div className="mt-1.5 grid w-full grid-cols-3 gap-1 text-[11px]">
                <div>
                  <p className="font-bold text-foreground tabular-nums">{data.summary.total_parcel}</p>
                  <p className="text-[10px] font-medium text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="font-bold text-emerald-700 tabular-nums">{data.summary.success_parcel}</p>
                  <p className="text-[10px] font-medium text-muted-foreground">Delivered</p>
                </div>
                <div>
                  <p className="font-bold text-rose-700 tabular-nums">{data.summary.cancelled_parcel}</p>
                  <p className="text-[10px] font-medium text-muted-foreground">Cancelled</p>
                </div>
              </div>
              <span
                className={cn(
                  "mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-bold ring-1 tabular-nums",
                  ratioTone(data.summary.success_ratio),
                )}
              >
                {data.summary.success_ratio}%
              </span>
            </div>

            {data.couriers
              .filter((c) => VISIBLE_COURIERS.includes(c.key.toLowerCase()))
              .sort(
                (a, b) =>
                  VISIBLE_COURIERS.indexOf(a.key.toLowerCase()) -
                  VISIBLE_COURIERS.indexOf(b.key.toLowerCase()),
              )
              .map((c) => (
                <div
                  key={c.key}
                  className="flex flex-col items-center rounded-xl border border-border bg-card p-2 text-center"
                >
                  <p className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {c.logo ? (
                      <img src={c.logo} alt="" className="size-3.5 rounded object-contain" />
                    ) : null}
                    {c.name}
                  </p>
                  <div className="mt-1.5 grid w-full grid-cols-3 gap-1 text-[11px]">
                    <div>
                      <p className="font-bold text-foreground tabular-nums">{c.total_parcel}</p>
                      <p className="text-[10px] font-medium text-muted-foreground">Total</p>
                    </div>
                    <div>
                      <p className="font-bold text-emerald-700 tabular-nums">{c.success_parcel}</p>
                      <p className="text-[10px] font-medium text-muted-foreground">Delivered</p>
                    </div>
                    <div>
                      <p className="font-bold text-rose-700 tabular-nums">{c.cancelled_parcel}</p>
                      <p className="text-[10px] font-medium text-muted-foreground">Cancelled</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-bold ring-1 tabular-nums",
                      ratioTone(c.success_ratio),
                    )}
                  >
                    {c.success_ratio}%
                  </span>
                </div>
              ))}
          </div>

          {data.reports.length > 0 ? (
            <div className="mt-4 space-y-2 border-t border-border pt-3">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700">
                <ShieldAlert className="size-3.5" />
                Merchant reports ({data.reports.length})
              </p>
              <ul className="space-y-2">
                {data.reports.map((r) => (
                  <li key={r.id} className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs">
                    <div className="flex flex-wrap items-center gap-2 font-semibold text-rose-900">
                      {r.courierLogo ? (
                        <img src={r.courierLogo} alt="" className="size-4 rounded object-contain" />
                      ) : null}
                      {r.courierName ?? "Report"}
                      {r.name ? <span className="text-rose-700">· {r.name}</span> : null}
                      {r.created_at ? (
                        <span className="font-normal text-rose-700">
                          {new Date(r.created_at).toLocaleDateString("en-GB")}
                        </span>
                      ) : null}
                    </div>
                    {r.details ? <p className="mt-1 text-rose-800">{r.details}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </Panel>
  );
}
