import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { fetchSitemapData } from "@/lib/catalog.server";


import { SITE_URL as BASE_URL } from "@/lib/site";

type Entry = { path: string; changefreq?: string; priority?: string };

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const data = await fetchSitemapData();

        const entries: Entry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/offers", changefreq: "daily", priority: "0.8" },
          { path: "/faq", changefreq: "monthly", priority: "0.5" },
          { path: "/about", changefreq: "yearly", priority: "0.4" },
          { path: "/contact", changefreq: "yearly", priority: "0.4" },
        ];

        for (const c of data.categories) {
          entries.push({ path: `/c/${c.slug}`, changefreq: "weekly", priority: "0.8" });
        }
        for (const s of data.subcategories) {
          if (!s.categories?.slug) continue;
          entries.push({
            path: `/c/${s.categories.slug}/${s.slug}`,
            changefreq: "weekly",
            priority: "0.7",
          });
        }
        for (const p of data.products) {
          entries.push({ path: `/p/${p.slug}`, changefreq: "weekly", priority: "0.9" });
        }
        for (const p of data.promotions) {
          entries.push({ path: `/offers/${p.slug}`, changefreq: "daily", priority: "0.7" });
        }
        for (const l of data.landings) {
          entries.push({ path: `/lp/${l.slug}`, changefreq: "weekly", priority: "0.6" });
        }

        const urls = entries.map((e) =>
          [
            "  <url>",
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            "  </url>",
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          ...urls,
          "</urlset>",
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
