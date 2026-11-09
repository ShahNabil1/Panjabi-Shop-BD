import r2Asset from "@/assets/cloudflare-r2.png";
import bulksmsbdAsset from "@/assets/bulksmsbd.png";
import bdCourierAsset from "@/assets/bd-courier.png";
import metaAsset from "@/assets/meta.webp";
import gtmAsset from "@/assets/gtm.png";
import ga4Asset from "@/assets/ga4.png";
import tiktokAsset from "@/assets/tiktok-ads.jpg";

import { cn } from "@/lib/utils";
import type { IntegrationGroup } from "@/lib/integrations-shared";

const MARKS: Record<
  IntegrationGroup,
  { label: string; src: string; ring: string; imgClass: string }
> = {
  r2: {
    label: "Cloudflare R2",
    src: r2Asset,
    ring: "ring-[#F6821F]/30 bg-[#F6821F]",
    imgClass: "size-full object-cover",
  },
  meta: {
    label: "Meta Marketing API",
    src: metaAsset,
    ring: "ring-[#0866FF]/25 bg-white",
    imgClass: "w-[88%] object-contain",
  },
  bulksmsbd: {
    label: "BulkSMSBD",
    src: bulksmsbdAsset,
    ring: "ring-[#1F3B99]/25 bg-white",
    imgClass: "w-[86%] object-contain",
  },
  bdcourier: {
    label: "BD Courier",
    src: bdCourierAsset,
    ring: "ring-[#E0218A]/25 bg-white",
    imgClass: "w-[88%] object-contain",
  },
  gtm: {
    label: "Google Tag Manager",
    src: gtmAsset,
    ring: "ring-[#4285F4]/25 bg-white",
    imgClass: "w-[86%] object-contain",
  },
  metacapi: {
    label: "Meta Conversions API",
    src: metaAsset,
    ring: "ring-[#0866FF]/25 bg-white",
    imgClass: "w-[88%] object-contain",
  },
  tiktok: {
    label: "TikTok Events API",
    src: tiktokAsset,
    ring: "ring-[#FE2C55]/25 bg-white",
    imgClass: "size-full object-cover",
  },
  ga4: {
    label: "Google Analytics 4",
    src: ga4Asset,
    ring: "ring-[#F9AB00]/25 bg-white",
    imgClass: "w-[80%] object-contain",
  },
};


export function IntegrationMark({
  group,
  className,
}: {
  group: IntegrationGroup;
  className?: string;
}) {
  const m = MARKS[group];
  if (!m) return null;
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl ring-1",
        m.ring,
        className,
      )}
    >
      <img src={m.src} alt={`${m.label} logo`} className={m.imgClass} />
    </span>
  );
}
