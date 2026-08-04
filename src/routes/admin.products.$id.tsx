import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Link2, ImagePlus } from "lucide-react";

import { adminGetProduct, adminSaveProduct, adminTaxonomy } from "@/lib/admin.functions";
import type { ProductInput } from "@/lib/admin-schema";
import {
  AdminHeading,
  AreaField,
  Field,
  NumberField,
  Panel,
  TextField,
  ToggleField,
} from "@/components/admin/kit";
import { CropExistingButton, ImageUploadButton } from "@/components/admin/image-upload";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/products/$id")({
  component: ProductEditor,
});

type Draft = ProductInput;

function emptyDraft(): Draft {
  return {
    slug: "",
    category_id: "",
    subcategory_id: null,
    name_bn: "",
    name_en: "",
    short_description_bn: null,
    short_description_en: null,
    description_bn: null,
    description_en: null,
    specs: [],
    faq: [],
    price: 0,
    compare_at_price: null,
    stock: 0,
    sku: null,
    brand: null,
    badge_bn: null,
    badge_en: null,
    meta_title: null,
    meta_description: null,
    og_image_url: null,
    is_active: true,
    is_featured: false,
    sort_order: 0,
    images: [],
    variants: [],
  };
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function pick(bn: string | null | undefined, en: string | null | undefined) {
  return (bn && bn.trim().length > 0 ? bn : en) ?? "";
}

function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="text-sm font-bold tracking-tight">{title}</h2>
      {action}
    </div>
  );
}

function ProductEditor() {
  const { id } = useParams({ from: "/admin/products/$id" });
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const taxonomy = useQuery({ queryKey: ["admin", "taxonomy"], queryFn: () => adminTaxonomy() });
  const existing = useQuery({
    queryKey: ["admin", "product", id],
    queryFn: () => adminGetProduct({ data: { id } }),
    enabled: !isNew,
  });

  useEffect(() => {
    const p = existing.data as Record<string, unknown> | null | undefined;
    if (!p) return;
    const images = ((p["product_images"] as Array<Record<string, unknown>>) ?? []).sort(
      (a, b) => Number(a["sort_order"]) - Number(b["sort_order"]),
    );
    const variants = ((p["product_variants"] as Array<Record<string, unknown>>) ?? []).sort(
      (a, b) => Number(a["sort_order"]) - Number(b["sort_order"]),
    );
    const name = pick(p["name_bn"] as string, p["name_en"] as string);
    const shortDesc = pick(p["short_description_bn"] as string, p["short_description_en"] as string);
    const desc = pick(p["description_bn"] as string, p["description_en"] as string);
    const badge = pick(p["badge_bn"] as string, p["badge_en"] as string);
    setDraft({
      ...emptyDraft(),
      ...(p as unknown as Draft),
      name_bn: name,
      name_en: name,
      short_description_bn: shortDesc || null,
      short_description_en: shortDesc || null,
      description_bn: desc || null,
      description_en: desc || null,
      badge_bn: badge || null,
      badge_en: badge || null,
      price: Number(p["price"]),
      compare_at_price: p["compare_at_price"] == null ? null : Number(p["compare_at_price"]),
      specs: Array.isArray(p["specs"])
        ? (p["specs"] as Draft["specs"]).map((s) => {
            const label = pick(s.label_bn, s.label_en);
            const value = pick(s.value_bn, s.value_en);
            return { label_bn: label, label_en: label, value_bn: value, value_en: value };
          })
        : [],
      faq: Array.isArray(p["faq"])
        ? (p["faq"] as Draft["faq"]).map((f) => {
            const question = pick(f.question_bn, f.question_en);
            const answer = pick(f.answer_bn, f.answer_en);
            return {
              question_bn: question,
              question_en: question,
              answer_bn: answer,
              answer_en: answer,
            };
          })
        : [],
      images: images.map((img, i) => {
        const alt = pick(img["alt_bn"] as string, img["alt_en"] as string);
        return {
          url: String(img["url"] ?? ""),
          alt_bn: alt || null,
          alt_en: alt || null,
          sort_order: i,
        };
      }),
      variants: variants.map((v, i) => {
        const groupName = pick(v["group_name_bn"] as string, v["group_name_en"] as string);
        const value = pick(v["value_bn"] as string, v["value_en"] as string);
        return {
          group_name_bn: groupName,
          group_name_en: groupName,
          value_bn: value,
          value_en: value,
          sku: (v["sku"] as string | null) ?? null,
          price_delta: Number(v["price_delta"] ?? 0),
          stock: Number(v["stock"] ?? 0),
          sort_order: i,
          is_active: Boolean(v["is_active"]),
        };
      }),
    });
  }, [existing.data]);

  const save = useMutation({
    mutationFn: (input: Draft) => adminSaveProduct({ data: input }),
    onSuccess: async (res) => {
      toast.success("Saved successfully");
      await qc.invalidateQueries({ queryKey: ["admin"] });
      if (isNew) await navigate({ to: "/admin/products/$id", params: { id: res.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const subcategories = (taxonomy.data?.subcategories ?? []).filter(
    (s) => s.category_id === draft.category_id,
  );

  return (
    <div className="space-y-5 pb-28">
      <AdminHeading
        backTo="/admin/products"
        backLabel="Products"
        title={isNew ? "New product" : draft.name_bn || "Edit product"}
        description="Name, pricing, images, variants and SEO details."
      />


      <Panel className="admin-rise">
        <SectionHeading title="Basics" />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Name"
            value={draft.name_bn}
            onChange={(v) => setDraft((d) => ({ ...d, name_bn: v, name_en: v }))}
          />
          <TextField
            label="Slug"
            value={draft.slug}
            onChange={(v) => set("slug", slugify(v))}
            hint="URL: /p/your-slug"
          />
          <TextField label="SKU" value={draft.sku ?? ""} onChange={(v) => set("sku", v || null)} />
          <TextField
            label="Brand"
            value={draft.brand ?? ""}
            onChange={(v) => set("brand", v || null)}
          />
          <Field label="Category">
            <Select
              value={draft.category_id || "none"}
              onValueChange={(v) => {
                set("category_id", v === "none" ? "" : v);
                set("subcategory_id", null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select</SelectItem>
                {(taxonomy.data?.categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name_bn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Subcategory">
            <Select
              value={draft.subcategory_id ?? "none"}
              onValueChange={(v) => set("subcategory_id", v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {subcategories.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name_bn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <TextField
            label="Badge"
            value={draft.badge_bn ?? ""}
            onChange={(v) => setDraft((d) => ({ ...d, badge_bn: v || null, badge_en: v || null }))}
          />
          <div className="flex gap-3">
            <ToggleField label="Active" checked={draft.is_active} onChange={(v) => set("is_active", v)} />
            <ToggleField
              label="Featured"
              checked={draft.is_featured}
              onChange={(v) => set("is_featured", v)}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <AreaField
            label="Short description"
            rows={3}
            value={draft.short_description_bn ?? ""}
            onChange={(v) =>
              setDraft((d) => ({ ...d, short_description_bn: v || null, short_description_en: v || null }))
            }
          />
          <AreaField
            label="Full description"
            rows={7}
            value={draft.description_bn ?? ""}
            onChange={(v) =>
              setDraft((d) => ({ ...d, description_bn: v || null, description_en: v || null }))
            }
          />
        </div>
      </Panel>

      <Panel className="admin-rise" style={{ animationDelay: "60ms" }}>
        <SectionHeading title="Pricing & stock" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField label="Price (৳)" value={draft.price} onChange={(v) => set("price", v)} />
          <NumberField
            label="Compare-at price (৳)"
            value={draft.compare_at_price ?? 0}
            onChange={(v) => set("compare_at_price", v > 0 ? v : null)}
          />
          <NumberField label="Stock" value={draft.stock} onChange={(v) => set("stock", v)} />
          <NumberField
            label="Sort order"
            value={draft.sort_order}
            onChange={(v) => set("sort_order", v)}
          />
        </div>
      </Panel>

      <Panel className="admin-rise" style={{ animationDelay: "120ms" }}>
        <SectionHeading
          title="Media"
          action={
            <div className="flex items-center gap-2">
              <ImageUploadButton
                folder="products"
                multiple
                crop
                cropPreset="card"
                label="Upload images"
                onUploaded={(urls) =>
                  set("images", [
                    ...draft.images,
                    ...urls.map((url, k) => ({
                      url,
                      alt_bn: null,
                      alt_en: null,
                      sort_order: draft.images.length + k,
                    })),
                  ])
                }
              />
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() =>
                  set("images", [
                    ...draft.images,
                    { url: "", alt_bn: null, alt_en: null, sort_order: draft.images.length },
                  ])
                }
              >
                <Link2 className="mr-1.5 size-3.5" /> Add by URL
              </Button>
            </div>
          }
        />
        <p className="mb-3 text-[11px] text-muted-foreground">
          আপলোডের আগে অ্যাডভান্স ক্রপ টুলে কার্ড (4:5), স্কয়ার, প্রোডাক্ট পেইজ (3:4), ল্যান্ডিং (16:9)
          বা OG রেশিওতে ছবি ফ্রেম করা যায় — লাইভ ডিভাইস প্রিভিউসহ। সব ছবি ব্রাউজারেই WebP-তে
          কমপ্রেস হয় (সর্বোচ্চ 2000px)।
        </p>

        {draft.images.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
            <ImagePlus className="size-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No images yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {draft.images.map((img, i) => (
              <div
                key={i}
                className="group flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-background/50 p-2 transition-all duration-300 hover:border-primary/30 hover:bg-background/80"
              >
                <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-muted transition-transform duration-300 group-hover:scale-105">
                  {img.url ? (
                    <img src={img.url} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <Upload className="size-4" />
                    </div>
                  )}
                </div>
                <Input
                  className="min-w-56 flex-1 rounded-lg"
                  placeholder="Image URL"
                  value={img.url}
                  onChange={(e) =>
                    set(
                      "images",
                      draft.images.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)),
                    )
                  }
                />
                <Input
                  className="w-48 rounded-lg"
                  placeholder="Alt text"
                  value={img.alt_bn ?? ""}
                  onChange={(e) =>
                    set(
                      "images",
                      draft.images.map((x, j) =>
                        j === i ? { ...x, alt_bn: e.target.value || null, alt_en: e.target.value || null } : x,
                      ),
                    )
                  }
                />
                {img.url ? (
                  <CropExistingButton
                    folder="products"
                    url={img.url}
                    cropPreset={i === 0 ? "card" : "square"}
                    onCropped={(u) =>
                      set(
                        "images",
                        draft.images.map((x, j) => (j === i ? { ...x, url: u } : x)),
                      )
                    }
                  />
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-lg text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    set(
                      "images",
                      draft.images.filter((_, j) => j !== i),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel className="admin-rise" style={{ animationDelay: "180ms" }}>
        <SectionHeading
          title="Variants"
          action={
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() =>
                set("variants", [
                  ...draft.variants,
                  {
                    group_name_bn: "Size",
                    group_name_en: "Size",
                    value_bn: "",
                    value_en: "",
                    sku: null,
                    price_delta: 0,
                    stock: 0,
                    sort_order: draft.variants.length,
                    is_active: true,
                  },
                ])
              }
            >
              <Plus className="mr-1.5 size-3.5" /> Add variant
            </Button>
          }
        />
        {draft.variants.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No variants yet
          </p>
        ) : (
          <div className="space-y-2">
            {draft.variants.map((v, i) => (
              <div
                key={i}
                className="grid gap-2 rounded-xl border border-border/70 bg-background/50 p-3 transition-all duration-300 hover:border-primary/30 hover:bg-background/80 hover:shadow-sm sm:grid-cols-6"
              >
                <Input
                  className="rounded-lg"
                  placeholder="Group name"
                  value={v.group_name_bn}
                  onChange={(e) =>
                    patchVariant(i, { group_name_bn: e.target.value, group_name_en: e.target.value })
                  }
                />
                <Input
                  className="rounded-lg"
                  placeholder="Value"
                  value={v.value_bn}
                  onChange={(e) => patchVariant(i, { value_bn: e.target.value, value_en: e.target.value })}
                />
                <Input
                  className="rounded-lg"
                  placeholder="SKU"
                  value={v.sku ?? ""}
                  onChange={(e) => patchVariant(i, { sku: e.target.value || null })}
                />
                <Input
                  className="rounded-lg"
                  type="number"
                  placeholder="Price delta"
                  value={v.price_delta}
                  onChange={(e) => patchVariant(i, { price_delta: Number(e.target.value) })}
                />
                <Input
                  className="rounded-lg"
                  type="number"
                  placeholder="Stock"
                  value={v.stock}
                  onChange={(e) => patchVariant(i, { stock: Number(e.target.value) })}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-lg text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    set(
                      "variants",
                      draft.variants.filter((_, j) => j !== i),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel className="admin-rise" style={{ animationDelay: "240ms" }}>
        <SectionHeading
          title="Specifications"
          action={
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() =>
                set("specs", [...draft.specs, { label_bn: "", label_en: "", value_bn: "", value_en: "" }])
              }
            >
              <Plus className="mr-1.5 size-3.5" /> Add spec
            </Button>
          }
        />
        {draft.specs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No specifications yet
          </p>
        ) : (
          <div className="space-y-2">
            {draft.specs.map((s, i) => (
              <div
                key={i}
                className="grid gap-2 rounded-xl border border-border/70 bg-background/50 p-2 transition-all duration-300 hover:border-primary/30 sm:grid-cols-3"
              >
                <Input
                  className="rounded-lg"
                  placeholder="Label"
                  value={s.label_bn}
                  onChange={(e) => patchSpec(i, { label_bn: e.target.value, label_en: e.target.value })}
                />
                <Input
                  className="rounded-lg"
                  placeholder="Value"
                  value={s.value_bn}
                  onChange={(e) => patchSpec(i, { value_bn: e.target.value, value_en: e.target.value })}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="justify-self-start rounded-lg text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    set(
                      "specs",
                      draft.specs.filter((_, j) => j !== i),
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 border-t border-border/60 pt-5">
          <SectionHeading
            title="FAQ"
            action={
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() =>
                  set("faq", [
                    ...draft.faq,
                    { question_bn: "", question_en: "", answer_bn: "", answer_en: "" },
                  ])
                }
              >
                <Plus className="mr-1.5 size-3.5" /> Add FAQ
              </Button>
            }
          />
          {draft.faq.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              No FAQ entries yet
            </p>
          ) : (
            <div className="space-y-2">
              {draft.faq.map((f, i) => (
                <div
                  key={i}
                  className="space-y-2 rounded-xl border border-border/70 bg-background/50 p-3 transition-all duration-300 hover:border-primary/30"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      className="rounded-lg"
                      placeholder="Question"
                      value={f.question_bn}
                      onChange={(e) => patchFaq(i, { question_bn: e.target.value, question_en: e.target.value })}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-lg text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        set(
                          "faq",
                          draft.faq.filter((_, j) => j !== i),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <Input
                    className="rounded-lg"
                    placeholder="Answer"
                    value={f.answer_bn}
                    onChange={(e) => patchFaq(i, { answer_bn: e.target.value, answer_en: e.target.value })}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>

      <Panel className="admin-rise" style={{ animationDelay: "300ms" }}>
        <SectionHeading title="SEO" />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Meta title"
            value={draft.meta_title ?? ""}
            onChange={(v) => set("meta_title", v || null)}
            hint="Keep within 60 characters"
          />
          <AreaField
            label="Meta description"
            rows={3}
            value={draft.meta_description ?? ""}
            onChange={(v) => set("meta_description", v || null)}
            hint="Keep within 160 characters"
          />
        </div>
      </Panel>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-card/90 px-4 py-3 backdrop-blur-md sm:left-64">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-3">
          <p className="mr-auto hidden text-xs text-muted-foreground sm:block">
            {isNew ? "Creating a new product" : "Editing existing product"}
          </p>
          <Button
            loading={save.isPending}
            className="ig-gradient rounded-xl px-6 transition-transform duration-300 hover:scale-[1.02]"
            onClick={() =>
              save.mutate({
                ...draft,
                slug: draft.slug || slugify(draft.name_en || draft.name_bn),
              })
            }
          >
            {save.isPending ? "Saving…" : "Save product"}
          </Button>
        </div>
      </div>
    </div>
  );

  function patchVariant(index: number, patch: Partial<Draft["variants"][number]>) {
    set(
      "variants",
      draft.variants.map((v, j) => (j === index ? { ...v, ...patch } : v)),
    );
  }

  function patchSpec(index: number, patch: Partial<Draft["specs"][number]>) {
    set(
      "specs",
      draft.specs.map((s, j) => (j === index ? { ...s, ...patch } : s)),
    );
  }

  function patchFaq(index: number, patch: Partial<Draft["faq"][number]>) {
    set(
      "faq",
      draft.faq.map((f, j) => (j === index ? { ...f, ...patch } : f)),
    );
  }
}
