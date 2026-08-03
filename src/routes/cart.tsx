import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/cart")({
  // The cart now lives in a slide-over drawer; this URL just returns home.
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
