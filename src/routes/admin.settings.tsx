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
      <AdminHeading title="সেটিংস" description="ব্র্যান্ড, যোগাযোগ ও ডেলিভারি চার্জ।" />

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
