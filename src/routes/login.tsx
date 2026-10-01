import { createFileRoute, Navigate, useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useSessionWait } from "@/lib/use-session-wait";
import { Button, Field, Input } from "@/components/ui";
import { KeepLogo, Stamp } from "@/components/logo";
import { KeepLoader } from "@/components/keep-loader";
import { PhoneFrame, ScrollTopButton } from "@/components/shell";
import { ThemeIconButton } from "@/components/theme";

export const Route = createFileRoute("/login")({ component: Login });

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="currentColor"
        d="M21.6 12.23c0-.74-.06-1.27-.2-1.83H12v3.32h5.48c-.11.9-.71 2.26-2.05 3.18l-.02.1 2.98 2.26.2.02c1.9-1.72 3.01-4.25 3.01-7.05z"
      />
      <path
        fill="currentColor"
        d="M12 22c2.7 0 4.96-.87 6.62-2.38l-3.16-2.38c-.85.58-1.98 1-3.46 1-2.64 0-4.88-1.73-5.68-4.12l-.1.01-3.09 2.34-.04.09C4.74 19.98 8.09 22 12 22z"
        opacity="0.85"
      />
      <path
        fill="currentColor"
        d="M6.32 13.12A6.05 6.05 0 0 1 6 12c0-.39.07-.76.16-1.12l-.01-.1-3.13-2.38-.1.05A9.97 9.97 0 0 0 2 12c0 1.61.39 3.13 1.07 4.47l3.25-2.35z"
        opacity="0.7"
      />
      <path
        fill="currentColor"
        d="M12 5.76c1.88 0 3.15.8 3.87 1.46l2.83-2.7C16.95 2.89 14.7 2 12 2 8.09 2 4.74 4.02 3.07 7.53l3.24 2.35C7.12 7.49 9.36 5.76 12 5.76z"
        opacity="0.9"
      />
    </svg>
  );
}

function Login() {
  const { user, isPending, returning, message } = useSessionWait();
  if (isPending) {
    return (
      <PhoneFrame>
        <KeepLoader message={message} />
      </PhoneFrame>
    );
  }
  if (user) return <Navigate to="/" />;
  return <LoginForm returning={returning} />;
}

function LoginForm({ returning }: { returning: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const scrollRef = useRef<HTMLElement>(null);
  const google = GROK_PROVIDERS.find((p) => p.label === "Google");

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy("email");
    setError(null);
    try {
      if (mode === "signup") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0] || "You",
        });
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await authClient.signIn.email({
          email,
          password,
          rememberMe: true,
        });
        if (err) throw new Error(err.message);
      }
      await authClient.getSession();
      await router.invalidate();
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(null);
    }
  }

  async function onGoogle() {
    if (!google) return;
    setBusy("google");
    setError(null);
    try {
      await signIn(google.providerId, { callbackURL: "/", errorCallbackURL: "/login" });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sign-in failed. Allow pop-ups and try Google again, or use email.",
      );
      setBusy(null);
    }
  }

  return (
    <PhoneFrame>
      <div className="relative min-h-0 flex-1">
        <main
          ref={scrollRef}
          className="relative h-full overflow-y-auto px-6 pb-10 pt-12"
        >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <KeepLogo className="size-11" alt="" />
            <p className="font-display text-2xl font-medium">Keep</p>
          </div>
          <ThemeIconButton />
        </div>
        <h1 className="mt-8 font-display text-3xl font-medium tracking-tight keep-enter keep-delay-1">
          {returning ? "Welcome back." : "Welcome to Keep."}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted keep-enter keep-delay-2">
          {returning
            ? "Sign in once more if the last session dropped. After this, Keep stays open while you add expenses — no repeat logins."
            : "Crystal-clear money for your household. Sign in once with Google or email. We remember you, so adding expenses never asks again."}
        </p>
        <div className="mt-8 flex justify-center keep-enter keep-delay-2">
          <Stamp className="size-28" />
        </div>
        {authEnabled ? (
          <div className="mt-8 flex flex-col gap-2.5 keep-enter keep-delay-3">
            {google ? (
              <Button
                type="button"
                variant="primary"
                disabled={busy !== null}
                onClick={() => void onGoogle()}
              >
                <GoogleMark />
                {busy === "google" ? "Continuing with Google…" : "Continue with Google"}
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="mt-8 text-sm text-muted">Sign-in is disabled.</p>
        )}
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <div className="mt-8 flex items-center gap-3 text-[11px] uppercase tracking-widest text-faint">
          <span className="h-px flex-1 bg-line" />
          or email
          <span className="h-px flex-1 bg-line" />
        </div>
        <form className="mt-4 flex flex-col gap-3 keep-enter keep-delay-4" onSubmit={(e) => void onEmail(e)}>
          {mode === "signup" ? (
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </Field>
          ) : null}
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </Field>
          <Button type="submit" variant="night" disabled={busy !== null}>
            {busy === "email" ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in with email"}
          </Button>
        </form>
        <button
          type="button"
          className="mt-4 text-sm text-muted"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an email login"}
        </button>
        </main>
        <ScrollTopButton scrollRef={scrollRef} />
      </div>
    </PhoneFrame>
  );
}
