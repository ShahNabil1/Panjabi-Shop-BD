import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

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
  Field,
  NumberField,
  Panel,
  TextField,
  ToggleField,
} from "@/components/admin/kit";
import { ImageField } from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  offer: "অফার",
  featured: "ফিচার্ড",
  flash: "ফ্ল্যাশ সেল",
  new_arrival: "নতুন এসেছে",
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
      toast.success("প্রমোশন সেভ হয়েছে");
      setDraft(emptyPromotion());
      await qc.invalidateQueries({ queryKey: ["admin", "promotions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeletePromotion({ data: { id } }),
    onSuccess: async () => {
      toast.success("মুছে ফেলা হয়েছে");
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

  return (
    <div className="space-y-6 pb-16">
      <AdminHeading
        title="প্রমোশন ও অফার"
        description="বিদ্যমান প্রোডাক্ট বেছে নিয়ে হোমপেইজে অফার সেকশন তৈরি করুন।"
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="space-y-4">
          <h2 className="text-sm font-bold">{draft.id ? "প্রমোশন এডিট" : "নতুন প্রমোশন"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="শিরোনাম (বাংলা)"
              value={draft.title_bn}
              onChange={(v) => setDraft({ ...draft, title_bn: v })}
            />
            <TextField
              label="শিরোনাম (English)"
              value={draft.title_en}
              onChange={(v) =>
                setDraft({ ...draft, title_en: v, slug: draft.slug || slugify(v) })
              }
            />
            <TextField
              label="স্লাগ"
              value={draft.slug}
              onChange={(v) => setDraft({ ...draft, slug: slugify(v) })}
              hint="URL: /offers/your-slug"
            />
            <Field label="ধরন">
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
              label="সাবটাইটেল (বাংলা)"
              value={draft.subtitle_bn ?? ""}
              onChange={(v) => setDraft({ ...draft, subtitle_bn: v || null })}
            />
            <ImageField
              label="ব্যানার ছবি"
              folder="promotions"
              value={draft.banner_url}
              onChange={(v) => setDraft({ ...draft, banner_url: v })}
            />
            <TextField
              label="শুরু (YYYY-MM-DD)"
              value={(draft.starts_at ?? "").slice(0, 10)}
              onChange={(v) => setDraft({ ...draft, starts_at: v || null })}
            />
            <TextField
              label="শেষ (YYYY-MM-DD)"
              value={(draft.ends_at ?? "").slice(0, 10)}
              onChange={(v) => setDraft({ ...draft, ends_at: v || null })}
            />
            <NumberField
              label="সর্ট অর্ডার"
              value={draft.sort_order}
              onChange={(v) => setDraft({ ...draft, sort_order: v })}
            />
            <TextField
              label="Meta title"
              value={draft.meta_title ?? ""}
              onChange={(v) => setDraft({ ...draft, meta_title: v || null })}
            />
          </div>
          <AreaField
            label="Meta description"
            rows={3}
            value={draft.meta_description ?? ""}
            onChange={(v) => setDraft({ ...draft, meta_description: v || null })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <ToggleField
              label="হোমপেইজে দেখান"
              checked={draft.show_on_home}
              onChange={(v) => setDraft({ ...draft, show_on_home: v })}
            />
            <ToggleField
              label="অ্যাক্টিভ"
              checked={draft.is_active}
              onChange={(v) => setDraft({ ...draft, is_active: v })}
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              প্রোডাক্ট বাছাই ({draft.product_ids.length})
            </p>
            <div className="mt-2 max-h-72 overflow-y-auto rounded-md border border-border">
              {(products.data ?? []).map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2 text-sm last:border-0 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={draft.product_ids.includes(p.id)}
                    onCheckedChange={() => toggleProduct(p.id)}
                  />
                  <span className="truncate">{p.name_bn}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button disabled={save.isPending} onClick={() => save.mutate(draft)}>
              সেভ করুন
            </Button>
            {draft.id ? (
              <Button variant="outline" onClick={() => setDraft(emptyPromotion())}>
                বাতিল
              </Button>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-0">
          <h2 className="border-b border-border p-4 text-sm font-bold">প্রমোশন তালিকা</h2>
          <ul className="divide-y divide-border">
            {(promotions.data ?? []).map((p) => (
              <li key={p.id} className="flex items-center gap-2 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.title_bn}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    /offers/{p.slug} · {(p.promotion_products ?? []).length} প্রোডাক্ট
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
                  এডিট
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("মুছে ফেলবেন?")) remove.mutate(p.id);
                  }}
                >
                  মুছুন
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
