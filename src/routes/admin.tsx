import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth-context";
import { checkIsAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "অ্যাডমিন ড্যাশবোর্ড" },
      { name: "description", content: "স্টোরের প্রোডাক্ট, অর্ডার ও কনটেন্ট ম্যানেজমেন্ট।" },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "অ্যাডমিন ড্যাশবোর্ড" },
      { property: "og:description", content: "স্টোর ম্যানেজমেন্ট প্যানেল।" },
    ],
  }),
  component: AdminLayout,
});

const nav = [
  { to: "/admin", label: "ওভারভিউ", exact: true },
  { to: "/admin/orders", label: "অর্ডার" },
  { to: "/admin/products", label: "প্রোডাক্ট" },
  { to: "/admin/taxonomy", label: "ক্যাটাগরি" },
  { to: "/admin/promotions", label: "প্রমোশন" },
  { to: "/admin/landing", label: "ল্যান্ডিং পেইজ" },
  { to: "/admin/faqs", label: "FAQ" },
  { to: "/admin/settings", label: "সেটিংস" },
] satisfies Array<{ to: string; label: string; exact?: boolean }>;

function AdminLayout() {
  const { session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  const isAdmin = useQuery({
    queryKey: ["is-admin", session?.user.id ?? null],
    queryFn: () => checkIsAdmin(),
    enabled: Boolean(session),
  });

  if (loading || !session || isAdmin.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        লোড হচ্ছে…
      </div>
    );
  }

  if (isAdmin.data === false) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-xl font-bold">অ্যাক্সেস নেই</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          এই অ্যাকাউন্টে অ্যাডমিন রোল দেওয়া নেই। ডাটাবেসে <code>user_roles</code> টেবিলে
          অ্যাডমিন রোল যোগ করার পরে আবার চেষ্টা করুন।
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={() => void signOut()}>
            লগআউট
          </Button>
          <Button asChild>
            <Link to="/">হোমে ফিরুন</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/admin" className="text-sm font-bold tracking-tight">
            স্টোর অ্যাডমিন
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">সাইট দেখুন</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              লগআউট
            </Button>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl overflow-x-auto px-4 pb-2">
          <ul className="flex min-w-max gap-1">
            {nav.map((item) => {
              const active = item.exact
                ? pathname === item.to
                : pathname.startsWith(item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to as "/admin"}
                    className={cn(
                      "inline-flex rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
