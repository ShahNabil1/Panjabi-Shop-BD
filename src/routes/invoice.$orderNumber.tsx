import { createFileRoute, redirect } from "@tanstack/react-router";

import { phoneLast4 } from "@/lib/order-receipt";

function searchSchema(input: Record<string, unknown>) {
  return {
    phone: input["phone"] == null ? "" : String(input["phone"]),
    print: input["print"] == null ? "" : String(input["print"]),
  };
}

/** Legacy invoice URL — permanently forwards to the short /inv link. */
export const Route = createFileRoute("/invoice/$orderNumber")({
  validateSearch: searchSchema,
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: "/inv/$orderNumber",
      params: { orderNumber: params.orderNumber },
      search: search.print
        ? { p: phoneLast4(search.phone), print: search.print }
        : { p: phoneLast4(search.phone) },
      replace: true,
    });
  },
});
