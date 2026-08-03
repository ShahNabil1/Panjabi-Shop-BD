import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";

import { adminListSettings, adminSaveSetting } from "@/lib/admin.functions";
import { AdminHeading, NumberField, Panel, TextField } from "@/components/admin/kit";
import { ImageField } from "@/components/admin/image-upload";
import { MAX_HERO_SLIDES, readHeroSlides, type HeroSlide } from "@/components/site/hero-slider";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/settings/")({
  component: SettingsAdmin,
});

type Obj = Record<string, unknown>;

function str(map: Obj, key: string) {
  const v = map[key];
  return typeof v === "string" ? v : "";
}
function n(map: Obj, key: string, fallback = 0) {
  const v = map[key];
  return typeof v === "number" ? v : fallback;
}

function SettingsAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "settings"], queryFn: () => adminListSettings() });

  const [general, setGeneral] = useState<Obj>({});
  const [contact, setContact] = useState<Obj>({});
  const [delivery, setDelivery] = useState<Obj>({});
  const [slides, setSlides] = useState<HeroSlide[]>([]);

  useEffect(() => {
    if (!data) return;
    const find = (key: string) =>
      ((data.find((r) => r.key === key)?.value ?? {}) as Obj) satisfies Obj;
    setGeneral(find("general"));
    setContact(find("contact"));
    setDelivery(find("delivery"));
    setSlides(readHeroSlides(find("hero") as never));
  }, [data]);


  const save = useMutation({
    mutationFn: (input: { key: string; value: Obj }) => adminSaveSetting({ data: input }),
    onSuccess: async () => {
      toast.success("Settings saved");
      await qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const freeAll = delivery["free_all"] === true;

  return (
    <div className="space-y-6 pb-16">
      <AdminHeading
        title="Settings"
        description="Hero banner, brand, contact and delivery charges."
      />

      <Panel className="space-y-4">
        <div>
          <h2 className="ig-text text-sm font-bold">Hero banner slider</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            At least 1, up to {MAX_HERO_SLIDES} banners. Images are stored in the{" "}
            <code className="rounded bg-muted px-1">hero/</code> folder on R2. Adding a link makes
            the banner clickable (e.g. <code className="rounded bg-muted px-1">/c/gift-combo</code>).
          </p>
        </div>

        <div className="space-y-3">
          {slides.map((slide, i) => (
            <div
              key={i}
              className="admin-rise space-y-3 rounded-xl border border-border/70 bg-background/40 p-3 transition-all duration-200 hover:border-primary/30"
            >
              <div className="flex items-center justify-between">
                <span className="ig-text text-xs font-bold">Banner {i + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={i === 0}
                    aria-label="Move up"
                    onClick={() => {
                      const next = slides.slice();
                      const [row] = next.splice(i, 1);
                      next.splice(i - 1, 0, row!);
                      setSlides(next);
                    }}
                    className="rounded-lg border border-border/80 p-1 transition-colors hover:border-primary/40 hover:bg-muted disabled:opacity-40"
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={i === slides.length - 1}
                    aria-label="Move down"
                    onClick={() => {
                      const next = slides.slice();
                      const [row] = next.splice(i, 1);
                      next.splice(i + 1, 0, row!);
                      setSlides(next);
                    }}
                    className="rounded-lg border border-border/80 p-1 transition-colors hover:border-primary/40 hover:bg-muted disabled:opacity-40"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => setSlides(slides.filter((_, j) => j !== i))}
                    className="rounded-lg border border-border/80 p-1 text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <ImageField
                label="Banner image"
                folder="hero"
                value={slide.url || null}
                onChange={(url) =>
                  setSlides(slides.map((s, j) => (j === i ? { ...s, url: url ?? "" } : s)))
                }
                hint="Recommended aspect ratio 21:9 (e.g. 1920×823)."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Link (optional)"
                  value={slide.link ?? ""}
                  onChange={(v) =>
                    setSlides(slides.map((s, j) => (j === i ? { ...s, link: v || null } : s)))
                  }
                />
                <TextField
                  label="Alt text (optional)"
                  value={slide.alt ?? ""}
                  onChange={(v) =>
                    setSlides(slides.map((s, j) => (j === i ? { ...s, alt: v || null } : s)))
                  }
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            disabled={slides.length >= MAX_HERO_SLIDES}
            onClick={() => setSlides([...slides, { url: "", link: null, alt: null }])}
            className="transition-transform duration-200 hover:-translate-y-0.5"
          >
            <ImagePlus className="size-4" />
            Add banner
          </Button>
          <Button
            loading={save.isPending}
            onClick={() => {
              const clean = slides.filter((s) => s.url.trim());
              if (clean.length === 0) {
                toast.error("Add at least one banner image.");
                return;
              }
              setSlides(clean);
              save.mutate({ key: "hero", value: { slides: clean.slice(0, MAX_HERO_SLIDES) } });
            }}
            className="transition-transform duration-200 hover:-translate-y-0.5"
          >
            Save
          </Button>
        </div>
      </Panel>


      <Panel className="space-y-4">
        <h2 className="ig-text text-sm font-bold">General</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Brand name"
            value={str(general, "brand_name")}
            onChange={(v) => setGeneral({ ...general, brand_name: v })}
          />
          <TextField
            label="Tagline"
            value={str(general, "tagline")}
            onChange={(v) => setGeneral({ ...general, tagline: v })}
          />
        </div>
        <Button
          loading={save.isPending}
          onClick={() => save.mutate({ key: "general", value: general })}
          className="transition-transform duration-200 hover:-translate-y-0.5"
        >
          Save
        </Button>
      </Panel>

      <Panel className="space-y-4">
        <h2 className="ig-text text-sm font-bold">Contact</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField
            label="Phone"
            value={str(contact, "phone")}
            onChange={(v) => setContact({ ...contact, phone: v })}
          />
          <TextField
            label="Email"
            value={str(contact, "email")}
            onChange={(v) => setContact({ ...contact, email: v })}
          />
          <TextField
            label="Address"
            value={str(contact, "address")}
            onChange={(v) => setContact({ ...contact, address: v })}
          />
        </div>
        <Button
          loading={save.isPending}
          onClick={() => save.mutate({ key: "contact", value: contact })}
          className="transition-transform duration-200 hover:-translate-y-0.5"
        >
          Save
        </Button>
      </Panel>

      <Panel className="space-y-4">
        <h2 className="ig-text text-sm font-bold">Delivery charges</h2>

        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/40 px-3 py-2.5 transition-colors hover:border-primary/30">
          <span>
            <span className="ig-text block text-sm font-bold">Free delivery for all orders</span>
            <span className="block text-xs text-muted-foreground">
              When on, every order ships free and checkout shows the charge as FREE.
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={freeAll}
            onChange={(e) => setDelivery({ ...delivery, free_all: e.target.checked })}
            className="peer sr-only"
          />
          <span className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-muted transition-colors duration-200 peer-checked:bg-emerald-500 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/40">
            <span
              className={`absolute left-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200 ${
                freeAll ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </span>
        </label>

        <div
          className={`grid gap-3 transition-opacity duration-200 sm:grid-cols-3 ${
            freeAll ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <NumberField
            label="Inside Dhaka (৳)"
            value={n(delivery, "inside_dhaka", 60)}
            onChange={(v) => setDelivery({ ...delivery, inside_dhaka: v })}
          />
          <NumberField
            label="Outside Dhaka (৳)"
            value={n(delivery, "outside_dhaka", 120)}
            onChange={(v) => setDelivery({ ...delivery, outside_dhaka: v })}
          />
          <NumberField
            label="Free delivery above (৳)"
            value={n(delivery, "free_above", 0)}
            onChange={(v) => setDelivery({ ...delivery, free_above: v })}
          />
        </div>
        <Button
          loading={save.isPending}
          onClick={() => save.mutate({ key: "delivery", value: delivery })}
          className="transition-transform duration-200 hover:-translate-y-0.5"
        >
          Save
        </Button>
      </Panel>
    </div>
  );
}
