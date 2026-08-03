import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  adminDeleteLandingPage,
  adminListLandingPages,
  adminListProducts,
  adminSaveLandingPage,
} from "@/lib/admin.functions";
import type { LandingPageInput } from "@/lib/admin-schema";
import {
  AdminHeading,
  AreaField,
  Field,
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

export const Route = createFileRoute("/admin/landing")({
  component: LandingPagesAdmin,
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0980-\u09FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function emptyLanding(): LandingPageInput {
  return {
    product_id: "",
    slug: "",
    headline_bn: null,
    headline_en: null,
    subheadline_bn: null,
    subheadline_en: null,
    meta_title: null,
    meta_description: null,
    og_image_url: null,
    is_active: true,
    bullets: [],
  };
}

function LandingPagesAdmin() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<LandingPageInput>(emptyLanding());

  const pages = useQuery({
    queryKey: ["admin", "landing"],
    queryFn: () => adminListLandingPages(),
  });
  const products = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => adminListProducts(),
  });

  const save = useMutation({
    mutationFn: (input: LandingPageInput) => adminSaveLandingPage({ data: input }),
    onSuccess: async () => {
      toast.success("ল্যান্ডিং পেইজ সেভ হয়েছে");
      setDraft(emptyLanding());
      await qc.invalidateQueries({ queryKey: ["admin", "landing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteLandingPage({ data: { id } }),
    onSuccess: async () => {
      toast.success("মুছে ফেলা হয়েছে");
      await qc.invalidateQueries({ queryKey: ["admin", "landing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 pb-16">
      <AdminHeading
        title="ল্যান্ডিং পেইজ"
        description="প্রতিটি প্রোডাক্টের জন্য আলাদা সিঙ্গেল পেইজ — /lp/your-slug"
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="space-y-4">
          <h2 className="text-sm font-bold">{draft.id ? "পেইজ এডিট" : "নতুন ল্যান্ডিং পেইজ"}</h2>
          <Field label="প্রোডাক্ট">
            <Select
              value={draft.product_id || "none"}
              onValueChange={(v) => {
                const product = (products.data ?? []).find((p) => p.id === v);
                setDraft({
                  ...draft,
                  product_id: v === "none" ? "" : v,
                  slug: draft.slug || (product ? slugify(`${product.slug}-offer`) : ""),
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="বাছাই করুন" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">বাছাই করুন</SelectItem>
                {(products.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name_bn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="স্লাগ"
              value={draft.slug}
              onChange={(v) => setDraft({ ...draft, slug: slugify(v) })}
              hint="URL: /lp/your-slug"
            />
            <TextField
              label="OG image URL"
              value={draft.og_image_url ?? ""}
              onChange={(v) => setDraft({ ...draft, og_image_url: v || null })}
            />
            <TextField
              label="হেডলাইন (বাংলা)"
              value={draft.headline_bn ?? ""}
              onChange={(v) => setDraft({ ...draft, headline_bn: v || null })}
            />
            <TextField
              label="Headline (English)"
              value={draft.headline_en ?? ""}
              onChange={(v) => setDraft({ ...draft, headline_en: v || null })}
            />
            <TextField
              label="সাব-হেডলাইন (বাংলা)"
              value={draft.subheadline_bn ?? ""}
              onChange={(v) => setDraft({ ...draft, subheadline_bn: v || null })}
            />
            <TextField
              label="Sub-headline (English)"
              value={draft.subheadline_en ?? ""}
              onChange={(v) => setDraft({ ...draft, subheadline_en: v || null })}
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

          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                বুলেট পয়েন্ট
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft({ ...draft, bullets: [...draft.bullets, { bn: "", en: "" }] })
                }
              >
                যোগ করুন
              </Button>
            </div>
            <div className="mt-2 space-y-2">
              {draft.bullets.map((b, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="বাংলা"
                    value={b.bn}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        bullets: draft.bullets.map((x, j) =>
                          j === i ? { ...x, bn: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <Input
                    placeholder="English"
                    value={b.en}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        bullets: draft.bullets.map((x, j) =>
                          j === i ? { ...x, en: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setDraft({ ...draft, bullets: draft.bullets.filter((_, j) => j !== i) })
                    }
                  >
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <ToggleField
            label="অ্যাক্টিভ"
            checked={draft.is_active}
            onChange={(v) => setDraft({ ...draft, is_active: v })}
          />

          <div className="flex gap-2">
            <Button disabled={save.isPending} onClick={() => save.mutate(draft)}>
              সেভ করুন
            </Button>
            {draft.id ? (
              <Button variant="outline" onClick={() => setDraft(emptyLanding())}>
                বাতিল
              </Button>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-0">
          <h2 className="border-b border-border p-4 text-sm font-bold">পেইজ তালিকা</h2>
          <ul className="divide-y divide-border">
            {(pages.data ?? []).map((p) => (
              <li key={p.id} className="flex items-center gap-2 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.headline_bn ?? p.slug}</p>
                  <a
                    href={`/lp/${p.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-xs text-muted-foreground underline-offset-2 hover:underline"
                  >
                    /lp/{p.slug}
                  </a>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const content = (p.content ?? {}) as {
                      bullets?: Array<{ bn: string; en: string }>;
                    };
                    setDraft({
                      ...(p as unknown as LandingPageInput),
                      bullets: Array.isArray(content.bullets) ? content.bullets : [],
                    });
                  }}
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
