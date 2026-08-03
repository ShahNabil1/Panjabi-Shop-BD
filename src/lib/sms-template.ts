import { SITE_URL } from "./site";

/** Fills {{variables}} in an SMS template. Client-safe (no server-only imports). */
export function renderSmsTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) => vars[key] ?? "");
}

/** Builds the canonical variable map used for every order SMS. */
export function orderSmsVars(order: {
  customer_name?: string | null;
  order_number?: string | null;
  total?: number | string | null;
  customer_phone?: string | null;
}): Record<string, string> {
  const orderNo = String(order.order_number ?? "");
  return {
    name: String(order.customer_name ?? ""),
    order_no: orderNo,
    amount: String(Number(order.total ?? 0)),
    phone: String(order.customer_phone ?? ""),
    receipt_url: orderNo ? `${SITE_URL}/invoice/${orderNo}` : "",
  };
}
