import { createFileRoute, redirect } from "@tanstack/react-router";

import { phoneLast4 } from "@/lib/order-receipt";

const searchSchema = z.object({
  phone: z.string().catch(""),
  print: z.coerce.string().catch(""),
});

/** Legacy invoice URL — permanently forwards to the short /inv link. */
export const Route = createFileRoute("/invoice/$orderNumber")({
  validateSearch: searchSchema,
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: "/inv/$orderNumber",
      params: { orderNumber: params.orderNumber },
      search: { p: phoneLast4(search.phone), print: search.print },
      replace: true,
    });
  },
});
