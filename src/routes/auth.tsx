import { Link, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { validateAuthFields } from "@/lib/auth-validation";

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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<"email" | "password" | "fullName", string>>>(
    {},
  );
  const [formError, setFormError] = useState("");
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
    setErrors({});
    setFormError("");
  }, [signupAllowed]);

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/admin" });
  }, [loading, session, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || googleBusy) return;
    const nextErrors = validateAuthFields({ email, password, fullName }, mode === "signup");
    setErrors(nextErrors);
    setFormError("");
    const firstInvalid = (["fullName", "email", "password"] as const).find(
      (field) => nextErrors[field],
    );
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }
    if (!captchaToken) return;
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
          ...(captchaToken ? { options: { captchaToken } } : {}),
        });
        if (error) throw error;
        toast.success("সফলভাবে লগইন হয়েছে");
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
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
      const message = err instanceof Error ? err.message : "Unable to sign in. Please try again.";
      setFormError(message);
      toast.error(message);
      captchaRef.current?.reset();
    } finally {
      setBusy(false);
    }
  }

  function fieldFeedback(field: "email" | "password" | "fullName") {
    const message = errors[field];
    return (
      <div
        id={`${field}-error`}
        aria-live="polite"
        className={cn(
          "grid motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-200",
          message ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          {message ? (
            <p className="flex items-start gap-1.5 pt-2 text-xs text-destructive">
              <AlertCircle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              {message}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  function updateField(field: "email" | "password" | "fullName", value: string) {
    if (field === "email") setEmail(value);
    else if (field === "password") setPassword(value);
    else setFullName(value);
    setFormError("");
    if (errors[field])
      setErrors((current) => ({
        ...current,
        [field]: validateAuthFields(
          { email, password, fullName, [field]: value },
          mode === "signup",
        )[field],
      }));
  }

  function validateField(field: "email" | "password" | "fullName") {
    setErrors((current) => ({
      ...current,
      [field]: validateAuthFields({ email, password, fullName }, mode === "signup")[field],
    }));
  }

  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <section className="relative hidden min-h-svh flex-col overflow-hidden bg-secondary px-10 py-9 text-secondary-foreground lg:flex xl:px-14">
        <Link to="/" className="flex w-fit items-center gap-3" aria-label="Panjabi Shop BD home">
          <img src={logoMark} alt="" className="size-11 rounded-md bg-background object-contain" />
          <span className="font-en text-xl font-bold">Panjabi Shop BD</span>
        </Link>
        <div className="my-auto max-w-lg py-16">
          <div className="mb-8 flex size-14 items-center justify-center rounded-lg border border-secondary-foreground/20 text-primary">
            <ShieldCheck className="size-7" aria-hidden="true" />
          </div>
          <p className="font-en text-xs font-semibold text-primary">PRIVATE WORKSPACE</p>
          <h1 className="mt-5 font-en text-5xl font-bold leading-[1.15]">Panjabi Shop BD</h1>
          <p className="mt-5 max-w-sm font-en text-lg leading-8 text-secondary-foreground/80">
            Your store. Your team.
            <br />
            Everything in one place.
          </p>
        </div>
        <div className="flex items-center gap-3 border-t border-secondary-foreground/20 pt-6 font-en text-xs text-secondary-foreground/80">
          <LockKeyhole className="size-4 text-primary" aria-hidden="true" />
          Authorized team members only
        </div>
      </section>

      <section className="flex min-h-svh min-w-0 flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <Link
            to="/"
            className="flex items-center gap-2 lg:hidden"
            aria-label="Panjabi Shop BD home"
          >
            <img src={logoMark} alt="" className="size-9 rounded-md object-contain" />
            <span className="font-en text-sm font-bold">Panjabi Shop BD</span>
          </Link>
          <Button asChild variant="ghost" className="h-11 px-2 text-muted-foreground">
            <Link to="/">
              <ArrowLeft aria-hidden="true" />
              <span className="font-en">Back to store</span>
            </Link>
          </Button>
        </div>
        <div className="mx-auto my-auto w-full max-w-md py-9 sm:py-12">
          <div className="mb-7">
            <img
              src={logoMark}
              alt="Panjabi Shop BD"
              className="mb-6 hidden size-12 rounded-md object-contain lg:block"
            />
            <p className="font-en text-xs font-semibold text-primary-dark">STAFF ACCESS</p>
            <h2 className="mt-3 font-en text-3xl font-bold leading-tight sm:text-4xl">
              {mode === "signin" ? "Welcome back" : "Create staff account"}
            </h2>
            <p className="mt-3 font-en text-sm leading-6 text-muted-foreground">
              {mode === "signin"
                ? "Sign in to your Panjabi Shop BD workspace."
                : "Set up your Panjabi Shop BD staff account."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={signInWithGoogle}
            disabled={googleBusy || busy}
            loading={googleBusy}
            className="h-12 w-full gap-3 rounded-lg font-en hover:border-primary/50 hover:bg-accent/50"
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
            {googleBusy ? "Connecting to Google…" : "Continue with Google"}
          </Button>
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="font-en text-xs text-muted-foreground">or continue with email</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <form onSubmit={submit} noValidate className="space-y-4">
            {mode === "signup" ? (
              <div>
                <Label htmlFor="fullName" className="font-en">
                  Full name
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  onBlur={() => validateField("fullName")}
                  autoComplete="name"
                  maxLength={100}
                  required
                  disabled={busy || googleBusy}
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby="fullName-error"
                  className={cn("mt-2 h-12", errors.fullName && "border-destructive")}
                />
                {fieldFeedback("fullName")}
              </div>
            ) : null}
            <div>
              <Label htmlFor="email" className="font-en">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => updateField("email", e.target.value)}
                onBlur={() => validateField("email")}
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="you@example.com"
                maxLength={254}
                required
                disabled={busy || googleBusy}
                aria-invalid={Boolean(errors.email)}
                aria-describedby="email-error"
                className={cn("mt-2 h-12 font-en", errors.email && "border-destructive")}
              />
              {fieldFeedback("email")}
            </div>
            <div>
              <Label htmlFor="password" className="font-en">
                Password
              </Label>
              <div className="relative mt-2">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => updateField("password", e.target.value)}
                  onKeyDown={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                  onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                  onBlur={() => {
                    setCapsLock(false);
                    validateField("password");
                  }}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  placeholder="Enter your password"
                  minLength={6}
                  required
                  disabled={busy || googleBusy}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby="password-error password-caps"
                  className={cn("h-12 pr-14 font-en", errors.password && "border-destructive")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 size-11 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={busy || googleBusy}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </Button>
              </div>
              {fieldFeedback("password")}
              <p
                id="password-caps"
                aria-live="polite"
                className="font-en text-xs text-muted-foreground"
              >
                {capsLock ? "Caps Lock is on — check your typing." : ""}
              </p>
            </div>
            {formError ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{formError}</span>
              </div>
            ) : null}
            <div className="flex min-h-[65px] justify-center">
              <Turnstile onToken={setCaptchaToken} handleRef={captchaRef} />
            </div>
            <Button
              type="submit"
              loading={busy}
              disabled={busy || googleBusy || !captchaToken}
              className="h-12 w-full rounded-lg font-en font-semibold"
            >
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
              {!busy ? <ArrowRight aria-hidden="true" /> : null}
            </Button>
          </form>
          {signupAllowed ? (
            <Button
              type="button"
              variant="link"
              disabled={busy || googleBusy}
              className="mt-4 h-auto min-h-11 w-full whitespace-normal text-primary-dark"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setErrors({});
                setFormError("");
              }}
            >
              {mode === "signin" ? "Create a staff account" : "Already have an account? Sign in"}
            </Button>
          ) : (
            <div className="mt-7 flex items-start justify-center gap-2 font-en text-xs leading-5 text-muted-foreground">
              <KeyRound aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              <p>
                Access is managed by your administrator.{" "}
                <Link
                  to="/contact"
                  className="underline underline-offset-4 hover:text-primary-dark"
                >
                  Contact support
                </Link>
              </p>
            </div>
          )}
        </div>
        <footer className="mx-auto flex w-full max-w-md flex-wrap items-center justify-center gap-x-4 gap-y-1 font-en text-xs text-muted-foreground">
          <span>© Panjabi Shop BD</span>
          <Link to="/about" className="flex min-h-11 items-center hover:text-primary-dark">
            About us
          </Link>
          <Link to="/contact" className="flex min-h-11 items-center hover:text-primary-dark">
            Contact
          </Link>
        </footer>
      </section>
    </main>
  );
}
