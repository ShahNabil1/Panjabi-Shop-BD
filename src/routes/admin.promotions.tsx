import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ImageOff, Search, Trash2 } from "lucide-react";

import {
  adminDeletePromotion,
  adminListProducts,
  adminListPromotions,
  adminSavePromotion,
} from "@/lib/admin.functions";
import { promotionTypes, type PromotionInput } from "@/lib/admin-schema";
import {
  AdminHeading,
  AreaField,
  EmptyState,
  Field,
  NumberField,
  Panel,
  TextField,
  ToggleField,
} from "@/components/admin/kit";
import { ImageField } from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/promotions")({
  component: PromotionsPage,
});

const typeLabels: Record<string, string> = {
  offer: "Offer",
  featured: "Featured",
  flash: "Flash Sale",
  new_arrival: "New Arrival",
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function emptyPromotion(): PromotionInput {
  return {
    slug: "",
    title_bn: "",
    title_en: "",
    subtitle_bn: null,
    subtitle_en: null,
    type: "offer",
    banner_url: null,
    meta_title: null,
    meta_description: null,
    starts_at: null,
    ends_at: null,
    sort_order: 0,
    show_on_home: true,
    is_active: true,
    product_ids: [],
  };
}

function PromotionsPage() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<PromotionInput>(emptyPromotion());
  const [productQuery, setProductQuery] = useState("");

  const promotions = useQuery({
    queryKey: ["admin", "promotions"],
    queryFn: () => adminListPromotions(),
  });
  const products = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => adminListProducts(),
  });

  const save = useMutation({
    mutationFn: (input: PromotionInput) => adminSavePromotion({ data: input }),
    onSuccess: async () => {
      toast.success("Promotion saved");
      setDraft(emptyPromotion());
      await qc.invalidateQueries({ queryKey: ["admin", "promotions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeletePromotion({ data: { id } }),
    onSuccess: async () => {
      toast.success("Deleted");
      await qc.invalidateQueries({ queryKey: ["admin", "promotions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function toggleProduct(id: string) {
    setDraft((d) => ({
      ...d,
      product_ids: d.product_ids.includes(id)
        ? d.product_ids.filter((x) => x !== id)
        : [...d.product_ids, id],
    }));
  }

  const filteredProducts = useMemo(() => {
    const list = products.data ?? [];
    const q = productQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) =>
      `${p.name_bn} ${p.name_en}`.toLowerCase().includes(q),
    );
  }, [products.data, productQuery]);

  return (
    <div className="space-y-6 pb-16">
      <AdminHeading
        title="Promotions & Offers"
        description="Pick existing products to build a promo section for the homepage."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="space-y-4">
          <h2 className="text-sm font-bold">{draft.id ? "Edit Promotion" : "New Promotion"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Title"
              value={draft.title_bn}
              onChange={(v) =>
                setDraft({
                  ...draft,
                  title_bn: v,
                  title_en: v,
                  slug: draft.slug || slugify(v),
                })
              }
            />
            <TextField
              label="Slug"
              value={draft.slug}
              onChange={(v) => setDraft({ ...draft, slug: slugify(v) })}
              hint="URL: /offers/your-slug"
            />
            <Field label="Type">
              <Select
                value={draft.type}
                onValueChange={(v) => setDraft({ ...draft, type: v as PromotionInput["type"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {promotionTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {typeLabels[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <TextField
              label="Subtitle"
              value={draft.subtitle_bn ?? ""}
              onChange={(v) => setDraft({ ...draft, subtitle_bn: v || null, subtitle_en: v || null })}
            />
            <ImageField
              label="Banner Image"
              folder="promotions"
              value={draft.banner_url}
              onChange={(v) => setDraft({ ...draft, banner_url: v })}
            />
            <TextField
              label="Starts (YYYY-MM-DD)"
              value={(draft.starts_at ?? "").slice(0, 10)}
              onChange={(v) => setDraft({ ...draft, starts_at: v || null })}
            />
            <TextField
              label="Ends (YYYY-MM-DD)"
              value={(draft.ends_at ?? "").slice(0, 10)}
              onChange={(v) => setDraft({ ...draft, ends_at: v || null })}
            />
            <NumberField
              label="Sort Order"
              value={draft.sort_order}
              onChange={(v) => setDraft({ ...draft, sort_order: v })}
            />
            <TextField
              label="Meta Title"
              value={draft.meta_title ?? ""}
              onChange={(v) => setDraft({ ...draft, meta_title: v || null })}
            />
          </div>
          <AreaField
            label="Meta Description"
            rows={3}
            value={draft.meta_description ?? ""}
            onChange={(v) => setDraft({ ...draft, meta_description: v || null })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleField
              label="Show on Homepage"
              checked={draft.show_on_home}
              onChange={(v) => setDraft({ ...draft, show_on_home: v })}
            />
            <ToggleField
              label="Active"
              checked={draft.is_active}
              onChange={(v) => setDraft({ ...draft, is_active: v })}
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Select Products ({draft.product_ids.length})
              </p>
              <div className="relative w-full max-w-[220px]">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  placeholder="Search products..."
                  className="h-8 rounded-lg border-border/80 bg-background/70 pl-8 text-xs"
                />
              </div>
            </div>
            <div className="mt-2 max-h-[26rem] overflow-y-auto rounded-xl border border-border/70 bg-background/40 p-2">
              {filteredProducts.length === 0 ? (
                <EmptyState title="No products found" hint="Try a different search term." />
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {filteredProducts.map((p) => {
                    const selected = draft.product_ids.includes(p.id);
                    const thumb = (p.product_images ?? [])
                      .slice()
                      .sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => toggleProduct(p.id)}
                        className={cn(
                          "group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-20px_rgba(238,42,123,0.6)]",
                          selected
                            ? "ig-gradient-soft border-primary/50 ring-2 ig-ring"
                            : "border-border bg-card hover:border-primary/30",
                        )}
                      >
                        <div className="relative aspect-square w-full overflow-hidden bg-muted">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={p.name_bn}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <ImageOff className="h-5 w-5" />
                            </div>
                          )}
                          {selected ? (
                            <span className="admin-rise absolute right-1.5 top-1.5 rounded-full bg-card/90 p-0.5 shadow-sm">
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            </span>
                          ) : null}
                        </div>
                        <span className="truncate px-2 py-1.5 text-xs font-medium">{p.name_bn}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 z-10 -mx-4 flex gap-2 border-t border-border/70 bg-card/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5">
            <Button disabled={save.isPending} onClick={() => save.mutate(draft)}>
              Save
            </Button>
            {draft.id ? (
              <Button variant="outline" onClick={() => setDraft(emptyPromotion())}>
                Cancel
              </Button>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-0">
          <h2 className="border-b border-border p-4 text-sm font-bold">Promotion List</h2>
          {(promotions.data ?? []).length === 0 ? (
            <EmptyState title="No promotions yet" hint="Create one on the left." />
          ) : (
            <ul className="divide-y divide-border">
              {(promotions.data ?? []).map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 px-4 py-3 text-sm transition-colors duration-200 hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.title_bn}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      /offers/{p.slug} · {(p.promotion_products ?? []).length} products
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDraft({
                        ...(p as unknown as PromotionInput),
                        product_ids: (p.promotion_products ?? [])
                          .slice()
                          .sort((a, b) => a.sort_order - b.sort_order)
                          .map((pp) => pp.product_id),
                      })
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Delete this promotion?")) remove.mutate(p.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
