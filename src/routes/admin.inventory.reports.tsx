import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, TrendingDown, TrendingUp } from "lucide-react";

import { inventoryReport } from "@/lib/inventory.functions";
import { money } from "@/lib/inventory.shared";
import { AdminHeading, EmptyState, Panel, StatCard } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/inventory/reports")({
  component: InventoryReports,
});

const ranges = [7, 30, 90, 180] as const;

const num = (n: number) => n.toLocaleString("en-US");
const cover = (d: number | null) => (d == null ? "—" : `${Math.round(d)}d`);

function InventoryReports() {
  const [days, setDays] = useState<number>(30);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "inventory", "report", days],
    queryFn: () => inventoryReport({ data: { days } }),
    staleTime: 60_000,
  });

  const exportPlan = () => {
    if (!data) return;
    const head = "SKU,Item,Variant,On hand,Reorder point,Suggested qty,Estimated cost\n";
    const body = data.reorderPlan
      .map((r) =>
        [r.sku, r.name, r.variantLabel ?? "", r.onHand, r.reorderPoint, r.suggestQty, Math.round(r.estimatedCost)]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([head + body], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `purchase-plan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <AdminHeading
        title="Inventory reports"
        description="নির্দিষ্ট সময়ের COGS, রাইট-অফ, প্যাকেজিং খরচ, দ্রুত-চলা ও বসে থাকা স্টক এবং পরের চালানের সাজেশন।"
      />

      <div className="flex flex-wrap items-center gap-2">
        {ranges.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-[1.03] ${
              days === d
                ? "ig-gradient-soft border-primary/40 text-foreground"
                : "border-border bg-background/60 text-muted-foreground hover:border-primary/30"
            }`}
          >
            Last {d} days
          </button>
        ))}
      </div>

      {isLoading || !data ? (
        <p className="py-16 text-center text-xs text-muted-foreground">Building report…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Stock value (cost)"
              value={money(data.valuation.product.cost + data.valuation.packaging.cost)}
              tip="পণ্য ও প্যাকেজিং মিলিয়ে আজকের ওয়েটেড অ্যাভারেজ কেনা দামে মোট মূল্য।"
            />
            <StatCard
              label="COGS in period"
              value={money(data.flow.cogs)}
              tip="এই সময়ে বিক্রি হয়ে বেরিয়ে যাওয়া পণ্যের কেনা-দামের হিসাব।"
            />
            <StatCard
              label="Write-offs"
              value={money(data.flow.writeOffValue)}
              tone={data.flow.writeOffValue > 0 ? "bad" : "default"}
              tip="ড্যামেজ, হারানো ও মেয়াদোত্তীর্ণ পণ্যের ক্ষতি।"
            />
            <StatCard
              label="Packaging cost"
              value={money(data.flow.packagingValue)}
              tip={`এই সময়ে ব্যবহৃত ${num(data.flow.packagingQty)} পিস প্যাকেজিং ম্যাটেরিয়ালের খরচ।`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Purchased in" value={`${num(data.flow.purchaseQty)} pcs`} tip={money(data.flow.purchaseValue)} />
            <StatCard label="Sold out" value={`${num(data.flow.soldQty)} pcs`} tip="বিক্রি ও এক্সচেঞ্জে বেরোনো ইউনিট।" />
            <StatCard label="Returned in" value={`${num(data.flow.returnQty)} pcs`} tip={money(data.flow.returnValue)} />
            <StatCard
              label="Low / out of stock"
              value={`${num(data.valuation.lowStock)} / ${num(data.valuation.outOfStock)}`}
              tone={data.valuation.outOfStock > 0 ? "bad" : "default"}
              tip="রি-অর্ডার পয়েন্টে নেমে আসা ও শূন্য হয়ে যাওয়া SKU সংখ্যা।"
            />
          </div>

          <Panel className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="size-4 text-emerald-600" /> Purchase plan
              </h3>
              <Button size="sm" variant="outline" className="rounded-lg" onClick={exportPlan}>
                <Download className="mr-1.5 size-3.5" /> Export CSV
              </Button>
            </div>
            {data.reorderPlan.length === 0 ? (
              <EmptyState title="No item is below its reorder point" hint="সব SKU নিরাপদ স্টকে আছে।" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                      <th className="px-2 py-2 text-left font-semibold">Item</th>
                      <th className="px-2 py-2 text-left font-semibold">SKU</th>
                      <th className="px-2 py-2 text-right font-semibold">On hand</th>
                      <th className="px-2 py-2 text-right font-semibold">Reorder point</th>
                      <th className="px-2 py-2 text-right font-semibold">Days cover</th>
                      <th className="px-2 py-2 text-right font-semibold">Order qty</th>
                      <th className="px-2 py-2 text-right font-semibold">Est. cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.reorderPlan.map((r) => (
                      <tr key={r.key} className="border-b border-border/60 hover:bg-accent/50">
                        <td className="max-w-[260px] px-2 py-2.5">
                          <p className="truncate font-medium">{r.name}</p>
                          {r.variantLabel ? (
                            <p className="truncate text-[11px] text-muted-foreground">{r.variantLabel}</p>
                          ) : null}
                        </td>
                        <td className="font-en px-2 py-2.5 text-xs text-muted-foreground">{r.sku}</td>
                        <td className="font-en px-2 py-2.5 text-right tabular-nums">{r.onHand}</td>
                        <td className="font-en px-2 py-2.5 text-right tabular-nums">{r.reorderPoint}</td>
                        <td className="font-en px-2 py-2.5 text-right tabular-nums">{cover(r.daysCover)}</td>
                        <td className="font-en px-2 py-2.5 text-right font-bold tabular-nums text-primary">
                          {r.suggestQty}
                        </td>
                        <td className="font-en px-2 py-2.5 text-right tabular-nums">{money(r.estimatedCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp className="size-4 text-primary" /> Top movers
              </h3>
              {data.topMovers.length === 0 ? (
                <EmptyState title="No sales movement in this period" hint="সময়সীমা বাড়িয়ে দেখুন।" />
              ) : (
                <ul className="space-y-2">
                  {data.topMovers.map((r) => (
                    <li
                      key={r.key}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        <p className="font-en truncate text-[11px] text-muted-foreground">
                          {r.sku} · on hand {r.onHand} · cover {cover(r.daysCover)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-en text-sm font-bold tabular-nums">{r.qty} pcs</p>
                        <p className="font-en text-[11px] text-muted-foreground">{money(r.cogs)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <TrendingDown className="size-4 text-amber-600" /> Dead stock
              </h3>
              {data.deadStock.length === 0 ? (
                <EmptyState title="Everything moved at least once" hint="কোনো পণ্য বসে নেই।" />
              ) : (
                <ul className="space-y-2">
                  {data.deadStock.map((r) => (
                    <li
                      key={r.key}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        <p className="font-en truncate text-[11px] text-muted-foreground">
                          {r.sku} · idle {r.idleDays == null ? "—" : `${r.idleDays}d`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-en text-sm font-bold tabular-nums">{r.onHand} pcs</p>
                        <p className="font-en text-[11px] text-muted-foreground">{money(r.costValue)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
