import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImageOff, Pencil, Plus, Trash2 } from "lucide-react";

import { adminDeleteProduct, adminListProducts } from "@/lib/admin.functions";
import { AdminHeading, EmptyState, Panel } from "@/components/admin/kit";
import { BrandLoader } from "@/components/admin/brand-loader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
      toast.success("Product deleted");
      await qc.invalidateQueries({ queryKey: ["admin", "products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <AdminHeading
        title="Products"
        description="Add products, update images and variants."
        action={
          <Button asChild size="sm" className="ig-gradient rounded-xl transition-transform duration-300 hover:scale-[1.03]">
            <Link to="/admin/products/$id" params={{ id: "new" }}>
              <Plus className="mr-1.5 size-4" /> New product
            </Link>
          </Button>
        }
      />

      <Panel className="p-0">
        {isLoading ? (
          <BrandLoader size="md" className="py-8" />
        ) : (data?.length ?? 0) === 0 ? (
          <div className="p-4">
            <EmptyState title="No products yet" hint="Click the New product button above to get started." />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data?.map((p, idx) => {
              const image = [...(p.product_images ?? [])].sort(
                (a, b) => a.sort_order - b.sort_order,
              )[0];
              return (
                <li
                  key={p.id}
                  className="admin-rise group flex items-center gap-3 px-4 py-3 transition-all duration-300 hover:-translate-y-0.5 hover:bg-muted/40"
                  style={{ animationDelay: `${Math.min(idx, 8) * 40}ms` }}
                >
                  <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-muted transition-transform duration-300 group-hover:scale-105">
                    {image ? (
                      <img
                        src={image.url}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <ImageOff className="size-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.name_bn}</p>
                    <p className="mt-0.5 flex items-center gap-2 truncate text-xs text-muted-foreground">
                      <span>/{p.slug}</span>
                      <span aria-hidden>·</span>
                      <span>Stock {p.stock}</span>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                          p.is_active
                            ? "bg-emerald-100 text-emerald-900 ring-emerald-200"
                            : "bg-stone-200 text-stone-800 ring-stone-300",
                        )}
                      >
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </p>
                  </div>
                  <span className="ig-text text-sm font-bold tabular-nums">
                    {formatPrice("bn", p.price)}
                  </span>
                  <div className="flex gap-1">
                    <Button asChild size="sm" variant="outline" className="rounded-xl">
                      <Link to="/admin/products/$id" params={{ id: p.id }}>
                        <Pencil className="mr-1.5 size-3.5" /> Edit
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-xl text-muted-foreground hover:text-destructive"
                      loading={remove.isPending}
                      onClick={() => {
                        if (confirm("Delete this product?")) remove.mutate(p.id);
                      }}
                    >
                      <Trash2 className="size-4" />
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
