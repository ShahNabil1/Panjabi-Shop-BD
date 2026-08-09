import { createFileRoute } from "@tanstack/react-router";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, FolderTree, Layers, Pencil, Trash2, X } from "lucide-react";

import {
  adminDeleteCategory,
  adminDeleteSubcategory,
  adminSaveCategory,
  adminSaveSubcategory,
  adminTaxonomy,
  adminToggleCategoryActive,
} from "@/lib/admin.functions";
import type { CategoryInput, SubcategoryInput } from "@/lib/admin-schema";
import {
  AdminHeading,
  EmptyState,
  Field,
  NumberField,
  Panel,
  TextField,
  ToggleField,
} from "@/components/admin/kit";
import { BrandLoader } from "@/components/admin/brand-loader";
import { ImageField } from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/taxonomy")({
  component: TaxonomyPage,
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function emptyCategory(): CategoryInput {
  return {
    slug: "",
    name_bn: "",
    name_en: "",
    description_bn: null,
    description_en: null,
    image_url: null,
    meta_title: null,
    meta_description: null,
    sort_order: 0,
    is_active: true,
    is_featured: false,
    show_in_header: true,
  };
}

function toCategoryDraft(c: any): CategoryInput {
  return {
    ...c,
    name_bn: c.name_bn || c.name_en || "",
    name_en: c.name_bn || c.name_en || "",
    description_bn: c.description_bn ?? c.description_en ?? null,
    description_en: c.description_bn ?? c.description_en ?? null,
  };
}

function toSubcategoryDraft(s: any): SubcategoryInput {
  return {
    ...s,
    name_bn: s.name_bn || s.name_en || "",
    name_en: s.name_bn || s.name_en || "",
  };
}

function TaxonomyPage() {
  const qc = useQueryClient();
  const confirmDialog = useConfirm();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "taxonomy"],
    queryFn: () => adminTaxonomy(),
  });
  const [cat, setCat] = useState<CategoryInput>(emptyCategory());
  const [sub, setSub] = useState<SubcategoryInput>({ ...emptyCategory(), category_id: "" });

  const allCats = (data?.categories ?? []) as any[];
  const featuredCount = allCats.filter((c) => c.is_featured).length;
  const isCurrentFeatured = Boolean(cat.id && allCats.find((c) => c.id === cat.id)?.is_featured);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const saveCat = useMutation({
    mutationFn: (input: CategoryInput) => adminSaveCategory({ data: input }),
    onSuccess: async () => {
      toast.success("Category saved");
      setCat(emptyCategory());
      await refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delCat = useMutation({
    mutationFn: (id: string) => adminDeleteCategory({ data: { id } }),
    onSuccess: async () => {
      toast.success("Deleted");
      await refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggleCat = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminToggleCategoryActive({ data: { id, is_active } }),
    onSuccess: async (_, vars) => {
      toast.success(vars.is_active ? "Category page visible" : "Category page hidden");
      await refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const saveSub = useMutation({
    mutationFn: (input: SubcategoryInput) => adminSaveSubcategory({ data: input }),
    onSuccess: async () => {
      toast.success("Subcategory saved");
      setSub({ ...emptyCategory(), category_id: sub.category_id });
      await refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delSub = useMutation({
    mutationFn: (id: string) => adminDeleteSubcategory({ data: { id } }),
    onSuccess: async () => {
      toast.success("Deleted");
      await refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 pb-16">
      <AdminHeading
        title="Categories & Subcategories"
        description="Manage the store's navigation structure."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <FolderTree className="size-4 text-primary" />
            {cat.id ? "Edit category" : "New category"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Name"
              value={cat.name_bn}
              onChange={(v) =>
                setCat({
                  ...cat,
                  name_bn: v,
                  name_en: v,
                  slug: cat.slug || slugify(v),
                })
              }
            />
            <TextField
              label="Slug"
              value={cat.slug}
              onChange={(v) => setCat({ ...cat, slug: slugify(v) })}
            />
            <NumberField
              label="Sort order"
              value={cat.sort_order}
              onChange={(v) => setCat({ ...cat, sort_order: v })}
            />
            <TextField
              label="Meta title"
              value={cat.meta_title ?? ""}
              onChange={(v) => setCat({ ...cat, meta_title: v || null })}
            />
            <ImageField
              cropPreset="card"
              label="Category image"
              folder="categories"
              value={cat.image_url}
              onChange={(v) => setCat({ ...cat, image_url: v })}
              hint="আপলোড বা Crop চাপলে অ্যাডভান্স ক্রপ টুল খুলবে — কার্ড (4:5), স্কয়ার, 3:4 বা ওয়াইড রেশিও, জুম/ড্র্যাগ ও ডেস্কটপ-মোবাইল লাইভ প্রিভিউসহ।"
            />
          </div>
          <Field label="Description">
            <textarea
              className="min-h-[84px] w-full rounded-xl border border-border/80 bg-background/70 p-3 text-sm transition-all duration-200 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              rows={3}
              value={cat.description_bn ?? ""}
              onChange={(e) =>
                setCat({
                  ...cat,
                  description_bn: e.target.value || null,
                  description_en: e.target.value || null,
                })
              }
            />
          </Field>
          <Field label="Meta description">
            <textarea
              className="min-h-[64px] w-full rounded-xl border border-border/80 bg-background/70 p-3 text-sm transition-all duration-200 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              rows={2}
              maxLength={160}
              placeholder="50–160 characters, shown in Google & social previews"
              value={cat.meta_description ?? ""}
              onChange={(e) => setCat({ ...cat, meta_description: e.target.value || null })}
            />
          </Field>
          <div className="grid gap-2 sm:grid-cols-3">
            <ToggleField
              label="Active"
              checked={cat.is_active}
              onChange={(v) => setCat({ ...cat, is_active: v })}
            />
            <ToggleField
              label={`Featured (${featuredCount}/4)`}
              checked={cat.is_featured}
              onChange={(v) => {
                if (v && featuredCount >= 4 && !isCurrentFeatured) {
                  toast.error("Maximum 4 featured categories allowed");
                  return;
                }
                setCat({ ...cat, is_featured: v });
              }}
            />
            <ToggleField
              label="Show on hero section"
              checked={cat.show_in_header}
              onChange={(v) => setCat({ ...cat, show_in_header: v })}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              loading={saveCat.isPending}
              onClick={() => saveCat.mutate(cat)}
              className="ig-gradient transition-transform duration-300 hover:scale-[1.02]"
            >
              Save
            </Button>
            {cat.id ? (
              <Button variant="outline" onClick={() => setCat(emptyCategory())}>
                <X className="mr-1 size-4" />
                Cancel
              </Button>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-0">
          <h2 className="border-b border-border p-4 text-sm font-bold">Categories</h2>
          {isLoading ? (
            <BrandLoader size="md" className="py-6" />
          ) : (data?.categories ?? []).length === 0 ? (
            <div className="p-4">
              <EmptyState title="No categories yet" hint="Create your first category on the left." />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {(data?.categories ?? []).map((c, i) => (
                <li
                  key={c.id}
                  className={cn(
                    "admin-rise group flex items-center gap-2 px-4 py-3 text-sm transition-colors duration-300 hover:bg-primary/5",
                    !c.is_active && "bg-muted/40 text-muted-foreground",
                  )}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.name_bn || c.name_en}</p>
                    <p className="truncate text-xs text-muted-foreground">/c/{c.slug}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-70 transition-opacity duration-200 group-hover:opacity-100">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        c.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700",
                      )}
                    >
                      {c.is_active ? "Visible" : "Hidden"}
                    </span>
                    {(c as any).is_featured ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        Featured
                      </span>
                    ) : null}
                    {(c as any).show_in_header ? (
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                        Hero
                      </span>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      title={c.is_active ? "Hide page" : "Show page"}
                      loading={toggleCat.isPending && toggleCat.variables?.id === c.id}
                      onClick={() => toggleCat.mutate({ id: c.id, is_active: !c.is_active })}
                    >
                      {c.is_active ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCat(toCategoryDraft(c))}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        void confirmDialog({
                          title: "Delete this category?",
                          description: "Products under it will lose this category.",
                        }).then((ok) => ok && delCat.mutate(c.id));
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Layers className="size-4 text-primary" />
            {sub.id ? "Edit subcategory" : "New subcategory"}
          </h2>
          <Field label="Parent category">
            <Select
              value={sub.category_id || "none"}
              onValueChange={(v) => setSub({ ...sub, category_id: v === "none" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select</SelectItem>
                {(data?.categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name_bn || c.name_en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Name"
              value={sub.name_bn}
              onChange={(v) =>
                setSub({
                  ...sub,
                  name_bn: v,
                  name_en: v,
                  slug: sub.slug || slugify(v),
                })
              }
            />
            <TextField
              label="Slug"
              value={sub.slug}
              onChange={(v) => setSub({ ...sub, slug: slugify(v) })}
            />
            <NumberField
              label="Sort order"
              value={sub.sort_order}
              onChange={(v) => setSub({ ...sub, sort_order: v })}
            />
            <TextField
              label="Meta title"
              value={sub.meta_title ?? ""}
              onChange={(v) => setSub({ ...sub, meta_title: v || null })}
            />
            <ImageField
              cropPreset="card"
              label="Subcategory image (used as OG preview)"
              folder="categories"
              value={sub.image_url}
              onChange={(v) => setSub({ ...sub, image_url: v })}
            />
          </div>
          <Field label="Meta description">
            <textarea
              className="min-h-[64px] w-full rounded-xl border border-border/80 bg-background/70 p-3 text-sm transition-all duration-200 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              rows={2}
              maxLength={160}
              placeholder="50–160 characters, shown in Google & social previews"
              value={sub.meta_description ?? ""}
              onChange={(e) => setSub({ ...sub, meta_description: e.target.value || null })}
            />
          </Field>
          <Field label="Description">
            <textarea
              className="min-h-[84px] w-full rounded-xl border border-border/80 bg-background/70 p-3 text-sm transition-all duration-200 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              rows={3}
              value={sub.description_bn ?? ""}
              onChange={(e) =>
                setSub({
                  ...sub,
                  description_bn: e.target.value || null,
                  description_en: e.target.value || null,
                })
              }
            />
          </Field>
          <ToggleField
            label="Active"
            checked={sub.is_active}
            onChange={(v) => setSub({ ...sub, is_active: v })}
          />
          <div className="flex gap-2 pt-1">
            <Button
              loading={saveSub.isPending}
              onClick={() => saveSub.mutate(sub)}
              className="ig-gradient transition-transform duration-300 hover:scale-[1.02]"
            >
              Save
            </Button>
            {sub.id ? (
              <Button
                variant="outline"
                onClick={() => setSub({ ...emptyCategory(), category_id: sub.category_id })}
              >
                <X className="mr-1 size-4" />
                Cancel
              </Button>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-0">
          <h2 className="border-b border-border p-4 text-sm font-bold">Subcategories</h2>
          {(data?.subcategories ?? []).length === 0 ? (
            <div className="p-4">
              <EmptyState title="No subcategories yet" />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {(data?.subcategories ?? []).map((s, i) => {
                const parent = (data?.categories ?? []).find((c) => c.id === s.category_id);
                return (
                  <li
                    key={s.id}
                    className="admin-rise group flex items-center gap-2 px-4 py-3 text-sm transition-colors duration-300 hover:bg-primary/5"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{s.name_bn || s.name_en}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        /c/{parent?.slug ?? "?"}/{s.slug}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-70 transition-opacity duration-200 group-hover:opacity-100">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSub(toSubcategoryDraft(s))}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          void confirmDialog({
                            title: "Delete this subcategory?",
                            description: "Products under it will lose this subcategory.",
                          }).then((ok) => ok && delSub.mutate(s.id));
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
