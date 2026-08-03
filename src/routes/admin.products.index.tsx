import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { adminDeleteProduct, adminListProducts } from "@/lib/admin.functions";
import { AdminHeading, EmptyState, Panel } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/i18n";

export const Route = createFileRoute("/admin/products/")({
  component: AdminProductsPage,
});

function AdminProductsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => adminListProducts(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteProduct({ data: { id } }),
    onSuccess: async () => {
      toast.success("প্রোডাক্ট মুছে ফেলা হয়েছে");
      await qc.invalidateQueries({ queryKey: ["admin", "products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <AdminHeading
        title="প্রোডাক্ট"
        description="প্রোডাক্ট যোগ করুন, ছবি ও ভ্যারিয়েন্ট আপডেট করুন।"
        action={
          <Button asChild size="sm">
            <Link to="/admin/products/$id" params={{ id: "new" }}>
              নতুন প্রোডাক্ট
            </Link>
          </Button>
        }
      />

      <Panel className="p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">লোড হচ্ছে…</p>
        ) : (data?.length ?? 0) === 0 ? (
          <div className="p-4">
            <EmptyState title="কোনো প্রোডাক্ট নেই" hint="উপরে নতুন প্রোডাক্ট বাটনে ক্লিক করুন।" />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data?.map((p) => {
              const image = [...(p.product_images ?? [])].sort(
                (a, b) => a.sort_order - b.sort_order,
              )[0];
              return (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {image ? (
                      <img
                        src={image.url}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name_bn}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      /{p.slug} · স্টক {p.stock} · {p.is_active ? "অ্যাক্টিভ" : "ইনঅ্যাক্টিভ"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatPrice("bn", p.price)}
                  </span>
                  <div className="flex gap-1">
                    <Button asChild size="sm" variant="outline">
                      <Link to="/admin/products/$id" params={{ id: p.id }}>
                        এডিট
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (confirm("এই প্রোডাক্টটি মুছে ফেলবেন?")) remove.mutate(p.id);
                      }}
                    >
                      মুছুন
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
