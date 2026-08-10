import r2Asset from "@/assets/cloudflare-r2.png.asset.json";
import bulksmsbdAsset from "@/assets/bulksmsbd.png.asset.json";
import bdCourierAsset from "@/assets/bd-courier.png.asset.json";
import { cn } from "@/lib/utils";
import type { IntegrationGroup } from "@/lib/integrations-shared";

const MARKS: Record<
  IntegrationGroup,
  { label: string; src: string; ring: string; imgClass: string }
> = {
  r2: {
    label: "Cloudflare R2",
    src: r2Asset.url,
    ring: "ring-[#F6821F]/30 bg-[#F6821F]",
    imgClass: "size-full object-cover",
  },
  bulksmsbd: {
    label: "BulkSMSBD",
    src: bulksmsbdAsset.url,
    ring: "ring-[#1F3B99]/25 bg-white",
    imgClass: "w-[86%] object-contain",
  },
  bdcourier: {
    label: "BD Courier",
    src: bdCourierAsset.url,
    ring: "ring-[#E0218A]/25 bg-white",
    imgClass: "w-[88%] object-contain",
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
