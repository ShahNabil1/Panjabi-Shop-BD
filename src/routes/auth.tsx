import { Link, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logoMark from "@/assets/panjabishopbd-logo.png";
import { Turnstile, type TurnstileHandle } from "@/components/turnstile";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "স্টাফ লগইন — Panjabi Shop BD (panjabishopbd.com)" },
      {
        name: "description",
        content:
          "panjabishopbd.com-এর নিজস্ব স্টাফ/অ্যাডমিন লগইন পেইজ। শুধুমাত্র Panjabi Shop BD টিমের অনুমোদিত সদস্যদের জন্য।",
      },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "স্টাফ লগইন — Panjabi Shop BD" },
      {
        property: "og:description",
        content: "Panjabi Shop BD স্টোর ম্যানেজমেন্ট প্যানেলের অফিসিয়াল লগইন পেইজ।",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  // Public sign-up is not offered on this page — an open credential-creation form
  // on a store's admin login is what Safe Browsing flags as a deceptive login.
  // Team members can still register via /auth?signup=1.
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const signupAllowed = /(^|[?&])signup=1(&|$)/.test(searchStr ?? "");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileHandle | null>(null);

  async function signInWithGoogle() {
    setGoogleBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (err) {
      setGoogleBusy(false);
      toast.error(err instanceof Error ? err.message : "Google লগইন শুরু করা গেল না");
    }
  }

  useEffect(() => {
    if (!signupAllowed) setMode("signin");
  }, [signupAllowed]);

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/admin" });
  }, [loading, session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
          ...(captchaToken ? { options: { captchaToken } } : {}),
        });
        if (error) throw error;
        toast.success("সফলভাবে লগইন হয়েছে");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin`,
            data: { full_name: fullName },
            ...(captchaToken ? { captchaToken } : {}),
          },
        });
        if (error) throw error;
        toast.success("অ্যাকাউন্ট তৈরি হয়েছে");
      }
      await navigate({ to: "/admin" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "কিছু একটা সমস্যা হয়েছে");
      captchaRef.current?.reset();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Clear first-party branding: an unbranded credential prompt on a bare page
          is the pattern Google Safe Browsing reports as "possible phishing". */}
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2" aria-label="Panjabi Shop BD হোমপেইজ">
            <img src={logoMark} alt="Panjabi Shop BD" className="h-9 w-9 rounded-sm object-contain" />
            <span className="text-sm font-bold tracking-tight">Panjabi Shop BD</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
            ← হোমপেইজে ফিরুন
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-bold tracking-tight">
            {mode === "signin" ? "Panjabi Shop BD স্টাফ লগইন" : "নতুন স্টাফ অ্যাকাউন্ট"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            এটি <span className="font-en font-semibold">panjabishopbd.com</span>-এর নিজস্ব স্টোর
            ম্যানেজমেন্ট প্যানেল। শুধুমাত্র Panjabi Shop BD টিমের অনুমোদিত সদস্যরা এখানে সাইন ইন করবেন।
            কেনাকাটার জন্য লগইনের প্রয়োজন নেই।
          </p>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={googleBusy || busy}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.96-1.08 7.94-2.93l-3.88-3c-1.08.72-2.46 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.09A12 12 0 0 0 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.29 14.27a7.2 7.2 0 0 1 0-4.54V6.64H1.28a12 12 0 0 0 0 10.72l4.01-3.09Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.17 15.23 0 12 0A12 12 0 0 0 1.28 6.64l4.01 3.09C6.23 6.86 8.88 4.75 12 4.75Z"
              />
            </svg>
            {googleBusy ? "Google-এ নিয়ে যাওয়া হচ্ছে…" : "Google দিয়ে লগইন করুন"}
          </button>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              অথবা পাসওয়ার্ড দিয়ে
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" ? (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">নাম</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="email">কাজের ইমেইল</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">পাসওয়ার্ড</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                minLength={6}
                required
              />
            </div>
            <div className="flex justify-center">
              <Turnstile onToken={setCaptchaToken} handleRef={captchaRef} />
            </div>
            <Button type="submit" className="w-full" disabled={busy || !captchaToken}>
              {busy ? "অপেক্ষা করুন…" : mode === "signin" ? "লগইন" : "সাইন আপ"}
            </Button>
          </form>

          {signupAllowed ? (
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {mode === "signin" ? "নতুন স্টাফ অ্যাকাউন্ট তৈরি করুন" : "অ্যাকাউন্ট আছে? লগইন করুন"}
            </button>
          ) : (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              অ্যাকাউন্ট শুধুমাত্র Panjabi Shop BD অ্যাডমিন তৈরি করে দেন। সমস্যা হলে{" "}
              <Link to="/contact" className="underline underline-offset-4 hover:text-primary">
                যোগাযোগ করুন
              </Link>
              ।
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © Panjabi Shop BD · <span className="font-en">panjabishopbd.com</span> ·{" "}
          <Link to="/about" className="underline underline-offset-4 hover:text-primary">
            আমাদের সম্পর্কে
          </Link>{" "}
          ·{" "}
          <Link to="/contact" className="underline underline-offset-4 hover:text-primary">
            যোগাযোগ
          </Link>
        </p>
      </main>
    </div>
  );
}
