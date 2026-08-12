import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, SlidersHorizontal } from "lucide-react";

import { inventoryLevels, setReorderRule } from "@/lib/inventory.functions";
import { money, type InventoryRow } from "@/lib/inventory.shared";
import { AdminHeading, EmptyState, InfoTip, Panel, StatCard } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/inventory/live")({
  component: LiveInventory,
});

type Filter = "all" | "low" | "out" | "packaging";

function stockTone(row: InventoryRow) {
  if (row.qtyOnHand <= 0) return "bg-rose-100 text-rose-900";
  if (row.reorderPoint > 0 && row.qtyOnHand <= row.reorderPoint)
    return "bg-amber-100 text-amber-900";
  return "bg-emerald-100 text-emerald-900";
}

function LiveInventory() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ point: 0, qty: 0 });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "inventory", "levels"],
    queryFn: () => inventoryLevels(),
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: (levelId: string) =>
      setReorderRule({
        data: { levelId, reorderPoint: draft.point, reorderQty: draft.qty },
      }),
    onSuccess: async () => {
      toast.success("Reorder rule saved");
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ["admin", "inventory", "levels"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "packaging" && r.kind !== "packaging") return false;
      if (filter !== "packaging" && r.kind === "packaging") return false;
      if (filter === "low" && !(r.reorderPoint > 0 && r.qtyOnHand <= r.reorderPoint)) return false;
      if (filter === "out" && r.qtyOnHand > 0) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        (r.variantLabel ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, filter]);

  const totals = useMemo(
    () => ({
      cost: visible.reduce((s, r) => s + r.qtyOnHand * r.wacCost, 0),
      retail: visible.reduce((s, r) => s + r.qtyOnHand * r.sellPrice, 0),
      units: visible.reduce((s, r) => s + r.qtyOnHand, 0),
    }),
    [visible],
  );

  const filters: Array<{ id: Filter; label: string }> = [
    { id: "all", label: "Products" },
    { id: "low", label: "Low stock" },
    { id: "out", label: "Out of stock" },
    { id: "packaging", label: "Packaging" },
  ];

  return (
    <div className="space-y-5">
      <AdminHeading
        title="Live inventory"
        description="রিড-অনলি ভিউ — সার্চ করুন SKU বা নাম দিয়ে, ভ্যালু দেখুন কেনা ও বিক্রির দামে।"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Units in view"
          value={totals.units.toLocaleString("en-US")}
          tip="বর্তমান ফিল্টার ও সার্চে যতগুলো পিস স্টকে আছে।"
        />
        <StatCard
          label="Value at cost"
          value={money(totals.cost)}
          tip="ওয়েটেড অ্যাভারেজ কেনা দামে হিসাব করা মূল্য।"
        />
        <StatCard
          label="Value at retail"
          value={money(totals.retail)}
          tone="good"
          tip="আজকের সেলিং প্রাইসে হিসাব করা সম্ভাব্য বিক্রয়মূল্য।"
        />
      </div>

      <Panel className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Scan barcode or type SKU / name…"
              className="rounded-xl border-border/80 bg-background/70 pl-9 transition-all duration-200 focus-visible:border-primary/60 focus-visible:ring-primary/25"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-[1.03] ${
                  filter === f.id
                    ? "ig-gradient-soft border-primary/40 text-foreground"
                    : "border-border bg-background/60 text-muted-foreground hover:border-primary/30"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-xs text-muted-foreground">Loading inventory…</p>
        ) : visible.length === 0 ? (
          <EmptyState
            title="No item matches this view"
            hint="সার্চ বা ফিল্টার বদলে দেখুন, অথবা নতুন ইনভেন্টরি যোগ করুন।"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  <th className="px-2 py-2 text-left font-semibold">Item</th>
                  <th className="px-2 py-2 text-left font-semibold">SKU / Barcode</th>
                  <th className="px-2 py-2 text-right font-semibold">On hand</th>
                  <th className="px-2 py-2 text-right font-semibold">Avg cost</th>
                  <th className="px-2 py-2 text-right font-semibold">Cost value</th>
                  <th className="px-2 py-2 text-right font-semibold">Retail value</th>
                  <th className="px-2 py-2 text-right font-semibold">
                    <span className="inline-flex items-center gap-1">
                      Reorder
                      <InfoTip text="রি-অর্ডার পয়েন্টে নামলে ড্যাশবোর্ডে অ্যালার্ট আসবে। কোয়ান্টিটি = সাজেস্টেড অর্ডার সাইজ।" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/60 transition-colors duration-150 hover:bg-accent/50"
                  >
                    <td className="max-w-[260px] px-2 py-2.5">
                      <p className="truncate font-medium">{r.name}</p>
                      {r.variantLabel ? (
                        <p className="truncate text-[11px] text-muted-foreground">
                          {r.variantLabel}
                        </p>
                      ) : null}
                    </td>
                    <td className="font-en px-2 py-2.5 text-xs text-muted-foreground">{r.sku}</td>
                    <td className="px-2 py-2.5 text-right">
                      <span
                        className={`font-en inline-block rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${stockTone(r)}`}
                      >
                        {r.qtyOnHand}
                      </span>
                    </td>
                    <td className="font-en px-2 py-2.5 text-right tabular-nums">
                      {money(r.wacCost)}
                    </td>
                    <td className="font-en px-2 py-2.5 text-right tabular-nums">
                      {money(r.qtyOnHand * r.wacCost)}
                    </td>
                    <td className="font-en px-2 py-2.5 text-right tabular-nums text-emerald-700">
                      {money(r.qtyOnHand * r.sellPrice)}
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      {editing === r.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Input
                            type="number"
                            value={draft.point}
                            onChange={(e) => setDraft({ ...draft, point: Number(e.target.value) })}
                            className="h-8 w-16 rounded-lg text-right"
                          />
                          <Input
                            type="number"
                            value={draft.qty}
                            onChange={(e) => setDraft({ ...draft, qty: Number(e.target.value) })}
                            className="h-8 w-16 rounded-lg text-right"
                          />
                          <Button
                            size="sm"
                            className="h-8 rounded-lg"
                            loading={save.isPending}
                            onClick={() => save.mutate(r.id)}
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(r.id);
                            setDraft({ point: r.reorderPoint, qty: r.reorderQty });
                          }}
                          className="font-en inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold tabular-nums transition-all duration-200 hover:scale-[1.03] hover:border-primary/40 hover:text-primary"
                        >
                          <SlidersHorizontal className="size-3" />
                          {r.reorderPoint} / {r.reorderQty}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
