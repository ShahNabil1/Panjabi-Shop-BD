import { Link } from "@tanstack/react-router";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Boxes, ImageOff, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { adminDeleteProduct, adminListProducts } from "@/lib/admin.functions";
import type { ProductKind } from "@/lib/admin-schema";
import { AdminHeading, EmptyState, Panel } from "@/components/admin/kit";
import { BrandLoader } from "@/components/admin/brand-loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/i18n";

type Row = {
  id: string;
  slug: string;
  kind: ProductKind;
  name_bn: string;
  price: number;
  cost_price: number;
  sku: string | null;
  is_active: boolean;
  product_images: Array<{ url: string; sort_order: number }> | null;
  product_variants: Array<{ id: string }> | null;
};

function EditLink({ kind, id, children }: { kind: ProductKind; id: string; children: React.ReactNode }) {
  if (kind === "combo") {
    return (
      <Link to="/admin/combos/$id" params={{ id }}>
        {children}
      </Link>
    );
  }
  if (kind === "component") {
    return (
      <Link to="/admin/sub-products/$id" params={{ id }}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/admin/products/$id" params={{ id }}>
      {children}
    </Link>
  );
}

export function ProductList({
  kind,
  title,
  description,
  newLabel,
}: {
  kind: ProductKind;
  title: string;
  description: string;
  newLabel: string;
}) {
  const qc = useQueryClient();
  const confirmDialog = useConfirm();
  const [term, setTerm] = useState("");
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "products", kind],
    queryFn: () => adminListProducts({ data: { kind } }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteProduct({ data: { id } }),
    onSuccess: async () => {
      toast.success("Deleted");
      await qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = ((data ?? []) as unknown as Row[]).filter((p) =>
    `${p.name_bn} ${p.slug} ${p.sku ?? ""}`.toLowerCase().includes(term.trim().toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <AdminHeading
        title={title}
        description={description}
        action={
          <Button
            asChild
            size="sm"
            className="ig-gradient rounded-xl transition-transform duration-300 hover:scale-[1.03]"
          >
            <EditLink kind={kind} id="new">
              <span className="flex items-center">
                <Plus className="mr-1.5 size-4" /> {newLabel}
              </span>
            </EditLink>
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="rounded-xl pl-8"
          placeholder="নাম, স্লাগ বা SKU দিয়ে খুঁজুন…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>

      <Panel className="p-0">
        {isLoading ? (
          <BrandLoader size="md" className="py-8" />
        ) : isError ? (
          <div className="space-y-3 p-6 text-center">
            <p className="text-sm font-semibold text-destructive">Could not load</p>
            <p className="text-xs text-muted-foreground">
              {(error as Error)?.message || "Server request failed."}
            </p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-4">
            <EmptyState title="Nothing here yet" hint={`Use the ${newLabel} button above.`} />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((p, idx) => {
              const image = [...(p.product_images ?? [])].sort(
                (a, b) => a.sort_order - b.sort_order,
              )[0];
              const variantCount = p.product_variants?.length ?? 0;
              return (
                <li
                  key={p.id}
                  className="admin-rise group flex items-center gap-3 px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:bg-muted/40"
                  style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
                >
                  <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted transition-transform duration-300 group-hover:scale-105">
                    {image ? (
                      <img src={image.url} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <ImageOff className="size-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name_bn}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 truncate text-xs text-muted-foreground">
                      {p.kind === "component" ? (
                        <span>{p.sku ?? "No SKU"}</span>
                      ) : (
                        <span>/{p.slug}</span>
                      )}
                      {variantCount > 0 ? (
                        <>
                          <span aria-hidden>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Boxes className="size-3" /> {variantCount}
                          </span>
                        </>
                      ) : null}
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                          p.is_active
                            ? "bg-emerald-100 text-emerald-900 ring-emerald-200"
                            : "bg-stone-200 text-stone-800 ring-stone-300",
                        )}
                      >
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </p>
                  </div>
                  <span className="ig-text text-sm font-bold tabular-nums">
                    {formatPrice("bn", p.price)}
                  </span>
                  <div className="flex gap-1">
                    <Button asChild size="sm" variant="outline" className="rounded-xl">
                      <EditLink kind={p.kind} id={p.id}>
                        <span className="flex items-center">
                          <Pencil className="mr-1.5 size-3.5" /> Edit
                        </span>
                      </EditLink>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-xl text-muted-foreground hover:text-destructive"
                      loading={remove.isPending}
                      onClick={() => {
                        void confirmDialog({
                          title: "Delete this item?",
                          description: "It will be removed from the storefront.",
                        }).then((ok) => ok && remove.mutate(p.id));
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
