import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useLoaderData } from "@tanstack/react-router";
import { z } from "zod";

import { getOrderSummary } from "@/lib/order.functions";
import { formatPrice } from "@/lib/i18n";

const searchSchema = z.object({ phone: z.string().catch("") });

export const Route = createFileRoute("/invoice/$orderNumber")({
  validateSearch: searchSchema,
  head: ({ params }) => ({
    meta: [
      { title: `ইনভয়েস ${params.orderNumber}` },
      { name: "description", content: "অর্ডারের ইনভয়েস — প্রিন্ট বা PDF হিসেবে সেভ করুন।" },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "ইনভয়েস" },
      { property: "og:description", content: "অর্ডারের ইনভয়েস।" },
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
  const { phone } = Route.useSearch();
  const site = useLoaderData({ from: "__root__" }) as SiteData;
  const fetchSummary = useServerFn(getOrderSummary);

  const { data, isPending } = useQuery({
    queryKey: ["invoice", orderNumber, phone],
    queryFn: () => fetchSummary({ data: { orderNumber, phone } }),
    enabled: Boolean(phone),
    retry: false,
  });

  if (!phone || (!isPending && !data)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold">ইনভয়েস পাওয়া যায়নি</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          অর্ডার নম্বরের সাথে সঠিক ফোন নম্বর দিলে ইনভয়েস দেখা যাবে।
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-sm border border-border px-5 py-2.5 text-sm font-semibold"
        >
          হোমে ফিরুন
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
          প্রিন্ট / PDF সেভ করুন
        </button>
      </div>

      <article className="rounded-sm border border-border bg-card p-8 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
          <div>
            <h1 className="text-2xl font-bold">{site.brand}</h1>
            {site.contact.address ? (
              <p className="mt-1 text-xs text-muted-foreground">{site.contact.address}</p>
            ) : null}
            {site.contact.phone ? (
              <p className="text-xs text-muted-foreground font-en">{site.contact.phone}</p>
            ) : null}
            {site.contact.email ? (
              <p className="text-xs text-muted-foreground font-en">{site.contact.email}</p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-sm font-bold uppercase tracking-wide">ইনভয়েস</p>
            <p className="mt-1 font-en text-sm font-bold text-primary">{data.orderNumber}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(data.createdAt).toLocaleString("bn-BD")}
            </p>
            <p className="text-xs text-muted-foreground">পেমেন্ট: ক্যাশ অন ডেলিভারি</p>
          </div>
        </header>

        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <h2 className="text-xs font-bold uppercase text-muted-foreground">গ্রাহক</h2>
            <p className="mt-1 text-sm font-semibold">{data.customerName}</p>
            <p className="text-sm font-en">{data.customerPhone}</p>
            <p className="text-sm">
              {data.addressLine}, {data.city}
            </p>
            {data.deliveryArea ? (
              <p className="text-sm text-muted-foreground">এলাকা: {data.deliveryArea}</p>
            ) : null}
          </div>
          <div className="sm:text-right">
            <h2 className="text-xs font-bold uppercase text-muted-foreground">স্ট্যাটাস</h2>
            <p className="mt-1 text-sm font-semibold">{data.status}</p>
          </div>
        </section>

        <table className="mt-6 w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-border text-left">
              <th className="py-2 font-semibold">পণ্য</th>
              <th className="py-2 text-center font-semibold">পরিমাণ</th>
              <th className="py-2 text-right font-semibold">দর</th>
              <th className="py-2 text-right font-semibold">মোট</th>
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
                </td>
                <td className="py-2 text-center tabular-nums">{item.quantity}</td>
                <td className="py-2 text-right tabular-nums">
                  {formatPrice("bn", item.unitPrice)}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {formatPrice("bn", item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">সাবটোটাল</dt>
              <dd className="tabular-nums">{formatPrice("bn", data.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">ডেলিভারি চার্জ</dt>
              <dd className="tabular-nums">{formatPrice("bn", data.deliveryCharge)}</dd>
            </div>
            {data.discount > 0 ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">ডিসকাউন্ট</dt>
                <dd className="tabular-nums">− {formatPrice("bn", data.discount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
              <dt>সর্বমোট</dt>
              <dd className="tabular-nums text-primary">{formatPrice("bn", data.total)}</dd>
            </div>
          </dl>
        </div>

        <footer className="mt-8 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          ধন্যবাদ, আবার আসবেন। এই ইনভয়েসটি কম্পিউটার জেনারেটেড, স্বাক্ষরের প্রয়োজন নেই।
        </footer>
      </article>
    </div>
  );
}
