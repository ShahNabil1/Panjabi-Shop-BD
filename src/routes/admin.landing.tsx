import { createFileRoute } from "@tanstack/react-router";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

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
  EmptyState,
  Field,
  Panel,
  TextField,
  ToggleField,
} from "@/components/admin/kit";
import { ImageField } from "@/components/admin/image-upload";
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
    seo: {
      ogTitle: null,
      ogDescription: null,
      canonicalUrl: null,
      productJsonLd: true,
      noindex: false,
    },
    bullets: [],
  };
}


function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  if (item === undefined) return list;
  next.splice(to, 0, item);
  return next;
}

function LandingPagesAdmin() {
  const qc = useQueryClient();
  const confirmDialog = useConfirm();
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
      toast.success("Landing page saved");
      setDraft(emptyLanding());
      await qc.invalidateQueries({ queryKey: ["admin", "landing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteLandingPage({ data: { id } }),
    onSuccess: async () => {
      toast.success("Deleted");
      await qc.invalidateQueries({ queryKey: ["admin", "landing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 pb-16">
      <AdminHeading
        title="Landing Pages"
        description="A dedicated single page per product — /lp/your-slug"
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel className="space-y-4">
          <h2 className="text-sm font-bold">{draft.id ? "Edit Page" : "New Landing Page"}</h2>
          <Field label="Product">
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
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select a product</SelectItem>
                {(products.data ?? []).filter((p) => p.kind !== "component").map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name_bn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Slug"
              value={draft.slug}
              onChange={(v) => setDraft({ ...draft, slug: slugify(v) })}
              hint="URL: /lp/your-slug"
            />
            <ImageField
              cropPreset="og"
              label="OG Image (social preview)"
              folder="landing"
              value={draft.og_image_url}
              onChange={(v) => setDraft({ ...draft, og_image_url: v })}
            />
            <TextField
              label="Headline"
              value={draft.headline_bn ?? ""}
              onChange={(v) => setDraft({ ...draft, headline_bn: v || null, headline_en: v || null })}
            />
            <TextField
              label="Sub-headline"
              value={draft.subheadline_bn ?? ""}
              onChange={(v) =>
                setDraft({ ...draft, subheadline_bn: v || null, subheadline_en: v || null })
              }
            />
            <TextField
              label="Meta title"
              value={draft.meta_title ?? ""}
              onChange={(v) => setDraft({ ...draft, meta_title: v || null })}
              maxLength={60}
              hint="সর্বোচ্চ ৬০ ক্যারেক্টার"
            />
          </div>
          <AreaField
            label="Meta description"
            rows={3}
            value={draft.meta_description ?? ""}
            onChange={(v) => setDraft({ ...draft, meta_description: v || null })}
            maxLength={160}
            hint="সর্বোচ্চ ১৬০ ক্যারেক্টার"
          />
          <div className="space-y-3 rounded-2xl border border-border/70 bg-background/50 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                SEO & Social
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Overrides for this landing page only. Leave empty to fall back to meta
                title/description.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="OG Title"
                value={draft.seo.ogTitle ?? ""}
                onChange={(v) => setDraft({ ...draft, seo: { ...draft.seo, ogTitle: v || null } })}
                hint="Shown when shared on Facebook / Messenger"
              />
              <TextField
                label="Canonical URL"
                value={draft.seo.canonicalUrl ?? ""}
                onChange={(v) =>
                  setDraft({ ...draft, seo: { ...draft.seo, canonicalUrl: v || null } })
                }
                hint="Absolute URL. Defaults to this page's URL."
              />
            </div>
            <AreaField
              label="OG Description"
              rows={3}
              value={draft.seo.ogDescription ?? ""}
              onChange={(v) =>
                setDraft({ ...draft, seo: { ...draft.seo, ogDescription: v || null } })
              }
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <ToggleField
                label="Product JSON-LD (rich results)"
                checked={draft.seo.productJsonLd}
                onChange={(v) => setDraft({ ...draft, seo: { ...draft.seo, productJsonLd: v } })}
              />
              <ToggleField
                label="Hide from search (noindex)"
                checked={draft.seo.noindex}
                onChange={(v) => setDraft({ ...draft, seo: { ...draft.seo, noindex: v } })}
              />
            </div>
          </div>



          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Bullet Points
              </p>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() =>
                  setDraft({ ...draft, bullets: [...draft.bullets, { bn: "", en: "" }] })
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
            <div className="mt-2 space-y-2">
              {draft.bullets.length === 0 ? (
                <EmptyState title="No bullets yet" hint="Add a highlight point above." />
              ) : (
                draft.bullets.map((b, i) => (
                  <div
                    key={i}
                    className="admin-rise flex items-center gap-2 rounded-xl border border-border/70 bg-background/50 p-2 transition-all duration-200 hover:border-primary/30"
                  >
                    <span className="flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <Input
                      placeholder="Bullet point text"
                      value={b.bn}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          bullets: draft.bullets.map((x, j) =>
                            j === i ? { bn: e.target.value, en: e.target.value } : x,
                          ),
                        })
                      }
                      className="rounded-lg border-border/80 bg-background/70"
                    />
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={i === 0}
                        onClick={() =>
                          setDraft({ ...draft, bullets: moveItem(draft.bullets, i, i - 1) })
                        }
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={i === draft.bullets.length - 1}
                        onClick={() =>
                          setDraft({ ...draft, bullets: moveItem(draft.bullets, i, i + 1) })
                        }
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() =>
                          setDraft({ ...draft, bullets: draft.bullets.filter((_, j) => j !== i) })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <ToggleField
            label="Active"
            checked={draft.is_active}
            onChange={(v) => setDraft({ ...draft, is_active: v })}
          />

          <div className="sticky bottom-0 z-10 -mx-4 flex gap-2 border-t border-border/70 bg-card/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5">
            <Button loading={save.isPending} onClick={() => save.mutate(draft)}>
              Save
            </Button>
            {draft.id ? (
              <Button variant="outline" onClick={() => setDraft(emptyLanding())}>
                Cancel
              </Button>
            ) : null}
          </div>
        </Panel>

        <Panel className="p-0">
          <h2 className="border-b border-border p-4 text-sm font-bold">Page List</h2>
          {(pages.data ?? []).length === 0 ? (
            <EmptyState title="No landing pages yet" hint="Create one on the left." />
          ) : (
            <ul className="divide-y divide-border">
              {(pages.data ?? []).map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 px-4 py-3 text-sm transition-colors duration-200 hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.headline_bn ?? p.slug}</p>
                    <a
                      href={`/lp/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
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
                        seo?: Partial<LandingPageInput["seo"]>;
                      };
                      setDraft({
                        ...(p as unknown as LandingPageInput),
                        bullets: Array.isArray(content.bullets) ? content.bullets : [],
                        seo: {
                          ogTitle: content.seo?.ogTitle ?? null,
                          ogDescription: content.seo?.ogDescription ?? null,
                          canonicalUrl: content.seo?.canonicalUrl ?? null,
                          productJsonLd: content.seo?.productJsonLd ?? true,
                          noindex: content.seo?.noindex ?? false,
                        },

                      });
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      void confirmDialog({
                        title: "Delete this landing page?",
                        description: "The page URL will stop working immediately.",
                      }).then((ok) => ok && remove.mutate(p.id));
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
