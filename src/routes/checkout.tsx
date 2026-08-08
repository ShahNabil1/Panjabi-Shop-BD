import { Link, createFileRoute } from "@tanstack/react-router";

import { useCart } from "@/lib/cart-context";
import { useLang } from "@/lib/language-context";
import { tr } from "@/lib/i18n";
import { getDeliveryRates } from "@/lib/order.functions";
import { CheckoutForm } from "@/components/site/checkout-form";
import { Section } from "@/components/site/ui";

export const Route = createFileRoute("/checkout")({
  loader: async () => ({ rates: await getDeliveryRates() }),
  component: CheckoutPage,
  head: () => ({
    meta: [
      { title: "চেকআউট | উপহারকাব্য" },
      {
        name: "description",
        content: "ক্যাশ অন ডেলিভারিতে অর্ডার সম্পন্ন করুন — কোনো অগ্রিম পেমেন্ট লাগবে না।",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "চেকআউট | উপহারকাব্য" },
      { property: "og:description", content: "ক্যাশ অন ডেলিভারিতে অর্ডার সম্পন্ন করুন।" },
      { property: "og:url", content: "https://upoharkabbo.lovable.app/checkout" },
    ],
    links: [{ rel: "canonical", href: "https://upoharkabbo.lovable.app/checkout" }],
  }),
});

function CheckoutPage() {
  const { rates } = Route.useLoaderData();
  const { lang } = useLang();
  const { items, ready, setQuantity, remove } = useCart();

  return (
    <Section
      title="Checkout"
      centerTitle
      titleClassName="bg-gradient-to-r from-primary via-primary to-pink-500 bg-clip-text text-transparent drop-shadow-sm"
    >
      {!ready ? (
        <div className="h-64 animate-pulse rounded-sm bg-secondary" />
      ) : items.length === 0 ? (
        <div className="rounded-sm border border-border bg-card p-10 text-center">
          <p className="text-muted-foreground">{tr(lang, "emptyCart")}</p>
          <Link
            to="/"
            className="mt-5 inline-block rounded-sm bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {tr(lang, "continueShopping")}
          </Link>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl">
          <div className="mb-5 text-center">
            <h2 className="inline-flex items-center gap-2 text-base font-bold text-primary">
              <span className="inline-block h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
              Delivery Information
            </h2>
            <div className="mx-auto mt-2 h-0.5 w-12 rounded-full bg-gradient-to-r from-primary to-pink-400" />
          </div>
          <CheckoutForm
            items={items}
            rates={rates}
            source="website"
            onSetQuantity={setQuantity}
            onRemove={remove}
            allowAddMore
          />
        </div>
      )}
    </Section>
  );
}
