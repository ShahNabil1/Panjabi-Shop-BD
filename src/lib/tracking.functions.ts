/**
 * Public tracking config for the browser.
 *
 * Only the GTM container id is exposed — every actual pixel id and API secret
 * stays server-side. The container is what loads Meta Pixel, TikTok Pixel,
 * GA4 and Microsoft Clarity in the browser.
 */

import { createServerFn } from "@tanstack/react-start";

export const getGtmContainerId = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { readTrackingConfig } = await import("./tracking.server");
    const cfg = await readTrackingConfig();
    const id = cfg.gtmId.toUpperCase();
    return { gtmId: /^GTM-[A-Z0-9]{6,9}$/.test(id) ? id : "" };
  } catch {
    return { gtmId: "" };
  }
});
