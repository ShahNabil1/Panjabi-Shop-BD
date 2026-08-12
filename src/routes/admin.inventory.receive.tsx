import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PackagePlus, Plus, Trash2 } from "lucide-react";

import { inventorySuppliers, receiveStock } from "@/lib/inventory.functions";
import { money } from "@/lib/inventory.shared";
import { ItemPicker, type PickableItem } from "@/components/admin/inventory/item-picker";
import { AdminHeading, InfoTip, Panel, StatCard, TipTitle } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/inventory/receive")({
  component: ReceiveInventory,
});

type Line = {
  uid: string;
  item: PickableItem | null;
  quantity: number;
  unitCost: number;
  batchCode: string;
  expiryDate: string;
};

const newLine = (): Line => ({
  uid: crypto.randomUUID(),
  item: null,
  quantity: 1,
  unitCost: 0,
  batchCode: "",
  expiryDate: "",
});

const fieldClass =
  "rounded-xl border-border/80 bg-background/70 transition-all duration-200 focus-visible:border-primary/60 focus-visible:ring-primary/25";

function ReceiveInventory() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [supplierId, setSupplierId] = useState<string>("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [extraCost, setExtraCost] = useState(0);
  const [note, setNote] = useState("");

  const { data: suppliers = [] } = useQuery({
    queryKey: ["admin", "inventory", "suppliers"],
    queryFn: () => inventorySuppliers(),
    staleTime: 5 * 60 * 1000,
  });

  const totals = useMemo(() => {
    const units = lines.reduce((s, l) => s + (l.item ? l.quantity : 0), 0);
    const goods = lines.reduce((s, l) => s + (l.item ? l.quantity * l.unitCost : 0), 0);
    return { units, goods, grand: goods + extraCost };
  }, [lines, extraCost]);

  const patch = (uid: string, next: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...next } : l)));

  const submit = useMutation({
    mutationFn: () => {
      const ready = lines.filter((l) => l.item && l.quantity > 0);
      if (ready.length === 0) throw new Error("Add at least one item with a quantity");
      // Freight / duty is spread across the whole receipt, proportional to units.
      const share = totals.units > 0 ? extraCost / totals.units : 0;
      return receiveStock({
        data: {
          supplierId: supplierId || null,
          invoiceNo,
          receivedAt: null,
          note,
          lines: ready.map((l) => ({
            productId: l.item!.productId,
            variantId: l.item!.variantId,
            packagingId: l.item!.packagingId,
            sku: l.item!.sku === "—" ? "" : l.item!.sku,
            quantity: l.quantity,
            unitCost: l.unitCost,
            extraCost: share * l.quantity,
            batchCode: l.batchCode,
            expiryDate: l.expiryDate || null,
          })),
        },
      });
    },
    onSuccess: async (res) => {
      toast.success(`${res.received} item(s) received into stock`);
      await qc.invalidateQueries({ queryKey: ["admin", "inventory"] });
      void navigate({ to: "/admin/inventory/live" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <AdminHeading
        title="Add inventory"
        description="নতুন কেনা মাল স্টকে তুলুন — প্রতিটি লট আলাদা ব্যাচ হিসেবে সেভ হয়।"
        backTo="/admin/inventory"
        backLabel="Inventory"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel className="space-y-4">
          <TipTitle
            title="Items received"
            icon={<PackagePlus className="size-4 text-primary" />}
            tip="বারকোড স্ক্যান করলেই আইটেম বসে যাবে — প্রোডাক্ট/ভেরিয়েন্টের SKU-ই বারকোড। প্রতিটি লাইনের কেনা দাম আলাদা হতে পারে; সিস্টেম নিজেই ওয়েটেড অ্যাভারেজ কস্ট হিসাব করবে।"
          />

          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div
                key={line.uid}
                className="admin-rise space-y-3 rounded-xl border border-border/80 bg-background/50 p-3 transition-colors duration-200 hover:border-primary/25"
              >
                <div className="flex items-center gap-2">
                  <span className="font-en grid size-6 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-bold">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <ItemPicker
                      value={line.item}
                      autoFocus={idx === 0}
                      onSelect={(item) =>
                        patch(line.uid, { item, unitCost: line.unitCost || 0 })
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 rounded-lg text-muted-foreground transition-colors hover:text-destructive"
                    onClick={() =>
                      setLines((prev) =>
                        prev.length === 1 ? [newLine()] : prev.filter((l) => l.uid !== line.uid),
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="grid gap-2 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Quantity
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) => patch(line.uid, { quantity: Number(e.target.value) })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Buying price
                      <InfoTip text="এইবারের প্রতি পিস কেনা দাম। আগের বারের দামের সাথে মিলিয়ে গড় কস্ট আপডেট হবে।" />
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={line.unitCost}
                      onChange={(e) => patch(line.uid, { unitCost: Number(e.target.value) })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Batch code
                      <InfoTip text="ঐচ্ছিক। একই প্রোডাক্টের আলাদা লট আলাদা করে চিনতে ব্যবহার করুন।" />
                    </Label>
                    <Input
                      value={line.batchCode}
                      onChange={(e) => patch(line.uid, { batchCode: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Expiry
                      <InfoTip text="মেয়াদ থাকলে দিন — আগে মেয়াদ শেষ হওয়া ব্যাচ আগে বিক্রির জন্য ড্যাশবোর্ডে অ্যালার্ট আসবে।" />
                    </Label>
                    <Input
                      type="date"
                      value={line.expiryDate}
                      onChange={(e) => patch(line.uid, { expiryDate: e.target.value })}
                      className={fieldClass}
                    />
                  </div>
                </div>

                {line.item ? (
                  <p className="font-en text-[11px] text-muted-foreground">
                    {line.item.sku} · line total {money(line.quantity * line.unitCost)}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full rounded-xl border-dashed transition-all duration-200 hover:scale-[1.01] hover:border-primary/40"
            onClick={() => setLines((prev) => [...prev, newLine()])}
          >
            <Plus className="size-4" />
            Add another item
          </Button>
        </Panel>

        <div className="space-y-4">
          <Panel className="space-y-3">
            <TipTitle
              title="Purchase details"
              tip="সাপ্লায়ার ও ইনভয়েস নম্বর দিলে পরে কোন লট কার কাছ থেকে এসেছিল তা ট্র্যাক করা যাবে।"
            />
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Supplier
              </Label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="h-10 w-full rounded-xl border border-border/80 bg-background/70 px-3 text-sm transition-all duration-200 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/25"
              >
                <option value="">Not specified</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Invoice / memo no.
              </Label>
              <Input
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Freight / other cost
                <InfoTip text="পুরো চালানের ট্রান্সপোর্ট বা অন্যান্য খরচ। পিস অনুপাতে প্রতিটি আইটেমের কস্টে যোগ হবে (landed cost)।" />
              </Label>
              <Input
                type="number"
                min={0}
                value={extraCost}
                onChange={(e) => setExtraCost(Number(e.target.value))}
                className={fieldClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Note
              </Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} />
            </div>
          </Panel>

          <div className="grid gap-3">
            <StatCard
              label="Units"
              value={totals.units.toLocaleString("en-US")}
              tip="এই চালানে মোট কত পিস ঢুকছে।"
            />
            <StatCard
              label="Goods value"
              value={money(totals.goods)}
              tip="সব লাইনের কেনা দামের যোগফল (ফ্রেইট ছাড়া)।"
            />
            <StatCard
              label="Landed total"
              value={money(totals.grand)}
              tone="good"
              tip="ফ্রেইট ও অন্যান্য খরচসহ চালানের প্রকৃত খরচ।"
            />
          </div>

          <Button
            className="ig-gradient w-full rounded-xl py-6 text-base transition-transform duration-300 hover:scale-[1.02]"
            loading={submit.isPending}
            onClick={() => submit.mutate()}
          >
            Receive into stock
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            স্টক রেকর্ড কখনও মুছে যায় না — ভুল হলে রিভার্সাল এন্ট্রি দিয়ে ঠিক করা হয়।
          </p>
        </div>
      </div>
    </div>
  );
}
