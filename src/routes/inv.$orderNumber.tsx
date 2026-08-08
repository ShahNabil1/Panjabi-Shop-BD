import { createFileRoute, Link, useLoaderData } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";

import logoMark from "@/assets/upoharkabbo-logo.png";
import { getOrderSummaryShort } from "@/lib/order.functions";
import { orderStatusLabel } from "@/lib/order-receipt";
import { formatPrice } from "@/lib/i18n";

function searchSchema(input: Record<string, unknown>) {
  return {
    p: (input["p"] ?? "") as string | number,
    print: (input["print"] ?? "") as string | number,
  };
}

export const Route = createFileRoute("/inv/$orderNumber")({
  validateSearch: searchSchema,
  head: ({ params }) => ({
    meta: [
      { title: `Invoice ${params.orderNumber} — Upoharkabbo` },
      { name: "description", content: "Your Upoharkabbo order invoice — print or save as PDF." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Invoice — Upoharkabbo" },
      { property: "og:description", content: "Your Upoharkabbo order invoice." },
    ],
  }),
  component: InvoicePage,
});

type SiteData = {
  brand: string;
  contact: { phone: string; email: string; address: string };
};

function InvoicePage() {
  const { orderNumber } = Route.useParams();
  const search = Route.useSearch();
  const p = String(search.p ?? "");
  const print = String(search.print ?? "");
  const site = useLoaderData({ from: "__root__" }) as SiteData;
  const fetchSummary = useServerFn(getOrderSummaryShort);

  const { data, isPending } = useQuery({
    queryKey: ["invoice-short", orderNumber, p],
    queryFn: () => fetchSummary({ data: { orderNumber, p } }),
    enabled: p.length >= 4,
    retry: false,
  });

  const printed = useRef(false);
  useEffect(() => {
    if (print !== "1" || !data || printed.current) return;
    printed.current = true;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [print, data]);

  if (p.length < 4 || (!isPending && !data)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Invoice not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The invoice link looks incomplete or incorrect.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-sm border border-border px-5 py-2.5 text-sm font-semibold"
        >
          Back to home
        </Link>
      </div>
    );
  }

  if (isPending || !data) {
    return <div className="mx-auto mt-10 h-64 max-w-2xl animate-pulse rounded-sm bg-secondary" />;
  }

  return (
    <div className="mx-auto max-w-[820px] px-4 py-8 print:px-0 print:py-0">
      <div className="mb-5 flex items-center justify-between gap-3 print:hidden">
        <Link to="/" className="text-sm font-semibold text-primary">
          ← {site.brand}
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-sm bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Print / Save PDF
        </button>
      </div>

      <article className="rounded-sm border border-border bg-card p-8 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <img
              src={logoMark}
              alt={`${site.brand} logo`}
              className="h-16 w-auto object-contain"
            />
            {site.contact.address ? (
              <p className="mt-2 text-xs text-muted-foreground">{site.contact.address}</p>
            ) : null}
            {site.contact.phone ? (
              <p className="text-xs text-muted-foreground font-en">{site.contact.phone}</p>
            ) : null}
            {site.contact.email ? (
              <p className="text-xs text-muted-foreground font-en">{site.contact.email}</p>
            ) : null}
          </div>
          <div className="text-right font-en">
            <p className="text-sm font-bold uppercase tracking-wide">Invoice</p>
            <p className="mt-1 text-sm font-bold text-primary">{data.orderNumber}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(data.createdAt).toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="text-xs text-muted-foreground">Payment: Cash on Delivery</p>
          </div>
        </header>

        <section className="mt-5 grid gap-4 font-en sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-bold uppercase text-muted-foreground">Customer</h2>
            <p className="mt-1 text-sm font-semibold">{data.customerName}</p>
            <p className="text-sm">{data.customerPhone}</p>
            <p className="text-sm">
              {data.addressLine}, {data.city}
            </p>
          </div>
          <div className="sm:text-right">
            <h2 className="text-xs font-bold uppercase text-muted-foreground">Status</h2>
            <p className="mt-1 text-sm font-semibold">{orderStatusLabel(data.status)}</p>
          </div>
        </section>

        <table className="mt-6 w-full border-collapse font-en text-sm">
          <thead>
            <tr className="border-y border-border text-left">
              <th className="py-2 font-semibold">Item</th>
              <th className="py-2 text-center font-semibold">Qty</th>
              <th className="py-2 text-right font-semibold">Rate</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, index) => (
              <tr key={index} className="border-b border-border/60">
                <td className="py-2">
                  {item.name}
                  {item.variantLabel ? (
                    <span className="text-muted-foreground"> · {item.variantLabel}</span>
                  ) : null}
                  {item.comboSelections.length > 0 ? (
                    <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {item.comboSelections.map((selection, selectionIndex) => (
                        <li key={selectionIndex}>
                          {selection.itemNameEn} — {selection.variantLabelEn}
                          {selection.quantity > 1 ? ` × ${selection.quantity}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </td>
                <td className="py-2 text-center tabular-nums">{item.quantity}</td>
                <td className="py-2 text-right tabular-nums">
                  {formatPrice("en", item.unitPrice)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatPrice("en", item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end font-en">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{formatPrice("en", data.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery charge</dt>
              <dd className="tabular-nums">{formatPrice("en", data.deliveryCharge)}</dd>
            </div>
            {data.discount > 0 ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Discount</dt>
                <dd className="tabular-nums">− {formatPrice("en", data.discount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums text-primary">{formatPrice("en", data.total)}</dd>
            </div>
          </dl>
        </div>
      </article>
    </div>
  );
}
