import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { hasSignedInBefore, markSignedInBefore, sessionWaitMessage } from "@/lib/keep-cache";

const SESSION_WAIT_MS = 8000;
const RETURNING_WAIT_MS = 20000;

/**
 * Session plus a timeout so a hung get-session cannot trap the visitor on a loader.
 * Stays pending until after mount so SSR and the first client paint are the same
 * loader (avoids a hydration mismatch when the server thinks the visitor is
 * signed-out and the client is still resolving).
 */
export function useSessionWait(timeoutMs?: number) {
  const { user, isPending } = useCurrentUserState();
  const [hydrated, setHydrated] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [returning] = useState(() => hasSignedInBefore());
  const wait = timeoutMs ?? (returning ? RETURNING_WAIT_MS : SESSION_WAIT_MS);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (user) markSignedInBefore();
  }, [user]);

  useEffect(() => {
    if (!hydrated || !isPending) {
      setTimedOut(false);
      return;
    }
    const t = window.setTimeout(() => setTimedOut(true), wait);
    return () => window.clearTimeout(t);
  }, [hydrated, isPending, wait]);

  return {
    user,
    isPending: !hydrated || (isPending && !timedOut),
    timedOut: hydrated && isPending && timedOut,
    returning,
    message: sessionWaitMessage(),
  };
}
