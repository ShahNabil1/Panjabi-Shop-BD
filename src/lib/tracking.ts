/**
 * Browser tracking foundation (client-safe).
 *
 * Every marketing event is pushed into the GTM `dataLayer` with a stable
 * `event_id`, so the same id can later be replayed server-side (Meta CAPI /
 * TikTok Events API / GA4 Measurement Protocol) and be de-duplicated.
 *
 * Nothing here loads a pixel — Meta Pixel, TikTok Pixel, GA4 and Clarity are
 * all configured inside the GTM container. This file only feeds them.
 */

import { useEffect, useRef } from "react";

import { getAttribution, visitorId } from "./attribution";

export type Surface = "site" | "landing";

export type TrackingItem = {
  /** MUST equal the catalog id (`sku`) used in /catalog.xml. */
  id: string;
  name?: string | undefined;
  category?: string | undefined;
  quantity: number;
  price: number;
};

type DataLayerRecord = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: DataLayerRecord[];
  }
}

/** Which funnel the visitor is in — landing pages track separately. */
export function surfaceOf(pathname: string): Surface {
  return pathname.startsWith("/lp/") ? "landing" : "site";
}

/**
 * Stable event id shared by the browser event and its server-side twin.
 * Orders use the order number instead, so retries never double-count.
 */
export function newEventId(event: string): string {
  const vid = (visitorId() ?? "anon").replace(/-/g, "").slice(0, 12);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${event}.${vid}.${Math.floor(Date.now() / 1000)}.${rand}`;
}

/** Pushes an event into the GTM dataLayer (no-op during SSR). */
export function pushEvent(
  event: string,
  payload: DataLayerRecord = {},
  options?: { eventId?: string; surface?: Surface },
): string | undefined {
  if (typeof window === "undefined") return undefined;
  const eventId = options?.eventId ?? newEventId(event);
  const attribution = getAttribution().last ?? {};
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({
    event,
    event_id: eventId,
    surface: options?.surface ?? surfaceOf(window.location.pathname),
    external_id: visitorId(),
    fbp: attribution.fbp,
    fbc: attribution.fbc,
    ttclid: attribution.ttclid,
    ttp: attribution.ttp,
    ...payload,
  });
  return eventId;
}

/** GA4 / Meta friendly ecommerce block for a set of items. */
export function ecommerce(items: TrackingItem[], extra?: DataLayerRecord): DataLayerRecord {
  const value = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return {
    ecommerce: {
      currency: "BDT",
      value,
      items: items.map((i) => ({
        item_id: i.id,
        item_name: i.name,
        item_category: i.category,
        price: i.price,
        quantity: i.quantity,
      })),
      ...extra,
    },
    content_type: "product",
    content_ids: items.map((i) => i.id),
    contents: items.map((i) => ({ id: i.id, quantity: i.quantity, item_price: i.price })),
    num_items: items.reduce((sum, i) => sum + i.quantity, 0),
    value,
    currency: "BDT",
  };
}

const SCROLL_STEPS = [25, 50, 75, 100] as const;

/**
 * Fires `scroll_depth` once per threshold (25/50/75/100%) for the current
 * page. Used on landing pages, where scroll is the main engagement signal.
 */
export function useScrollDepth(payload: DataLayerRecord = {}, enabled = true) {
  const fired = useRef<Set<number>>(new Set());
  const key = JSON.stringify(payload);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const seen = fired.current;
    seen.clear();

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const percent =
        scrollable <= 0 ? 100 : ((window.scrollY + window.innerHeight) / doc.scrollHeight) * 100;
      for (const step of SCROLL_STEPS) {
        if (percent >= step && !seen.has(step)) {
          seen.add(step);
          pushEvent("scroll_depth", { ...payload, percent_scrolled: step });
        }
      }
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
    // `key` re-arms the tracker whenever the tracked page/product changes.
  }, [key, enabled, payload]);
}

/** Fires an event exactly once per mount (e.g. ViewContent / begin_checkout). */
export function useTrackOnce(event: string, payload: DataLayerRecord, enabled = true) {
  const key = `${event}:${JSON.stringify(payload)}`;
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || done.current === key) return;
    done.current = key;
    pushEvent(event, payload);
  }, [key, enabled, event, payload]);
}
