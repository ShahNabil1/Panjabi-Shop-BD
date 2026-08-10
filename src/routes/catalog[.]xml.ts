import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { fetchCatalogFeed } from "@/lib/catalog-feed.server";
import { SITE_URL } from "@/lib/site";

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Google Merchant / Meta Catalog / TikTok Catalog all read this RSS 2.0 feed.
 * One row per purchasable SKU (product, sub-product and every variant).
 */
export const Route = createFileRoute("/catalog.xml")({
  server: {
    handlers: {
      GET: async () => {
        const items = await fetchCatalogFeed();

        const entries = items.map((p) =>
          [
            "    <item>",
            `      <g:id>${esc(p.id)}</g:id>`,
            `      <g:item_group_id>${esc(p.itemGroupId)}</g:item_group_id>`,
            `      <g:title>${esc(p.title)}</g:title>`,
            `      <g:description>${esc(p.description)}</g:description>`,
            `      <g:link>${esc(p.link)}</g:link>`,
            p.imageLink ? `      <g:image_link>${esc(p.imageLink)}</g:image_link>` : null,
            ...p.additionalImages.map(
              (url) => `      <g:additional_image_link>${esc(url)}</g:additional_image_link>`,
            ),
            `      <g:availability>${p.availability}</g:availability>`,
            `      <g:quantity_to_sell_on_facebook>${p.quantity}</g:quantity_to_sell_on_facebook>`,
            `      <g:price>${p.price.toFixed(2)} BDT</g:price>`,
            p.salePrice !== null
              ? `      <g:sale_price>${p.salePrice.toFixed(2)} BDT</g:sale_price>`
              : null,
            `      <g:condition>${p.condition}</g:condition>`,
            `      <g:brand>${esc(p.brand)}</g:brand>`,
            `      <g:mpn>${esc(p.mpn)}</g:mpn>`,
            `      <g:identifier_exists>no</g:identifier_exists>`,
            `      <g:product_type>${esc(p.productType)}</g:product_type>`,
            p.variantLabel ? `      <g:custom_label_0>${esc(p.variantLabel)}</g:custom_label_0>` : null,
            `      <g:custom_label_1>${esc(p.kind)}</g:custom_label_1>`,
            "    </item>",
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
          "  <channel>",
          "    <title>Upoharkabbo Product Catalogue</title>",
          `    <link>${SITE_URL}/</link>`,
          "    <description>Curated gift combos and gift boxes for every occasion.</description>",
          ...entries,
          "  </channel>",
          "</rss>",
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
