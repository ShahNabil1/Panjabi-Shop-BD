import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { closePeriod, closingList, closingPreview, reopenPeriod } from "@/lib/closing.functions";
import { recentPeriods } from "@/lib/closing.shared";
import { money } from "@/lib/inventory.shared";
import { AdminHeading, EmptyState, Panel, StatCard } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/inventory/closing")({
  component: MonthlyClosing,
  head: () => ({
    meta: [
      { title: "Monthly Closing · Upoharkabbo Admin" },
      {
        name: "description",
        content: "Lock monthly inventory valuation, opening/closing stock value and supplier dues.",
      },
      { property: "og:title", content: "Monthly Closing · Upoharkabbo Admin" },
      { property: "og:description", content: "Inventory and finance month-end closing for Upoharkabbo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function MonthlyClosing() {
  const periods = recentPeriods();
  const [period, setPeriod] = useState<string>(periods[1] ?? periods[0]!);
  const [note, setNote] = useState("");
  const qc = useQueryClient();

  const preview = useQuery({
    queryKey: ["admin", "closing", "preview", period],
    queryFn: () => closingPreview({ data: { period } }),
    staleTime: 30_000,
  });

  const list = useQuery({
    queryKey: ["admin", "closing", "list"],
    queryFn: () => closingList(),
    staleTime: 30_000,
  });

  const locked = list.data?.find((c) => c.period === period) ?? null;

  const close = useMutation({
    mutationFn: () => closePeriod({ data: { period, note } }),
    onSuccess: () => {
      toast.success(`${period} মাস ক্লোজ হয়েছে`);
      setNote("");
      void qc.invalidateQueries({ queryKey: ["admin", "closing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reopen = useMutation({
    mutationFn: (id: string) => reopenPeriod({ data: { id } }),
    onSuccess: () => {
      toast.success("মাস আবার খোলা হলো");
      void qc.invalidateQueries({ queryKey: ["admin", "closing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const p = preview.data;

  return (
    <div className="space-y-5">
      <AdminHeading
        title="Monthly closing"
        description="মাস শেষে ওপেনিং ও ক্লোজিং স্টক ভ্যালু, ক্রয়, COGS, রাইট-অফ, প্যাকেজিং খরচ ও সাপ্লায়ার বকেয়া হিসাব করে লক করে রাখুন।"
      />

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold"
        >
          {periods.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        {locked ? (
          <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold">
            Locked · {new Date(locked.createdAt).toLocaleDateString()} · {locked.closedByName ?? "—"}
          </span>
        ) : (
          <span className="rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
            Open
          </span>
        )}
      </div>

      {preview.isLoading || !p ? (
        <p className="py-16 text-center text-xs text-muted-foreground">Calculating…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Opening value" value={money(p.openingValue)} tip="মাসের শুরুতে হাতে থাকা স্টকের কেনা-দামের মূল্য।" />
            <StatCard label="Purchases in" value={money(p.purchaseValue)} tip="এই মাসে রিসিভ করা মালের মোট কেনা মূল্য।" />
            <StatCard label="COGS" value={money(p.cogsValue)} tip="বিক্রি হওয়া মালের কেনা-দাম (রিটার্ন বাদ দিয়ে)।" />
            <StatCard
              label="Closing value"
              value={money(p.closingValue)}
              tone="good"
              tip="মাস শেষে হাতে থাকা স্টকের মোট মূল্য।"
            />
            <StatCard
              label="Write-offs"
              value={money(p.writeoffValue)}
              tone={p.writeoffValue > 0 ? "bad" : "default"}
              tip="ড্যামেজ, হারানো ও মেয়াদোত্তীর্ণ পণ্যের ক্ষতি।"
            />
            <StatCard label="Packaging used" value={money(p.packagingValue)} tip="এই মাসে খরচ হওয়া প্যাকেজিং সামগ্রীর মূল্য।" />
            <StatCard label="Adjustments" value={money(p.adjustmentValue)} tip="অডিট ও ম্যানুয়াল সমন্বয়ের নিট প্রভাব।" />
            <StatCard
              label="Supplier due"
              value={money(p.supplierDue)}
              tone={p.supplierDue > 0 ? "bad" : "good"}
              tip={`মাস শেষ পর্যন্ত বিল ${Math.round(p.supplierBilled)} − পরিশোধ ${Math.round(p.supplierPaid)}।`}
            />
          </div>

          <Panel className="space-y-3">
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                {locked ? "Month locked" : "Lock this month"}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {locked
                  ? "লক করা হিসাব সংরক্ষিত আছে। নতুন এন্ট্রি যোগ হলে আবার লক করলে আপডেট হবে।"
                  : "লক করলে আজকের হিসাব স্ন্যাপশট হিসেবে সংরক্ষণ হবে।"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="নোট (ঐচ্ছিক)"
                className="h-9 max-w-sm text-xs"
              />
              <Button size="sm" onClick={() => close.mutate()} disabled={close.isPending}>
                <Lock className="mr-1.5 h-3.5 w-3.5" />
                {locked ? "Re-lock with today's numbers" : "Lock month"}
              </Button>
              {locked ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => reopen.mutate(locked.id)}
                  disabled={reopen.isPending}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Reopen
                </Button>
              ) : null}
            </div>
          </Panel>

          <Panel className="space-y-3">
            <div>
              <h2 className="text-sm font-bold tracking-tight">Item movement ({p.periodStart} → {p.periodEnd})</h2>
              <p className="text-[11px] text-muted-foreground">মূল্য অনুযায়ী সাজানো — ওপেনিং, ইন, আউট ও ক্লোজিং।</p>
            </div>
            {p.lines.length === 0 ? (
              <EmptyState title="কোনো ডাটা নেই" hint="এই মাসে কোনো স্টক মুভমেন্ট বা ব্যালান্স নেই।" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="py-2 pr-3">Item</th>
                      <th className="py-2 pr-3 text-right">Opening</th>
                      <th className="py-2 pr-3 text-right">In</th>
                      <th className="py-2 pr-3 text-right">Out</th>
                      <th className="py-2 pr-3 text-right">Closing</th>
                      <th className="py-2 pr-3 text-right">Unit cost</th>
                      <th className="py-2 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.lines.slice(0, 200).map((l) => (
                      <tr key={l.key} className="border-b border-border/60 last:border-0">
                        <td className="py-2.5 pr-3">
                          <p className="font-semibold text-foreground">{l.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {l.sku} · {l.kind === "packaging" ? "Packaging" : "Product"}
                          </p>
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{l.openingQty}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums text-emerald-600">+{l.inQty}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums text-destructive">-{l.outQty}</td>
                        <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">{l.closingQty}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{money(l.unitCost)}</td>
                        <td className="py-2.5 text-right tabular-nums">{money(l.closingValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel className="space-y-3">
            <div>
              <h2 className="text-sm font-bold tracking-tight">Closed months</h2>
              <p className="text-[11px] text-muted-foreground">লক করা মাসগুলোর সংরক্ষিত হিসাব।</p>
            </div>
            {(list.data ?? []).length === 0 ? (
              <EmptyState title="এখনো কোনো মাস লক করা হয়নি" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-xs">
                  <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="py-2 pr-3">Month</th>
                      <th className="py-2 pr-3 text-right">Opening</th>
                      <th className="py-2 pr-3 text-right">Purchases</th>
                      <th className="py-2 pr-3 text-right">COGS</th>
                      <th className="py-2 pr-3 text-right">Closing</th>
                      <th className="py-2 pr-3 text-right">Supplier due</th>
                      <th className="py-2">Locked by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(list.data ?? []).map((c) => (
                      <tr
                        key={c.id}
                        className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-muted/40"
                        onClick={() => setPeriod(c.period)}
                      >
                        <td className="py-2.5 pr-3 font-semibold">{c.period}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{money(c.openingValue)}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{money(c.purchaseValue)}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{money(c.cogsValue)}</td>
                        <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">{money(c.closingValue)}</td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{money(c.supplierDue)}</td>
                        <td className="py-2.5 text-muted-foreground">{c.closedByName ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
