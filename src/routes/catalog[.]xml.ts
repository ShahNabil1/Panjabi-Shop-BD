import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { fetchCatalogFeed } from "@/lib/catalog.server";

// TODO: replace with your project URL once a project name or custom domain is set.
const BASE_URL = "";

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const Route = createFileRoute("/catalog.xml")({
  server: {
    handlers: {
      GET: async () => {
        const products = await fetchCatalogFeed();

        const items = products.map((p) => {
          const image = [...(p.product_images ?? [])].sort(
            (a, b) => a.sort_order - b.sort_order,
          )[0]?.url;
          const description = p.short_description_bn || p.short_description_en || p.name_bn;

          return [
            "    <item>",
            `      <g:id>${esc(p.sku || p.id)}</g:id>`,
            `      <g:title>${esc(p.name_bn)}</g:title>`,
            `      <g:description>${esc(description)}</g:description>`,
            `      <g:link>${BASE_URL}/p/${esc(p.slug)}</g:link>`,
            image ? `      <g:image_link>${esc(image)}</g:image_link>` : null,
            `      <g:availability>${p.stock > 0 ? "in stock" : "out of stock"}</g:availability>`,
            `      <g:price>${Number(p.compare_at_price ?? p.price).toFixed(2)} BDT</g:price>`,
            p.compare_at_price && Number(p.compare_at_price) > Number(p.price)
              ? `      <g:sale_price>${Number(p.price).toFixed(2)} BDT</g:sale_price>`
              : null,
            `      <g:condition>new</g:condition>`,
            p.brand ? `      <g:brand>${esc(p.brand)}</g:brand>` : null,
            p.categories?.name_en
              ? `      <g:product_type>${esc(p.categories.name_en)}</g:product_type>`
              : null,
            "    </item>",
          ]
            .filter(Boolean)
            .join("\n");
        });

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
          "  <channel>",
          "    <title>Tantghor Product Catalogue</title>",
          `    <link>${BASE_URL}/</link>`,
          "    <description>Handwoven products from Bangladeshi weavers.</description>",
          ...items,
          "  </channel>",
          "</rss>",
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
