import { createFileRoute } from "@tanstack/react-router";

import { NotFoundView } from "@/components/site/not-found-view";

export const Route = createFileRoute("/$")({
  head: () => ({
    meta: [
      { title: "পেইজটি পাওয়া যায়নি | Not found — তাঁতঘর" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: CatchAll,
});

function CatchAll() {
  return <NotFoundView />;
}
