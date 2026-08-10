import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { fetchCatalogFeed } from "@/lib/catalog-feed.server";

const cell = (v: string | number | null) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const HEADER = [
  "id",
  "item_group_id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "sale_price",
  "link",
  "image_link",
  "additional_image_link",
  "brand",
  "mpn",
  "google_product_category",
  "product_type",
  "quantity_to_sell_on_facebook",
  "custom_label_0",
  "custom_label_1",
];

/** Same rows as /catalog.xml in the CSV shape TikTok & Google also accept. */
export const Route = createFileRoute("/catalog.csv")({
  server: {
    handlers: {
      GET: async () => {
        const items = await fetchCatalogFeed();
        const lines = [HEADER.join(",")];

        for (const p of items) {
          lines.push(
            [
              p.id,
              p.itemGroupId,
              p.title,
              p.description,
              p.availability,
              p.condition,
              `${p.price.toFixed(2)} BDT`,
              p.salePrice !== null ? `${p.salePrice.toFixed(2)} BDT` : "",
              p.link,
              p.imageLink ?? "",
              p.additionalImages.join(","),
              p.brand,
              p.mpn,
              "",
              p.productType,
              p.quantity,
              p.variantLabel ?? "",
              p.kind,
            ]
              .map(cell)
              .join(","),
          );
        }

        return new Response(`\uFEFF${lines.join("\n")}`, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
