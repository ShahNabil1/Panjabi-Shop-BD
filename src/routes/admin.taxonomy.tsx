import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  adminDeleteCategory,
  adminDeleteSubcategory,
  adminSaveCategory,
  adminSaveSubcategory,
  adminTaxonomy,
} from "@/lib/admin.functions";
import type { CategoryInput, SubcategoryInput } from "@/lib/admin-schema";
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
  };
}

function TaxonomyPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "taxonomy"],
    queryFn: () => adminTaxonomy(),
  });
  const [cat, setCat] = useState<CategoryInput>(emptyCategory());
  const [sub, setSub] = useState<SubcategoryInput>({ ...emptyCategory(), category_id: "" });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const saveCat = useMutation({
    mutationFn: (input: CategoryInput) => adminSaveCategory({ data: input }),
    onSuccess: async () => {
      toast.success("ক্যাটাগরি সেভ হয়েছে");
      setCat(emptyCategory());
      await refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delCat = useMutation({
    mutationFn: (id: string) => adminDeleteCategory({ data: { id } }),
    onSuccess: async () => {
      toast.success("মুছে ফেলা হয়েছে");
      await refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const saveSub = useMutation({
    mutationFn: (input: SubcategoryInput) => adminSaveSubcategory({ data: input }),
    onSuccess: async () => {
      toast.success("সাব-ক্যাটাগরি সেভ হয়েছে");
      setSub({ ...emptyCategory(), category_id: sub.category_id });
      await refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delSub = useMutation({
    mutationFn: (id: string) => adminDeleteSubcategory({ data: { id } }),
    onSuccess: async () => {
      toast.success("মুছে ফেলা হয়েছে");
      await refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 pb-16">
      <AdminHeading title="ক্যাটাগরি ও সাব-ক্যাটাগরি" description="স্টোরের নেভিগেশন কাঠামো।" />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="space-y-4">
          <h2 className="text-sm font-bold">{cat.id ? "ক্যাটাগরি এডিট" : "নতুন ক্যাটাগরি"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="নাম (বাংলা)"
              value={cat.name_bn}
              onChange={(v) => setCat({ ...cat, name_bn: v })}
            />
            <TextField
              label="নাম (English)"
              value={cat.name_en}
              onChange={(v) =>
                setCat({ ...cat, name_en: v, slug: cat.slug || slugify(v) })
              }
            />
            <TextField
              label="স্লাগ"
              value={cat.slug}
              onChange={(v) => setCat({ ...cat, slug: slugify(v) })}
            />
            <NumberField
              label="সর্ট অর্ডার"
              value={cat.sort_order}
              onChange={(v) => setCat({ ...cat, sort_order: v })}
            />
            <TextField
              label="ছবির URL"
              value={cat.image_url ?? ""}
              onChange={(v) => setCat({ ...cat, image_url: v || null })}
            />
            <TextField
              label="Meta title"
              value={cat.meta_title ?? ""}
              onChange={(v) => setCat({ ...cat, meta_title: v || null })}
            />
          </div>
          <AreaField
            label="বিবরণ (বাংলা)"
            rows={3}
            value={cat.description_bn ?? ""}
            onChange={(v) => setCat({ ...cat, description_bn: v || null })}
          />
          <ToggleField
            label="অ্যাক্টিভ"
            checked={cat.is_active}
            onChange={(v) => setCat({ ...cat, is_active: v })}
          />
          <div className="flex gap-2">
            <Button disabled={saveCat.isPending} onClick={() => saveCat.mutate(cat)}>
              সেভ করুন
            </Button>
            {cat.id ? (
              <Button variant="outline" onClick={() => setCat(emptyCategory())}>
                বাতিল
              </Button>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-0">
          <h2 className="border-b border-border p-4 text-sm font-bold">ক্যাটাগরি তালিকা</h2>
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">লোড হচ্ছে…</p>
          ) : (
            <ul className="divide-y divide-border">
              {(data?.categories ?? []).map((c) => (
                <li key={c.id} className="flex items-center gap-2 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{c.name_bn}</p>
                    <p className="truncate text-xs text-muted-foreground">/c/{c.slug}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCat(c as unknown as CategoryInput)}
                  >
                    এডিট
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("মুছে ফেলবেন?")) delCat.mutate(c.id);
                    }}
                  >
                    মুছুন
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="space-y-4">
          <h2 className="text-sm font-bold">
            {sub.id ? "সাব-ক্যাটাগরি এডিট" : "নতুন সাব-ক্যাটাগরি"}
          </h2>
          <Field label="প্যারেন্ট ক্যাটাগরি">
            <Select
              value={sub.category_id || "none"}
              onValueChange={(v) => setSub({ ...sub, category_id: v === "none" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="বাছাই করুন" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">বাছাই করুন</SelectItem>
                {(data?.categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name_bn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="নাম (বাংলা)"
              value={sub.name_bn}
              onChange={(v) => setSub({ ...sub, name_bn: v })}
            />
            <TextField
              label="নাম (English)"
              value={sub.name_en}
              onChange={(v) => setSub({ ...sub, name_en: v, slug: sub.slug || slugify(v) })}
            />
            <TextField
              label="স্লাগ"
              value={sub.slug}
              onChange={(v) => setSub({ ...sub, slug: slugify(v) })}
            />
            <NumberField
              label="সর্ট অর্ডার"
              value={sub.sort_order}
              onChange={(v) => setSub({ ...sub, sort_order: v })}
            />
          </div>
          <ToggleField
            label="অ্যাক্টিভ"
            checked={sub.is_active}
            onChange={(v) => setSub({ ...sub, is_active: v })}
          />
          <div className="flex gap-2">
            <Button disabled={saveSub.isPending} onClick={() => saveSub.mutate(sub)}>
              সেভ করুন
            </Button>
            {sub.id ? (
              <Button
                variant="outline"
                onClick={() => setSub({ ...emptyCategory(), category_id: sub.category_id })}
              >
                বাতিল
              </Button>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-0">
          <h2 className="border-b border-border p-4 text-sm font-bold">সাব-ক্যাটাগরি তালিকা</h2>
          <ul className="divide-y divide-border">
            {(data?.subcategories ?? []).map((s) => {
              const parent = (data?.categories ?? []).find((c) => c.id === s.category_id);
              return (
                <li key={s.id} className="flex items-center gap-2 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{s.name_bn}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      /c/{parent?.slug ?? "?"}/{s.slug}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSub(s as unknown as SubcategoryInput)}
                  >
                    এডিট
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("মুছে ফেলবেন?")) delSub.mutate(s.id);
                    }}
                  >
                    মুছুন
                  </Button>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
