import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ShieldAlert, Truck } from "lucide-react";
import { toast } from "sonner";

import { courierCheck } from "@/lib/courier.functions";
import { Panel } from "@/components/admin/kit";
import { BrandLoader } from "@/components/admin/brand-loader";
import { Button } from "@/components/ui/button";
import { ratioTone } from "@/components/admin/courier-status";
import { cn } from "@/lib/utils";

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="ig-text inline-flex items-center gap-2 text-sm font-bold">
          <Truck className="size-4" />
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
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-sm font-bold ring-1 tabular-nums",
                ratioTone(data.summary.success_ratio),
              )}
            >
              {data.summary.success_ratio}%
            </span>
            <span className="text-sm text-muted-foreground">
              Total <b className="text-foreground tabular-nums">{data.summary.total_parcel}</b> ·
              Delivered{" "}
              <b className="text-emerald-700 tabular-nums">{data.summary.success_parcel}</b> ·
              Cancelled{" "}
              <b className="text-rose-700 tabular-nums">{data.summary.cancelled_parcel}</b>
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-1.5 font-semibold">Courier</th>
                  <th className="py-1.5 text-right font-semibold">Total</th>
                  <th className="py-1.5 text-right font-semibold">Delivered</th>
                  <th className="py-1.5 text-right font-semibold">Cancelled</th>
                  <th className="py-1.5 text-right font-semibold">Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.couriers.map((c) => (
                  <tr key={c.key}>
                    <td className="py-2">
                      <span className="inline-flex items-center gap-2">
                        {c.logo ? (
                          <img src={c.logo} alt={c.name} className="size-5 rounded object-contain" />
                        ) : null}
                        <span className="font-medium">{c.name}</span>
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums">{c.total_parcel}</td>
                    <td className="py-2 text-right tabular-nums text-emerald-700">
                      {c.success_parcel}
                    </td>
                    <td className="py-2 text-right tabular-nums text-rose-700">
                      {c.cancelled_parcel}
                    </td>
                    <td className="py-2 text-right font-semibold tabular-nums">
                      {c.success_ratio}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
