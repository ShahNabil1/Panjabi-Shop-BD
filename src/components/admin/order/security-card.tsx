import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Fingerprint, Globe, NotebookPen, Phone, Shield, ShieldCheck, ShieldX } from "lucide-react";

import type { BlockKind } from "@/lib/admin-schema";
import { adminAddOrderNote, adminSetBlocked } from "@/lib/order-admin.functions";
import { Panel } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type NoteRow = {
  id: string;
  body: string;
  author_name: string | null;
  created_at: string;
};

const dt = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    timeZone: "Asia/Dhaka",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

/** Fulfillment placeholder — courier booking becomes functional in a later phase. */
export function FulfillmentCard({ status, source }: { status: string; source: string }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Fulfillment
        </h2>
        <div className="rounded-xl border border-border/70 bg-background/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Physical shipment
          </p>
          <span className="mt-2 inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-800 ring-1 ring-indigo-200">
            {status === "pending" ? "Pending" : status}
          </span>
        </div>
      </Panel>

      <Panel className="space-y-3">
        <h2 className="text-sm font-bold">Order Source</h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
          {source}
        </span>
      </Panel>
    </div>
  );
}

const kindIcon = { ip: Globe, fingerprint: Fingerprint, phone: Phone } as const;
const kindLabel = { ip: "IP Address", fingerprint: "Fingerprint", phone: "Phone" } as const;

/** Block / unblock the customer's IP, device fingerprint and phone number. */
export function SecurityCard({
  orderId,
  identifiers,
  blocked,
}: {
  orderId: string;
  identifiers: Array<{ kind: BlockKind; value: string | null }>;
  blocked: Array<{ kind: string; value: string }>;
}) {
  const qc = useQueryClient();
  const present = identifiers.filter(
    (i): i is { kind: BlockKind; value: string } => Boolean(i.value),
  );
  const [selected, setSelected] = useState<string[]>([]);

  const isBlocked = (kind: string, value: string) =>
    blocked.some((b) => b.kind === kind && b.value === value);

  const mutate = useMutation({
    mutationFn: (action: "block" | "unblock") =>
      adminSetBlocked({
        data: {
          orderId,
          action,
          targets: present.filter((p) => selected.includes(p.value)),
        },
      }),
    onSuccess: async (_r, action) => {
      toast.success(action === "block" ? "Identifiers blocked" : "Identifiers unblocked");
      setSelected([]);
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Panel className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Shield className="size-4 text-primary" />
          Device &amp; Security
        </h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelected(present.map((p) => p.value))}
          >
            Select all
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={selected.length === 0 || mutate.isPending}
            onClick={() => mutate.mutate("block")}
          >
            <ShieldX className="size-3.5" />
            Block
          </Button>
          <Button
            size="sm"
            disabled={selected.length === 0 || mutate.isPending}
            onClick={() => mutate.mutate("unblock")}
          >
            <ShieldCheck className="size-3.5" />
            Unblock
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {present.length === 0 ? (
          <p className="text-sm text-muted-foreground">No identifiers captured for this order.</p>
        ) : (
          present.map((item) => {
            const Icon = kindIcon[item.kind];
            const active = !isBlocked(item.kind, item.value);
            return (
              <div
                key={`${item.kind}-${item.value}`}
                className="space-y-2 rounded-xl border border-border/70 bg-background/60 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    <Icon className="size-3.5" />
                    {kindLabel[item.kind]}
                  </span>
                  <Checkbox
                    checked={selected.includes(item.value)}
                    onCheckedChange={(v) =>
                      setSelected((s) =>
                        v ? [...s, item.value] : s.filter((x) => x !== item.value),
                      )
                    }
                  />
                </div>
                <p className="break-all font-mono text-xs text-foreground">{item.value}</p>
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
                    active
                      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                      : "bg-rose-50 text-rose-800 ring-rose-200",
                  )}
                >
                  {active ? "Active" : "Blocked"}
                </span>
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Select any combination and use Block or Unblock. Blocked identifiers cannot place new
        orders — enforced server-side at checkout.
      </p>
    </Panel>
  );
}

/** Staff-only notes. Never visible to the customer. */
export function InternalNotesCard({ orderId, notes }: { orderId: string; notes: NoteRow[] }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const add = useMutation({
    mutationFn: () => adminAddOrderNote({ data: { orderId, body } }),
    onSuccess: async () => {
      setBody("");
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteOrderNote({ data: { id } }),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ["admin"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Panel className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <NotebookPen className="size-4 text-primary" />
        Internal Notes (staff only)
      </h2>
      <div className="flex items-start gap-2">
        <Textarea
          rows={2}
          className="rounded-xl"
          placeholder="Only staff can see this…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button
          size="sm"
          disabled={add.isPending || body.trim().length === 0}
          onClick={() => add.mutate()}
        >
          Add
        </Button>
      </div>

      {notes.length === 0 ? (
        <p className="text-xs text-muted-foreground">No internal notes yet.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3"
            >
              <div className="min-w-0">
                <p className="whitespace-pre-wrap text-sm">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {n.author_name ?? "Staff"} · {dt(n.created_at)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Delete note"
                className="text-muted-foreground transition-colors hover:text-destructive"
                onClick={() => remove.mutate(n.id)}
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
