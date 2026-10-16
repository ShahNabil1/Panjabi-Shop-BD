import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your Cart — Panjabi Shop BD" }, { name: "description", content: "Review the panjabis in your Panjabi Shop BD cart before checkout." }, { property: "og:title", content: "Your Cart — Panjabi Shop BD" }, { property: "og:description", content: "Review the panjabis in your Panjabi Shop BD cart before checkout." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }] }),
  // The cart now lives in a slide-over drawer; this URL just returns home.
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
