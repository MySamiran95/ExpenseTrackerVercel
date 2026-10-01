import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { GROK_PROVIDERS, signIn } from "@/lib/auth/client";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { HouseholdSetup } from "@/components/onboarding";
import { KeepLoader } from "@/components/keep-loader";
import { BottomNav, PhoneFrame, ScrollTopButton } from "@/components/shell";
import { useTheme } from "@/components/theme";
import { Button } from "@/components/ui";
import { useKeep } from "@/lib/use-keep";
import { useSessionWait } from "@/lib/use-session-wait";

function LoadingFrame({ message }: { message?: string }) {
  return (
    <PhoneFrame>
      <KeepLoader message={message} />
    </PhoneFrame>
  );
}

function isUnauthorized(err: unknown) {
  if (!err) return false;
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("Unauthorized") || message.includes("401");
}

export function AppGate({
  children,
  nav = true,
}: {
  children: ReactNode;
  nav?: boolean;
}) {
  const { user, isPending, timedOut, message } = useSessionWait();
  const dash = useKeep();
  const qc = useQueryClient();
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const { hydrateFromAccount } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const theme = dash.data?.profile.theme;
    if (theme) hydrateFromAccount(theme);
  }, [dash.data?.profile.theme, hydrateFromAccount]);

  if (isPending) return <LoadingFrame message={message} />;

  if (!user) {
    if (timedOut) {
      const google = GROK_PROVIDERS.find((p) => p.label === "Google");
      return (
        <PhoneFrame>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center keep-enter">
            <p className="font-display text-xl font-medium">Keep</p>
            <p className="max-w-xs text-sm leading-relaxed text-muted">
              Sign-in was taking too long. Continue with Google or email — once you are in, Keep stays signed in while you add expenses.
            </p>
            {google ? (
              <Button
                className="w-full max-w-xs"
                disabled={googleBusy}
                onClick={() => {
                  setGoogleBusy(true);
                  setGoogleError(null);
                  void signIn(google.providerId, { callbackURL: "/", errorCallbackURL: "/login" }).catch(
                    (err) => {
                      setGoogleError(err instanceof Error ? err.message : "Google sign-in failed");
                      setGoogleBusy(false);
                    },
                  );
                }}
              >
                {googleBusy ? "Continuing with Google…" : "Continue with Google"}
              </Button>
            ) : null}
            {googleError ? <p className="max-w-xs text-sm text-danger">{googleError}</p> : null}
            <Link to="/login" className="text-sm text-muted underline underline-offset-4">
              Use email instead
            </Link>
          </div>
        </PhoneFrame>
      );
    }
    return <RedirectToSignIn />;
  }

  if (dash.isPending && !dash.data) return <LoadingFrame />;

  if (dash.error && !dash.data) {
    if (isUnauthorized(dash.error)) return <RedirectToSignIn />;
    return (
      <PhoneFrame>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center keep-enter">
          <p className="font-display text-xl font-medium">Keep</p>
          <p className="max-w-xs text-sm leading-relaxed text-muted">
            Could not load your ledger. Check your connection and try again.
          </p>
          <Button
            onClick={() => {
              void dash.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      </PhoneFrame>
    );
  }

  const payload = dash.data;
  if (payload && !payload.household) {
    return (
      <PhoneFrame>
        <HouseholdSetup userId={user.id} queryClient={qc} />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto overflow-x-hidden keep-page keep-page-scroll"
          >
            {children}
          </div>
          <ScrollTopButton scrollRef={scrollRef} />
        </div>
        {nav ? <BottomNav /> : null}
      </div>
    </PhoneFrame>
  );
}
