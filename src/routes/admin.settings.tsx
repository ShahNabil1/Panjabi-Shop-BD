import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { adminListSettings, adminSaveSetting } from "@/lib/admin.functions";
import { getMediaStatus } from "@/lib/media.functions";
import { AdminHeading, NumberField, Panel, TextField } from "@/components/admin/kit";
import { ImageField } from "@/components/admin/image-upload";
import { MAX_HERO_SLIDES, readHeroSlides, type HeroSlide } from "@/components/site/hero-slider";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/settings")({
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
  const media = useQuery({ queryKey: ["admin", "media-status"], queryFn: () => getMediaStatus() });

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
      toast.success("সেটিংস সেভ হয়েছে");
      await qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 pb-16">
      <AdminHeading title="সেটিংস" description="হিরো ব্যানার, ব্র্যান্ড, যোগাযোগ ও ডেলিভারি চার্জ।" />

      <Panel className="space-y-4">
        <div>
          <h2 className="text-sm font-bold">হিরো ব্যানার স্লাইডার</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            সর্বনিম্ন ১টি, সর্বোচ্চ {MAX_HERO_SLIDES}টি ব্যানার। ছবিগুলো R2-এর{" "}
            <code className="rounded bg-muted px-1">hero/</code> ফোল্ডারে যাবে। লিংক দিলে ব্যানারে
            ক্লিক করলেই সেই পেইজে যাবে (যেমন <code className="rounded bg-muted px-1">/c/gift-combo</code>)।
          </p>
        </div>

        <div className="space-y-3">
          {slides.map((slide, i) => (
            <div key={i} className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">ব্যানার {i + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={i === 0}
                    aria-label="উপরে"
                    onClick={() => {
                      const next = slides.slice();
                      const [row] = next.splice(i, 1);
                      next.splice(i - 1, 0, row!);
                      setSlides(next);
                    }}
                    className="rounded-md border border-border p-1 disabled:opacity-40"
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={i === slides.length - 1}
                    aria-label="নিচে"
                    onClick={() => {
                      const next = slides.slice();
                      const [row] = next.splice(i, 1);
                      next.splice(i + 1, 0, row!);
                      setSlides(next);
                    }}
                    className="rounded-md border border-border p-1 disabled:opacity-40"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="মুছুন"
                    onClick={() => setSlides(slides.filter((_, j) => j !== i))}
                    className="rounded-md border border-border p-1 text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              <ImageField
                label="ব্যানার ছবি"
                folder="hero"
                value={slide.url || null}
                onChange={(url) =>
                  setSlides(slides.map((s, j) => (j === i ? { ...s, url: url ?? "" } : s)))
                }
                hint="প্রস্তাবিত সাইজ ২১:৯ (যেমন ১৯২০×৮২৩)।"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="লিংক (ঐচ্ছিক)"
                  value={slide.link ?? ""}
                  onChange={(v) =>
                    setSlides(slides.map((s, j) => (j === i ? { ...s, link: v || null } : s)))
                  }
                />
                <TextField
                  label="Alt টেক্সট (ঐচ্ছিক)"
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
          >
            ব্যানার যোগ করুন
          </Button>
          <Button
            disabled={save.isPending}
            onClick={() => {
              const clean = slides.filter((s) => s.url.trim());
              if (clean.length === 0) {
                toast.error("অন্তত ১টি ব্যানার ছবি দিন।");
                return;
              }
              setSlides(clean);
              save.mutate({ key: "hero", value: { slides: clean.slice(0, MAX_HERO_SLIDES) } });
            }}
          >
            সেভ করুন
          </Button>
        </div>
      </Panel>


      <Panel className="space-y-2">
        <h2 className="text-sm font-bold">মিডিয়া স্টোরেজ (Cloudflare R2)</h2>
        <p className="text-xs text-muted-foreground">
          {media.data?.configured
            ? "R2 কানেক্টেড — অ্যাডমিন প্যানেল থেকে ছবি সরাসরি আপলোড করা যাবে। আপলোডের আগে ব্রাউজারেই WebP কমপ্রেশন হয়।"
            : "R2 কনফিগার করা নেই। ছবি আপলোড করতে R2 সিক্রেটগুলো যোগ করতে হবে।"}
        </p>
      </Panel>

      <Panel className="space-y-4">
        <h2 className="text-sm font-bold">সাধারণ</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="ব্র্যান্ড নাম"
            value={str(general, "brand_name")}
            onChange={(v) => setGeneral({ ...general, brand_name: v })}
          />
          <TextField
            label="ট্যাগলাইন"
            value={str(general, "tagline")}
            onChange={(v) => setGeneral({ ...general, tagline: v })}
          />
        </div>
        <Button
          disabled={save.isPending}
          onClick={() => save.mutate({ key: "general", value: general })}
        >
          সেভ করুন
        </Button>
      </Panel>

      <Panel className="space-y-4">
        <h2 className="text-sm font-bold">যোগাযোগ</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField
            label="ফোন"
            value={str(contact, "phone")}
            onChange={(v) => setContact({ ...contact, phone: v })}
          />
          <TextField
            label="ইমেইল"
            value={str(contact, "email")}
            onChange={(v) => setContact({ ...contact, email: v })}
          />
          <TextField
            label="ঠিকানা"
            value={str(contact, "address")}
            onChange={(v) => setContact({ ...contact, address: v })}
          />
        </div>
        <Button
          disabled={save.isPending}
          onClick={() => save.mutate({ key: "contact", value: contact })}
        >
          সেভ করুন
        </Button>
      </Panel>

      <Panel className="space-y-4">
        <h2 className="text-sm font-bold">ডেলিভারি চার্জ</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberField
            label="ঢাকার ভেতরে (৳)"
            value={n(delivery, "inside_dhaka", 60)}
            onChange={(v) => setDelivery({ ...delivery, inside_dhaka: v })}
          />
          <NumberField
            label="ঢাকার বাইরে (৳)"
            value={n(delivery, "outside_dhaka", 120)}
            onChange={(v) => setDelivery({ ...delivery, outside_dhaka: v })}
          />
          <NumberField
            label="ফ্রি ডেলিভারি (৳ এর উপরে)"
            value={n(delivery, "free_above", 0)}
            onChange={(v) => setDelivery({ ...delivery, free_above: v })}
          />
        </div>
        <Button
          disabled={save.isPending}
          onClick={() => save.mutate({ key: "delivery", value: delivery })}
        >
          সেভ করুন
        </Button>
      </Panel>
    </div>
  );
}
