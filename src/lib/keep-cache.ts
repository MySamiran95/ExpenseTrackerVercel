import type { DashboardPayload } from "@/lib/keep";

const PREFIX = "keep.dash.v2";
const SCOPE_PREFIX = "keep.scope.v1";
const WELCOME_KEY = "keep.welcome.v1";
const AUTH_SEEN_KEY = "keep.auth.seen.v1";

function keyFor(userId: string, scope: string) {
  return `${PREFIX}:${userId}:${scope}`;
}

function scopeKey(userId: string) {
  return `${SCOPE_PREFIX}:${userId}`;
}

export function readKeepCache(userId: string | undefined, month: string): DashboardPayload | undefined {
  if (!userId || typeof window === "undefined") return undefined;
  try {
    const scope = localStorage.getItem(scopeKey(userId)) ?? "personal";
    const raw = localStorage.getItem(keyFor(userId, scope)) ?? localStorage.getItem(`keep.dash.v1:${userId}:${month}`);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as DashboardPayload;
    if (!parsed || typeof parsed !== "object" || !parsed.profile) return undefined;
    if (parsed.profile.theme !== "dark") parsed.profile.theme = "light";
    if (!parsed.profile.backupCadence) parsed.profile.backupCadence = "weekly";
    if (parsed.profile.lastBackupAt === undefined) parsed.profile.lastBackupAt = null;
    if (!parsed.profile.insightCadence) parsed.profile.insightCadence = "weekly";
    if (!parsed.scope) parsed.scope = parsed.household?.kind === "family" ? "family" : "personal";
    if (parsed.hasFamily == null) parsed.hasFamily = parsed.household?.kind === "family";
    if (!parsed.trips) parsed.trips = [];
    for (const t of parsed.trips) {
      if (t.budgetLimit == null) t.budgetLimit = 0;
    }
    if (!parsed.joinRequests) parsed.joinRequests = [];
    if (parsed.household && !parsed.household.kind) {
      parsed.household.kind = parsed.scope === "personal" ? "personal" : "family";
    }
    for (const e of parsed.expenses ?? []) {
      if (e.tripId === undefined) e.tripId = null;
      if (e.tripName === undefined) e.tripName = null;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

export function writeKeepCache(userId: string | undefined, payload: DashboardPayload) {
  if (!userId || typeof window === "undefined") return;
  try {
    localStorage.setItem(scopeKey(userId), payload.scope);
    localStorage.setItem(keyFor(userId, payload.scope), JSON.stringify(payload));
  } catch {
    // quota / private mode — ignore
  }
}

export function welcomeSeen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(WELCOME_KEY) === "1";
  } catch {
    return false;
  }
}

export function markWelcomeSeen() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WELCOME_KEY, "1");
  } catch {
    // ignore
  }
}

export function hasSignedInBefore(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(AUTH_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markSignedInBefore() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTH_SEEN_KEY, "1");
  } catch {
    // ignore
  }
}

export function sessionWaitMessage(): string {
  return hasSignedInBefore() ? "Restoring your session…" : "Welcome to Keep. Getting things ready…";
}
