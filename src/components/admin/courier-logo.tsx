import { Truck } from "lucide-react";

import pathaoAsset from "@/assets/pathao.png";
import carrybeeAsset from "@/assets/carrybee-mark.png";
import carrybeeLightAsset from "@/assets/carrybee-mark-onlight.png";
import carrybeeIconAsset from "@/assets/carrybee-icon.jpg";
import steadfastAsset from "@/assets/steadfast-logo.svg";
import steadfastIconAsset from "@/assets/steadfast-icon.webp";
import { cn } from "@/lib/utils";

type CourierKey = "pathao" | "carrybee" | "steadfast";

const COURIERS: Record<
  CourierKey,
  {
    label: string;
    src: string;
    chip: string;
    ring: string; markClass?: string;
    watermarkClass?: string;
    hideLabel?: boolean;
    badgeClass?: string;
    iconSrc?: string;
    watermarkSrc?: string;
    logoClass?: string;
  }
> = {
  pathao: {
    label: "Pathao",
    src: pathaoAsset,
    chip: "bg-white text-[#E32227] ring-[#E32227]/30",
    ring: "ring-[#E32227]/25 bg-white",
    watermarkClass: "opacity-[0.11] mix-blend-multiply",
  },
  carrybee: {
    label: "CarryBee",
    src: carrybeeAsset,
    chip: "bg-[#111111] text-white ring-[#FFCB05]/50",
    ring: "ring-[#FFCB05]/50 bg-[#FFCB05]",
    iconSrc: carrybeeIconAsset,
    watermarkSrc: carrybeeLightAsset,
    markClass: "size-full object-cover p-0",
    watermarkClass: "w-[92%] max-w-[560px] -rotate-[18deg] opacity-[0.22] mix-blend-normal",
    hideLabel: true,
    badgeClass: "px-3 py-1.5",
    logoClass: "h-5 w-auto max-w-[104px]",
  },
  steadfast: {
    label: "Steadfast",
    src: steadfastAsset,
    chip: "bg-white text-[#349574] ring-[#349574]/30",
    ring: "ring-[#349574]/25 bg-white",
    iconSrc: steadfastIconAsset,
    markClass: "size-full object-cover p-0",
    hideLabel: true,
    badgeClass: "px-3 py-1.5",
    logoClass: "h-4 w-auto max-w-[112px]",
    watermarkClass:
      "w-[78%] max-w-[520px] self-start justify-self-center pt-6 opacity-[0.3] -rotate-6",
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
        src={c.iconSrc ?? c.src}
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
        c.badgeClass,
        className,
      )}
    >
      <img
        src={c.src}
        alt=""
        aria-hidden
        className={cn(
          "h-4 w-4 rounded-full object-contain",
          c.hideLabel && "rounded-none",
          c.logoClass,
        )}
      />
      {c.hideLabel ? <span className="sr-only">{c.label}</span> : c.label}
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
        src={c.watermarkSrc ?? c.src}
        alt=""
        className={cn(
          "w-[65%] max-w-[420px] object-contain opacity-[0.06] mix-blend-multiply",
          "origin-center",
          c.watermarkClass,
        )}
      />
    </span>
  );
}
