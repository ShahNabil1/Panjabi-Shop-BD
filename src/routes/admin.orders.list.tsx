import { createFileRoute } from "@tanstack/react-router";

import { listOrderStatuses } from "@/lib/admin-schema";
import { OrdersBoard } from "@/components/admin/orders-board";

export const Route = createFileRoute("/admin/orders/list")({
  component: AdminOrderListPage,
});

function AdminOrderListPage() {
  return (
    <OrdersBoard
      bucket="list"
      statuses={listOrderStatuses}
      emptyTitle="No confirmed orders yet"
    />
  );
}
