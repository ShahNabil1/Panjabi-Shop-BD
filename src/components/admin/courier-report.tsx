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

type Theme = { from: string; to: string; ring: string; accent: string };

const COURIER_THEME: Record<string, Theme> = {
  all: { from: "#3b2a4d", to: "#6d4c7d", ring: "#e9d5f0", accent: "#f5e9fa" },
  steadfast: { from: "#0b7a3b", to: "#14a85a", ring: "#c7ecd6", accent: "#e8f8ef" },
  pathao: { from: "#b31217", to: "#e23744", ring: "#f6cdd0", accent: "#fdeced" },
  redx: { from: "#1b1b1f", to: "#3d3d46", ring: "#d9d9de", accent: "#f1f1f4" },
  carrybee: { from: "#b8860b", to: "#f2b705", ring: "#f6e3ae", accent: "#fdf6e0" },
};

function CourierTile({
  name,
  logo,
  theme,
  total,
  delivered,
  cancelled,
  ratio,
}: {
  name: string;
  logo?: string | null;
  theme: Theme;
  total: number;
  delivered: number;
  cancelled: number;
  ratio: number;
}) {
  const pct = Math.max(0, Math.min(100, Number(ratio) || 0));
  return (
    <div
      className="overflow-hidden rounded-2xl border shadow-sm"
      style={{ borderColor: theme.ring, background: theme.accent }}
    >
      <div
        className="flex items-center justify-center gap-1.5 px-2 py-2"
        style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.to})` }}
      >
        {logo ? <img src={logo} alt="" className="size-4 rounded bg-white/90 object-contain" /> : null}
        <p className="text-[13px] font-extrabold uppercase tracking-wide text-white">{name}</p>
      </div>

      <div className="flex flex-col items-center px-2 py-3">
        <div
          className="grid size-16 place-items-center rounded-full"
          style={{
            background: `conic-gradient(${theme.to} ${pct * 3.6}deg, ${theme.ring} 0deg)`,
          }}
        >
          <div className="grid size-[52px] place-items-center rounded-full bg-white">
            <span
              className="text-[15px] font-extrabold tabular-nums"
              style={{ color: theme.from }}
            >
              {pct}%
            </span>
          </div>
        </div>

        <div className="mt-3 grid w-full grid-cols-3 gap-1 text-center">
          <div>
            <p className="text-sm font-extrabold tabular-nums text-slate-900">{total}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total</p>
          </div>
          <div>
            <p className="text-sm font-extrabold tabular-nums text-emerald-700">{delivered}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Done</p>
          </div>
          <div>
            <p className="text-sm font-extrabold tabular-nums text-rose-700">{cancelled}</p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Cancel</p>
          </div>
        </div>
      </div>
    </div>
  );
}

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
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <CourierTile
              name="All"
              theme={COURIER_THEME.all}
              total={data.summary.total_parcel}
              delivered={data.summary.success_parcel}
              cancelled={data.summary.cancelled_parcel}
              ratio={data.summary.success_ratio}
            />

            {data.couriers
              .filter((c) => VISIBLE_COURIERS.includes(c.key.toLowerCase()))
              .sort(
                (a, b) =>
                  VISIBLE_COURIERS.indexOf(a.key.toLowerCase()) -
                  VISIBLE_COURIERS.indexOf(b.key.toLowerCase()),
              )
              .map((c) => (
                <CourierTile
                  key={c.key}
                  name={c.name}
                  logo={c.logo}
                  theme={COURIER_THEME[c.key.toLowerCase()] ?? COURIER_THEME.all}
                  total={c.total_parcel}
                  delivered={c.success_parcel}
                  cancelled={c.cancelled_parcel}
                  ratio={c.success_ratio}
                />
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
