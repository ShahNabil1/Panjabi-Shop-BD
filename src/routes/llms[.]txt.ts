import { createFileRoute } from "@tanstack/react-router";

const content = `# Panjabi Shop BD

Panjabi Shop BD is a Bangladesh-based online store for panjabis, clothing offers, and related products. The storefront supports Bengali and English content, nationwide delivery, and cash on delivery.

## Primary pages

- [Homepage](https://panjabishopbd.com/): Featured collections and current products
- [Product categories](https://panjabishopbd.com/categories): Browse the active catalog by category
- [Current offers](https://panjabishopbd.com/offers): Active promotions and discounted products
- [Frequently asked questions](https://panjabishopbd.com/faq): Ordering, payment, and delivery information
- [About Panjabi Shop BD](https://panjabishopbd.com/about): Store information
- [Contact](https://panjabishopbd.com/contact): Customer support details

## Policies

- [Return policy](https://panjabishopbd.com/return-policy)
- [Privacy policy](https://panjabishopbd.com/privacy-policy)
- [Terms and conditions](https://panjabishopbd.com/terms-and-conditions)

## Machine-readable resources

- [XML sitemap](https://panjabishopbd.com/sitemap.xml): Current public and indexable pages
- [Product catalog](https://panjabishopbd.com/catalog.xml): Current product listings

Private administration pages are not public resources and must not be indexed.
`;

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () =>
        new Response(content, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
            "X-Content-Type-Options": "nosniff",
          },
        }),
    },
  },
});