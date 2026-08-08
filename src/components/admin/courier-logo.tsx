import { Truck } from "lucide-react";

import pathaoAsset from "@/assets/pathao.png.asset.json";
import carrybeeAsset from "@/assets/carrybee-mark.png.asset.json";
import steadfastAsset from "@/assets/steadfast.jpg.asset.json";
import { cn } from "@/lib/utils";

type CourierKey = "pathao" | "carrybee" | "steadfast";

const COURIERS: Record<
  CourierKey,
  { label: string; src: string; chip: string; ring: string; markClass?: string; watermarkClass?: string }
> = {
  pathao: {
    label: "Pathao",
    src: pathaoAsset.url,
    chip: "bg-white text-[#E32227] ring-[#E32227]/30",
    ring: "ring-[#E32227]/25 bg-white",
  },
  carrybee: {
    label: "CarryBee",
    src: carrybeeAsset.url,
    chip: "bg-[#111111] text-[#FFCC00] ring-[#FFCC00]/40",
    ring: "ring-[#FFCC00]/40 bg-[#111111]",
    markClass: "scale-[1.25] p-0",
    watermarkClass: "opacity-[0.10] mix-blend-normal",
  },
  steadfast: {
    label: "Steadfast",
    src: steadfastAsset.url,
    chip: "bg-white text-[#37A184] ring-[#37A184]/30",
    ring: "ring-[#37A184]/25 bg-white",
  },
};

export function courierKey(partner?: string | null): CourierKey | null {
  const k = (partner ?? "").toLowerCase().replace(/[^a-z]/g, "");
  if (k.includes("pathao")) return "pathao";
  if (k.includes("carrybee")) return "carrybee";
  if (k.includes("steadfast")) return "steadfast";
  return null;
}

export function CourierMark({
  partner,
  className,
}: {
  partner?: string | null;
  className?: string;
}) {
  const key = courierKey(partner);
  if (!key) return null;
  const c = COURIERS[key];
  return (
    <span
      className={cn(
        "grid size-7 shrink-0 place-items-center overflow-hidden rounded-full ring-1",
        c.ring,
        className,
      )}
    >
      <img
        src={c.src}
        alt={`${c.label} logo`}
        className={cn("size-full object-contain p-0.5", c.markClass)}
      />
    </span>
  );
}

export function CourierBadge({
  partner,
  className,
}: {
  partner?: string | null;
  className?: string;
}) {
  const key = courierKey(partner);
  if (!key) {
    if (!partner) return null;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold",
          className,
        )}
      >
        <Truck className="size-3.5" />
        {partner}
      </span>
    );
  }
  const c = COURIERS[key];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide shadow-sm ring-1",
        c.chip,
        className,
      )}
    >
      <img
        src={c.src}
        alt=""
        aria-hidden
        className={cn("h-4 w-4 rounded-full object-contain", c.markClass && "w-6 rounded-none")}
      />
      {c.label}
    </span>
  );
}

export function CourierWatermark({
  partner,
  className,
}: {
  partner?: string | null;
  className?: string;
}) {
  const key = courierKey(partner);
  if (!key) return null;
  const c = COURIERS[key];
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 grid select-none place-items-center",
        className,
      )}
    >
      <img
        src={c.src}
        alt=""
        className={cn(
          "w-[65%] max-w-[420px] object-contain opacity-[0.06] mix-blend-multiply",
          c.watermarkClass,
        )}
      />
    </span>
  );
}
