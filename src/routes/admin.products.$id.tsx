import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
    setDraft({
      ...emptyDraft(),
      ...(p as unknown as Draft),
      price: Number(p["price"]),
      compare_at_price: p["compare_at_price"] == null ? null : Number(p["compare_at_price"]),
      specs: Array.isArray(p["specs"]) ? (p["specs"] as Draft["specs"]) : [],
      faq: Array.isArray(p["faq"]) ? (p["faq"] as Draft["faq"]) : [],
      images: images.map((img, i) => ({
        url: String(img["url"] ?? ""),
        alt_bn: (img["alt_bn"] as string | null) ?? null,
        alt_en: (img["alt_en"] as string | null) ?? null,
        sort_order: i,
      })),
      variants: variants.map((v, i) => ({
        group_name_bn: String(v["group_name_bn"] ?? ""),
        group_name_en: String(v["group_name_en"] ?? ""),
        value_bn: String(v["value_bn"] ?? ""),
        value_en: String(v["value_en"] ?? ""),
        sku: (v["sku"] as string | null) ?? null,
        price_delta: Number(v["price_delta"] ?? 0),
        stock: Number(v["stock"] ?? 0),
        sort_order: i,
        is_active: Boolean(v["is_active"]),
      })),
    });
  }, [existing.data]);

  const save = useMutation({
    mutationFn: (input: Draft) => adminSaveProduct({ data: input }),
    onSuccess: async (res) => {
      toast.success("সেভ হয়েছে");
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
    <div className="space-y-5 pb-16">
      <AdminHeading
        title={isNew ? "নতুন প্রোডাক্ট" : draft.name_bn || "প্রোডাক্ট এডিট"}
        description="নাম, দাম, ছবি, ভ্যারিয়েন্ট ও SEO তথ্য।"
        action={
          <Button
            size="sm"
            disabled={save.isPending}
            onClick={() =>
              save.mutate({
                ...draft,
                slug: draft.slug || slugify(draft.name_en || draft.name_bn),
              })
            }
          >
            {save.isPending ? "সেভ হচ্ছে…" : "সেভ করুন"}
          </Button>
        }
      />

      <Panel className="grid gap-4 sm:grid-cols-2">
        <TextField label="নাম (বাংলা)" value={draft.name_bn} onChange={(v) => set("name_bn", v)} />
        <TextField label="নাম (English)" value={draft.name_en} onChange={(v) => set("name_en", v)} />
        <TextField
          label="স্লাগ"
          value={draft.slug}
          onChange={(v) => set("slug", slugify(v))}
          hint="URL: /p/your-slug"
        />
        <TextField
          label="SKU"
          value={draft.sku ?? ""}
          onChange={(v) => set("sku", v || null)}
        />
        <Field label="ক্যাটাগরি">
          <Select
            value={draft.category_id || "none"}
            onValueChange={(v) => {
              set("category_id", v === "none" ? "" : v);
              set("subcategory_id", null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="বাছাই করুন" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">বাছাই করুন</SelectItem>
              {(taxonomy.data?.categories ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name_bn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="সাব-ক্যাটাগরি">
          <Select
            value={draft.subcategory_id ?? "none"}
            onValueChange={(v) => set("subcategory_id", v === "none" ? null : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="বাছাই করুন" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">কোনোটিই নয়</SelectItem>
              {subcategories.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name_bn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <NumberField label="দাম (৳)" value={draft.price} onChange={(v) => set("price", v)} />
        <NumberField
          label="আগের দাম (৳)"
          value={draft.compare_at_price ?? 0}
          onChange={(v) => set("compare_at_price", v > 0 ? v : null)}
        />
        <NumberField label="স্টক" value={draft.stock} onChange={(v) => set("stock", v)} />
        <NumberField
          label="সর্ট অর্ডার"
          value={draft.sort_order}
          onChange={(v) => set("sort_order", v)}
        />
        <TextField
          label="ব্র্যান্ড"
          value={draft.brand ?? ""}
          onChange={(v) => set("brand", v || null)}
        />
        <TextField
          label="ব্যাজ (বাংলা)"
          value={draft.badge_bn ?? ""}
          onChange={(v) => set("badge_bn", v || null)}
        />
        <TextField
          label="ব্যাজ (English)"
          value={draft.badge_en ?? ""}
          onChange={(v) => set("badge_en", v || null)}
        />
        <ToggleField
          label="অ্যাক্টিভ"
          checked={draft.is_active}
          onChange={(v) => set("is_active", v)}
        />
        <ToggleField
          label="ফিচার্ড"
          checked={draft.is_featured}
          onChange={(v) => set("is_featured", v)}
        />
      </Panel>

      <Panel className="grid gap-4 sm:grid-cols-2">
        <AreaField
          label="সংক্ষিপ্ত বিবরণ (বাংলা)"
          rows={3}
          value={draft.short_description_bn ?? ""}
          onChange={(v) => set("short_description_bn", v || null)}
        />
        <AreaField
          label="সংক্ষিপ্ত বিবরণ (English)"
          rows={3}
          value={draft.short_description_en ?? ""}
          onChange={(v) => set("short_description_en", v || null)}
        />
        <AreaField
          label="বিস্তারিত (বাংলা)"
          rows={8}
          value={draft.description_bn ?? ""}
          onChange={(v) => set("description_bn", v || null)}
        />
        <AreaField
          label="বিস্তারিত (English)"
          rows={8}
          value={draft.description_en ?? ""}
          onChange={(v) => set("description_en", v || null)}
        />
      </Panel>

      <Panel>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">ছবি</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              set("images", [
                ...draft.images,
                { url: "", alt_bn: null, alt_en: null, sort_order: draft.images.length },
              ])
            }
          >
            ছবি যোগ করুন
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {draft.images.map((img, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                {img.url ? <img src={img.url} alt="" className="size-full object-cover" /> : null}
              </div>
              <Input
                className="min-w-56 flex-1"
                placeholder="ছবির URL"
                value={img.url}
                onChange={(e) =>
                  set(
                    "images",
                    draft.images.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)),
                  )
                }
              />
              <Input
                className="w-44"
                placeholder="Alt (বাংলা)"
                value={img.alt_bn ?? ""}
                onChange={(e) =>
                  set(
                    "images",
                    draft.images.map((x, j) =>
                      j === i ? { ...x, alt_bn: e.target.value || null } : x,
                    ),
                  )
                }
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  set(
                    "images",
                    draft.images.filter((_, j) => j !== i),
                  )
                }
              >
                মুছুন
              </Button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">ভ্যারিয়েন্ট</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              set("variants", [
                ...draft.variants,
                {
                  group_name_bn: "সাইজ",
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
            ভ্যারিয়েন্ট যোগ করুন
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {draft.variants.map((v, i) => (
            <div key={i} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-6">
              <Input
                placeholder="গ্রুপ (বাংলা)"
                value={v.group_name_bn}
                onChange={(e) => patchVariant(i, { group_name_bn: e.target.value })}
              />
              <Input
                placeholder="Group (En)"
                value={v.group_name_en}
                onChange={(e) => patchVariant(i, { group_name_en: e.target.value })}
              />
              <Input
                placeholder="মান (বাংলা)"
                value={v.value_bn}
                onChange={(e) => patchVariant(i, { value_bn: e.target.value })}
              />
              <Input
                placeholder="Value (En)"
                value={v.value_en}
                onChange={(e) => patchVariant(i, { value_en: e.target.value })}
              />
              <Input
                type="number"
                placeholder="দাম পার্থক্য"
                value={v.price_delta}
                onChange={(e) => patchVariant(i, { price_delta: Number(e.target.value) })}
              />
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="স্টক"
                  value={v.stock}
                  onChange={(e) => patchVariant(i, { stock: Number(e.target.value) })}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    set(
                      "variants",
                      draft.variants.filter((_, j) => j !== i),
                    )
                  }
                >
                  ✕
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">স্পেসিফিকেশন</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              set("specs", [
                ...draft.specs,
                { label_bn: "", label_en: "", value_bn: "", value_en: "" },
              ])
            }
          >
            যোগ করুন
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {draft.specs.map((s, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-5">
              <Input
                placeholder="লেবেল (বাংলা)"
                value={s.label_bn}
                onChange={(e) => patchSpec(i, { label_bn: e.target.value })}
              />
              <Input
                placeholder="Label (En)"
                value={s.label_en}
                onChange={(e) => patchSpec(i, { label_en: e.target.value })}
              />
              <Input
                placeholder="মান (বাংলা)"
                value={s.value_bn}
                onChange={(e) => patchSpec(i, { value_bn: e.target.value })}
              />
              <Input
                placeholder="Value (En)"
                value={s.value_en}
                onChange={(e) => patchSpec(i, { value_en: e.target.value })}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  set(
                    "specs",
                    draft.specs.filter((_, j) => j !== i),
                  )
                }
              >
                মুছুন
              </Button>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Meta title"
          value={draft.meta_title ?? ""}
          onChange={(v) => set("meta_title", v || null)}
          hint="৬০ অক্ষরের মধ্যে রাখুন"
        />
        <TextField
          label="OG image URL"
          value={draft.og_image_url ?? ""}
          onChange={(v) => set("og_image_url", v || null)}
        />
        <AreaField
          label="Meta description"
          rows={3}
          value={draft.meta_description ?? ""}
          onChange={(v) => set("meta_description", v || null)}
          hint="১৬০ অক্ষরের মধ্যে রাখুন"
        />
      </Panel>
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
}
