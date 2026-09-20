import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const securityInput = z.object({
  fingerprint: z.string().trim().min(16).max(128).nullable().optional(),
  phone: z.string().trim().max(20).nullable().optional(),
});

function requestIp(getRequestHeader: (name: string) => string | undefined, getRequestIP: (options?: { xForwardedFor?: boolean }) => string | undefined) {
  const cloudflareIp = getRequestHeader("cf-connecting-ip")?.trim();
  if (cloudflareIp) return cloudflareIp;
  const forwardedIp = getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedIp || getRequestIP({ xForwardedFor: true }) || null;
}

export async function getRequestSecurityContext() {
  const { getRequestHeader, getRequestIP } = await import("@tanstack/react-start/server");
  let ip: string | null = null;
  let userAgent: string | null = null;
  let location: Record<string, string> = {};
  try {
    ip = requestIp(getRequestHeader, getRequestIP);
    userAgent = (getRequestHeader("user-agent") ?? "").slice(0, 500) || null;
    const headers: Array<[string, string]> = [
      ["country", "cf-ipcountry"],
      ["region", "cf-region"],
      ["city", "cf-ipcity"],
      ["postalCode", "cf-postal-code"],
      ["timezone", "cf-timezone"],
      ["latitude", "cf-latitude"],
      ["longitude", "cf-longitude"],
    ];
    location = Object.fromEntries(
      headers.flatMap(([key, header]) => {
        const value = getRequestHeader(header)?.trim();
        return value ? [[key, value]] : [];
      }),
    );
  } catch {
    // Local preview and prerender may not provide a request context.
  }
  return { ip, userAgent, location };
}

export const checkStorefrontAccess = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => securityInput.parse(input))
  .handler(async ({ data }) => {
    const { ip } = await getRequestSecurityContext();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const candidates = [
      ip ? { kind: "ip", value: ip } : null,
      data.fingerprint ? { kind: "fingerprint", value: data.fingerprint } : null,
      data.phone ? { kind: "phone", value: data.phone } : null,
    ].filter((entry): entry is { kind: string; value: string } => Boolean(entry));
    if (!candidates.length) return { blocked: false };
    const values = [...new Set(candidates.map((entry) => entry.value))];
    const { data: matches, error } = await supabaseAdmin
      .from("blocked_identifiers")
      .select("kind, value")
      .in("value", values);
    if (error) throw new Error("SECURITY_CHECK_FAILED");
    const blocked = (matches ?? []).some((match) =>
      candidates.some((candidate) => candidate.kind === match.kind && candidate.value === match.value),
    );
    return { blocked };
  });