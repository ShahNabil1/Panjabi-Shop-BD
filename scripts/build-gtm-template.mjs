/**
 * Generates a reusable Google Tag Manager container export
 * (public/gtm/upoharkabbo-gtm-template.json).
 *
 * Import it into ANY GTM container (Admin → Import Container), then only
 * edit the 4 constant variables (GA4 ID, Meta Pixel, TikTok Pixel, Clarity).
 *
 * Run: node scripts/build-gtm-template.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";

let id = 0;
const nid = () => String(++id);

const ACC = "0";
const CNT = "0";
const base = (type, name, extra) => ({
  accountId: ACC,
  containerId: CNT,
  name,
  type,
  ...extra,
});

/* ------------------------------------------------------------------ */
/* Variables                                                           */
/* ------------------------------------------------------------------ */

const constant = (name, value, note) =>
  base("c", name, {
    variableId: nid(),
    notes: note,
    parameter: [{ type: "TEMPLATE", key: "value", value }],
  });

const dlv = (name, dataLayerName, version = 2) =>
  base("v", name, {
    variableId: nid(),
    parameter: [
      { type: "INTEGER", key: "dataLayerVersion", value: String(version) },
      { type: "BOOLEAN", key: "setDefaultValue", value: "false" },
      { type: "TEMPLATE", key: "name", value: dataLayerName },
    ],
  });

const variable = [
  constant("CFG - GA4 Measurement ID", "G-XXXXXXXXXX", "Replace per project."),
  constant("CFG - Meta Pixel ID", "000000000000000", "Replace per project."),
  constant("CFG - TikTok Pixel ID", "XXXXXXXXXXXXXXXXXXXX", "Replace per project."),
  constant("CFG - Clarity Project ID", "xxxxxxxxxx", "Replace per project."),

  dlv("DL - event_id", "event_id"),
  dlv("DL - surface", "surface"),
  dlv("DL - external_id", "external_id"),
  dlv("DL - fbp", "fbp"),
  dlv("DL - fbc", "fbc"),
  dlv("DL - ttclid", "ttclid"),
  dlv("DL - ttp", "ttp"),
  dlv("DL - value", "value"),
  dlv("DL - currency", "currency"),
  dlv("DL - content_ids", "content_ids"),
  dlv("DL - contents", "contents"),
  dlv("DL - content_type", "content_type"),
  dlv("DL - num_items", "num_items"),
  dlv("DL - percent_scrolled", "percent_scrolled"),
  dlv("DL - transaction_id", "ecommerce.transaction_id"),
  dlv("DL - items", "ecommerce.items"),
  dlv("DL - order_number", "order_number"),
  dlv("DL - customer_phone", "customer_phone"),
];

const V = (n) => `{{${n}}}`;

/* ------------------------------------------------------------------ */
/* Triggers — one per dataLayer event pushed by src/lib/tracking.ts     */
/* ------------------------------------------------------------------ */

const customEvent = (name, eventName) =>
  base("CUSTOM_EVENT", name, {
    triggerId: nid(),
    customEventFilter: [
      {
        type: "EQUALS",
        parameter: [
          { type: "TEMPLATE", key: "arg0", value: "{{_event}}" },
          { type: "TEMPLATE", key: "arg1", value: eventName },
        ],
      },
    ],
  });

const EVENTS = [
  ["view_page", "view_page"],
  ["view_item", "view_item"],
  ["view_item_list", "view_item_list"],
  ["add_to_cart", "add_to_cart"],
  ["begin_checkout", "begin_checkout"],
  ["add_payment_info", "add_payment_info"],
  ["purchase", "purchase"],
  ["scroll_depth", "scroll_depth"],
  ["search", "search"],
  ["contact", "contact"],
];

const trigger = EVENTS.map(([n, e]) => customEvent(`CE - ${n}`, e));
const T = Object.fromEntries(trigger.map((t) => [t.name.replace("CE - ", ""), t.triggerId]));

const allPages = base("PAGEVIEW", "All Pages", { triggerId: nid() });
trigger.push(allPages);

/* ------------------------------------------------------------------ */
/* Tags                                                                */
/* ------------------------------------------------------------------ */

const html = (name, code, triggers, priority) =>
  base("html", name, {
    tagId: nid(),
    ...(priority
      ? { priority: { type: "INTEGER", key: "priority", value: String(priority) } }
      : {}),
    parameter: [
      { type: "TEMPLATE", key: "html", value: code },
      { type: "BOOLEAN", key: "supportDocumentWrite", value: "false" },
    ],
    firingTriggerId: triggers,
  });

const META_MAP = {
  view_page: "PageView",
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  add_payment_info: "AddPaymentInfo",
  purchase: "Purchase",
  search: "Search",
  contact: "Contact",
};

const TT_MAP = {
  view_page: "Pageview",
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "PlaceAnOrder",
  search: "Search",
  contact: "Contact",
};

const tag = [];

/* --- GA4 --------------------------------------------------------- */
tag.push(
  base("googtag", "GA4 - Configuration", {
    tagId: nid(),
    parameter: [
      { type: "TEMPLATE", key: "tagId", value: V("CFG - GA4 Measurement ID") },
      {
        type: "LIST",
        key: "configSettingsTable",
        list: [
          {
            type: "MAP",
            map: [
              { type: "TEMPLATE", key: "parameter", value: "send_page_view" },
              { type: "TEMPLATE", key: "parameterValue", value: "true" },
            ],
          },
        ],
      },
    ],
    firingTriggerId: [allPages.triggerId],
  }),
);

const ga4Event = (name, eventName, triggerName, params = []) =>
  base("gaawe", name, {
    tagId: nid(),
    parameter: [
      { type: "TEMPLATE", key: "eventName", value: eventName },
      { type: "BOOLEAN", key: "sendEcommerceData", value: "true" },
      { type: "TEMPLATE", key: "getEcommerceDataFrom", value: "dataLayer" },
      { type: "TAG_REFERENCE", key: "measurementId", value: "GA4 - Configuration" },
      {
        type: "LIST",
        key: "eventSettingsTable",
        list: [
          ...params,
          { key: "surface", value: V("DL - surface") },
          { key: "event_id", value: V("DL - event_id") },
        ].map((p) => ({
          type: "MAP",
          map: [
            { type: "TEMPLATE", key: "parameter", value: p.key },
            { type: "TEMPLATE", key: "parameterValue", value: p.value },
          ],
        })),
      },
    ],
    firingTriggerId: [T[triggerName]],
  });

tag.push(
  ga4Event("GA4 - view_item", "view_item", "view_item"),
  ga4Event("GA4 - view_item_list", "view_item_list", "view_item_list"),
  ga4Event("GA4 - add_to_cart", "add_to_cart", "add_to_cart"),
  ga4Event("GA4 - begin_checkout", "begin_checkout", "begin_checkout"),
  ga4Event("GA4 - add_payment_info", "add_payment_info", "add_payment_info"),
  ga4Event("GA4 - purchase", "purchase", "purchase"),
  ga4Event("GA4 - search", "search", "search"),
  ga4Event("GA4 - contact", "generate_lead", "contact"),
  ga4Event("GA4 - scroll_depth", "scroll", "scroll_depth", [
    { key: "percent_scrolled", value: V("DL - percent_scrolled") },
  ]),
);

/* --- Meta Pixel --------------------------------------------------- */
tag.push(
  html(
    "Meta Pixel - Base",
    `<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(V("CFG - Meta Pixel ID"))});
</script>`,
    [allPages.triggerId],
    100,
  ),
);

/** Unquoted variable reference — arrays/numbers must NOT be wrapped in quotes,
 *  otherwise GTM stringifies them ("[object Object]"). */
const R = (name) => `{{${name}}}`;

for (const [ev, fbEvent] of Object.entries(META_MAP)) {
  tag.push(
    html(
      `Meta Pixel - ${fbEvent}`,
      `<script>
  window.fbq && fbq('track', ${JSON.stringify(fbEvent)}, {
    content_type: ${JSON.stringify(V("DL - content_type"))} || 'product',
    content_ids: ${R("DL - content_ids")},
    contents: ${R("DL - contents")},
    num_items: ${R("DL - num_items")},
    value: ${R("DL - value")},
    currency: ${JSON.stringify(V("DL - currency"))} || 'BDT'
  }, { eventID: ${JSON.stringify(V("DL - event_id"))} });
</script>`,
      [T[ev]],
    ),
  );
}

/* --- TikTok Pixel -------------------------------------------------- */
tag.push(
  html(
    "TikTok Pixel - Base",
    `<script>
!function (w, d, t) { w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js";
ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;
ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript";
o.async=!0;o.src=r+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];
a.parentNode.insertBefore(o,a)};
ttq.load(${JSON.stringify(V("CFG - TikTok Pixel ID"))});ttq.page();
}(window, document, 'ttq');
</script>`,
    [allPages.triggerId],
    100,
  ),
);

for (const [ev, ttEvent] of Object.entries(TT_MAP)) {
  if (ev === "view_page") continue; // ttq.page() already fires on load
  tag.push(
    html(
      `TikTok Pixel - ${ttEvent}`,
      `<script>
  var _c = ${R("DL - contents")} || [];
  var _ids = ${R("DL - content_ids")} || [];
  window.ttq && ttq.track(${JSON.stringify(ttEvent)}, {
    contents: _c,
    content_id: (_c[0] && (_c[0].content_id || _c[0].id)) || _ids[0],
    content_name: _c[0] && _c[0].content_name,
    content_type: 'product',
    value: ${R("DL - value")},
    currency: ${JSON.stringify(V("DL - currency"))} || 'BDT'
  }, { event_id: ${JSON.stringify(V("DL - event_id"))} });
</script>`,
      [T[ev]],
    ),
  );
}

/* --- Microsoft Clarity ---------------------------------------------- */
tag.push(
  html(
    "Microsoft Clarity",
    `<script>
(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${JSON.stringify(
      V("CFG - Clarity Project ID"),
    )});
</script>`,
    [allPages.triggerId],
    100,
  ),
);

/* ------------------------------------------------------------------ */

const container = {
  exportFormatVersion: 2,
  exportTime: new Date().toISOString(),
  containerVersion: {
    accountId: ACC,
    containerId: CNT,
    containerVersionId: "0",
    name: "Panjabi Shop BD Tracking Template",
    description:
      "GA4 + Meta Pixel + TikTok Pixel + Microsoft Clarity, wired to the dataLayer events pushed by src/lib/tracking.ts. Edit only the four CFG - * constant variables after import.",
    container: {
      accountId: ACC,
      containerId: CNT,
      name: "Panjabi Shop BD Tracking Template",
      publicId: "GTM-XXXXXXX",
      usageContext: ["WEB"],
      fingerprint: "0",
    },
    tag,
    trigger,
    variable,
    builtInVariable: [
      ["PAGE_URL", "Page URL"],
      ["PAGE_HOSTNAME", "Page Hostname"],
      ["PAGE_PATH", "Page Path"],
      ["REFERRER", "Referrer"],
      ["EVENT", "Event"],
    ].map(([type, name]) => ({ accountId: ACC, containerId: CNT, type, name })),
    fingerprint: "0",
  },
};

mkdirSync("public/gtm", { recursive: true });
writeFileSync(
  "public/gtm/upoharkabbo-gtm-template.json",
  JSON.stringify(container, null, 2) + "\n",
);
console.log(
  `Wrote public/gtm/upoharkabbo-gtm-template.json — ${tag.length} tags, ${trigger.length} triggers, ${variable.length} variables.`,
);
