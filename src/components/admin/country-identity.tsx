import { Globe } from "lucide-react";
import { resolveCountry } from "@/lib/country";

const flags = import.meta.glob<string>("/src/assets/country-flags/*.svg", {
  eager: true, query: "?url", import: "default",
});

export function CountryIdentity({ country }: { country: unknown }) {
  const resolved = resolveCountry(country);
  if (!resolved) {
    return <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
      <Globe aria-hidden="true" className="size-5" />
      <span>{typeof country === "string" && country.trim() && !["XX", "T1"].includes(country.trim().toUpperCase()) ? country : "Country unavailable"}</span>
    </div>;
  }
  const flag = flags[`/src/assets/country-flags/${resolved.code}.svg`];
  return <div className="mt-3 flex min-w-0 items-center gap-3">
    <span className="country-flag-frame relative inline-flex h-9 w-14 shrink-0 items-center justify-center">
      {flag ? <img src={flag} alt={`${resolved.name} flag`} width={54} height={36}
        className="country-flag h-full w-full rounded-sm border border-border object-contain" />
        : <Globe aria-hidden="true" className="size-6 text-muted-foreground" />}
    </span>
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="rounded-sm bg-secondary px-1.5 py-0.5 font-mono text-xs font-bold text-secondary-foreground">{resolved.code}</span>
        <span className="break-words text-sm font-semibold text-foreground">{resolved.name}</span>
      </div>
    </div>
  </div>;
}