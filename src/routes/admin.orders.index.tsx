import { createFileRoute } from "@tanstack/react-router";

import { webOrderStatuses } from "@/lib/admin-schema";
import { OrdersBoard } from "@/components/admin/orders-board";

export const Route = createFileRoute("/admin/orders/")({
  component: AdminWebOrdersPage,
});

function AdminWebOrdersPage() {
  return (
    <OrdersBoard
      bucket="web"
      statuses={webOrderStatuses}
      emptyTitle="No web orders yet"
    />
  );
}
