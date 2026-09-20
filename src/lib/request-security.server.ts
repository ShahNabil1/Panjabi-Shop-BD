export async function getRequestSecurityContext() {
  const { getRequestHeader, getRequestIP } = await import("@tanstack/react-start/server");
  let ip: string | null = null;
  let userAgent: string | null = null;
  let location: Record<string, string> = {};
  try {
    const cloudflareIp = getRequestHeader("cf-connecting-ip")?.trim();
    const forwardedIp = getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim();
    ip = cloudflareIp || forwardedIp || getRequestIP({ xForwardedFor: true }) || null;
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
    location = Object.fromEntries(headers.flatMap(([key, header]) => {
      const value = getRequestHeader(header)?.trim();
      return value ? [[key, value]] : [];
    }));
  } catch {
    // Local preview and prerender may not provide a request context.
  }
  return { ip, userAgent, location };
}