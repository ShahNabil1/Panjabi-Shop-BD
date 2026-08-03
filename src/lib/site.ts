/** Canonical public origin of the storefront. Used by sitemap/catalog feeds and JSON-LD. */
export const SITE_URL = "https://upoharkabbo.lovable.app";

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
