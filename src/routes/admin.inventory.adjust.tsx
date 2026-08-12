import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertOctagon, RotateCcw } from "lucide-react";

import { adjustStock, inventoryMovements, reverseMovement } from "@/lib/inventory.functions";
import { money, movementLabels, type WriteOffType } from "@/lib/inventory.shared";
import { ItemPicker, type PickableItem } from "@/components/admin/inventory/item-picker";
import { AdminHeading, EmptyState, InfoTip, Panel, TipTitle } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useConfirm } from "@/components/ui/confirm-dialog";

export const Route = createFileRoute("/admin/inventory/adjust")({
  component: AdjustInventory,
});

type Kind = WriteOffType | "adjust_in" | "adjust_out";

const KINDS: Array<{ id: Kind; label: string; tip: string }> = [
  {
    id: "damage_out",
    label: "Damaged",
    tip: "ভাঙা বা নষ্ট প্রোডাক্ট। ডিসকাউন্টে বিক্রি করার সুযোগ থাকলে স্যালভেজ প্রাইস দিন — লস হিসাবে সেটাই বাদ যাবে।",
  },
  {
    id: "loss_out",
    label: "Lost",
    tip: "হারিয়ে যাওয়া বা কুরিয়ারে খোয়া যাওয়া মাল। কুরিয়ার ক্ষতিপূরণ দিলে সেটি স্যালভেজ প্রাইসে লিখুন।",
  },
  {
    id: "expiry_out",
    label: "Expired",
    tip: "মেয়াদোত্তীর্ণ ব্যাচ। ড্যাশবোর্ডের Expiring তালিকা দেখে আগেই ব্যবস্থা নিন।",
  },
  {
    id: "adjust_in",
    label: "Count correction (+)",
    tip: "ফিজিক্যাল কাউন্টে সিস্টেমের চেয়ে বেশি পাওয়া গেলে ব্যবহার করুন।",
  },
  {
    id: "adjust_out",
    label: "Count correction (−)",
    tip: "ফিজিক্যাল কাউন্টে সিস্টেমের চেয়ে কম পাওয়া গেলে ব্যবহার করুন।",
  },
];

const fieldClass =
  "rounded-xl border-border/80 bg-background/70 transition-all duration-200 focus-visible:border-primary/60 focus-visible:ring-primary/25";

function AdjustInventory() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [kind, setKind] = useState<Kind>("damage_out");
  const [item, setItem] = useState<PickableItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [salvage, setSalvage] = useState("");
  const [note, setNote] = useState("");

  const { data: moves = [] } = useQuery({
    queryKey: ["admin", "inventory", "movements", 30],
    queryFn: () => inventoryMovements({ data: { limit: 30 } }),
    staleTime: 30_000,
  });

  const writeOffs = useMemo(
    () =>
      moves.filter((m) =>
        ["damage_out", "loss_out", "expiry_out", "adjust_in", "adjust_out", "reversal"].includes(
          m.movementType,
        ),
      ),
    [moves],
  );

  const submit = useMutation({
    mutationFn: () => {
      if (!item) throw new Error("Pick an item first");
      return adjustStock({
        data: {
          productId: item.productId,
          variantId: item.variantId,
          packagingId: item.packagingId,
          sku: item.sku === "—" ? "" : item.sku,
          movementType: kind,
          quantity,
          reason,
          salvagePrice: salvage.trim() === "" ? null : Number(salvage),
          note,
        },
      });
    },
    onSuccess: async () => {
      toast.success("Stock adjusted");
      setItem(null);
      setQuantity(1);
      setReason("");
      setSalvage("");
      setNote("");
      await qc.invalidateQueries({ queryKey: ["admin", "inventory"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const undo = useMutation({
    mutationFn: (id: string) => reverseMovement({ data: { id } }),
    onSuccess: async () => {
      toast.success("Movement reversed");
      await qc.invalidateQueries({ queryKey: ["admin", "inventory"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const showSalvage = kind === "damage_out" || kind === "loss_out";

  return (
    <div className="space-y-5">
      <AdminHeading
        title="Loss, damage & corrections"
        description="নষ্ট, হারানো বা মেয়াদোত্তীর্ণ মাল বাদ দিন — অথবা গণনার ভুল সংশোধন করুন।"
        backTo="/admin/inventory"
        backLabel="Inventory"
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <Panel className="space-y-4">
          <TipTitle
            title="Record an adjustment"
            icon={<AlertOctagon className="size-4 text-amber-500" />}
            tip="প্রতিটি এন্ট্রি স্থায়ীভাবে লগ হয়। ভুল হলে মুছে ফেলার বদলে রিভার্স করুন — হিসাব পরিষ্কার থাকে।"
          />

          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                title={k.tip}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-[1.04] ${
                  kind === k.id
                    ? "ig-gradient-soft border-primary/40 text-foreground"
                    : "border-border bg-background/60 text-muted-foreground hover:border-primary/30"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <InfoTip text={KINDS.find((k) => k.id === kind)!.tip} />
            {KINDS.find((k) => k.id === kind)!.label}
          </p>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Item
            </Label>
            <ItemPicker value={item} onSelect={setItem} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Quantity
              </Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className={fieldClass}
              />
            </div>
            {showSalvage ? (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Salvage / compensation
                  <InfoTip text="ডিসকাউন্টে বিক্রির দাম বা কুরিয়ারের দেওয়া ক্ষতিপূরণ। নেট লস = কস্ট − এই এমাউন্ট।" />
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={salvage}
                  onChange={(e) => setSalvage(e.target.value)}
                  className={fieldClass}
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Reason
            </Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Courier damage on RTO parcel"
              className={fieldClass}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Note
            </Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} />
          </div>

          <Button
            className="ig-gradient w-full rounded-xl py-5 transition-transform duration-300 hover:scale-[1.02]"
            loading={submit.isPending}
            onClick={() => submit.mutate()}
          >
            Save adjustment
          </Button>
        </Panel>

        <Panel className="space-y-3">
          <TipTitle
            title="Recent adjustments"
            tip="সাম্প্রতিক রাইট-অফ ও সংশোধন। ভুল হলে Reverse চাপলে ঠিক উল্টো এন্ট্রি বসে স্টক আগের অবস্থায় ফিরে যাবে।"
          />
          {writeOffs.length === 0 ? (
            <EmptyState title="No adjustment recorded yet" hint="এখানে সব রাইট-অফ ও সংশোধন দেখা যাবে।" />
          ) : (
            <ul className="divide-y divide-border/70">
              {writeOffs.map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{m.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {movementLabels[m.movementType]}
                      {m.reason ? ` · ${m.reason}` : ""}
                      {m.actorName ? ` · ${m.actorName}` : ""} ·{" "}
                      {new Date(m.createdAt).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <span className="font-en shrink-0 text-sm font-bold tabular-nums">
                    {m.quantity > 0 ? "+" : ""}
                    {m.quantity}
                  </span>
                  <span className="font-en hidden shrink-0 text-xs text-muted-foreground sm:block">
                    {money(m.totalCost)}
                  </span>
                  {m.movementType === "reversal" ? null : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 rounded-lg text-muted-foreground transition-colors hover:text-primary"
                      onClick={async () => {
                        const ok = await confirm({
                          title: "Reverse this movement?",
                          description:
                            "একটি উল্টো এন্ট্রি যোগ হবে এবং স্টক আগের অবস্থায় ফিরে যাবে। মূল রেকর্ড মুছবে না।",
                          confirmText: "Reverse",
                        });
                        if (ok) undo.mutate(m.id);
                      }}
                    >
                      <RotateCcw className="size-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
