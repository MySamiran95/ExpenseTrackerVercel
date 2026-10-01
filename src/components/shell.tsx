import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  ChartSpline,
  ChevronUp,
  Home,
  Plus,
  Receipt,
  Users,
} from "lucide-react";
import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUser, useCurrentUserState } from "@/lib/auth/use-current-user";
import { setLedgerScope } from "@/lib/server/keep";
import { applyDashboard } from "@/lib/use-keep";
import type { AppNotification, DashboardPayload } from "@/lib/keep";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/expenses", label: "Spend", icon: Receipt },
  { to: "/add", label: "Add", icon: Plus, primary: true },
  { to: "/insights", label: "Trends", icon: ChartSpline },
  { to: "/family", label: "Family", icon: Users },
] as const;

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="keep-phone-shell h-dvh overflow-hidden bg-canvas lg:flex lg:items-center lg:justify-center lg:px-4 lg:py-8">
      <div className="keep-phone-inner relative mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden bg-paper shadow-card lg:h-[min(900px,calc(100dvh-4rem))] lg:min-h-[min(844px,100dvh)] lg:rounded-phone">
        <div className="keep-status-bar" aria-hidden />
        {children}
      </div>
    </div>
  );
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="z-20 shrink-0 border-t border-line/80 bg-cream/95 px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <ul className="flex items-end justify-between">
        {NAV.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          if ("primary" in item && item.primary) {
            return (
              <li key={item.to} className="-mt-5">
                <Link
                  to={item.to}
                  className="keep-nav-pop keep-press grid size-14 place-items-center rounded-full bg-ink text-cream shadow-card"
                  aria-label="Add"
                >
                  <Icon className="size-6" strokeWidth={1.8} />
                </Link>
              </li>
            );
          }
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                className={cn(
                  "keep-press flex min-h-11 flex-col items-center justify-center gap-0.5 text-[11px]",
                  active ? "text-ink" : "text-muted",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2 : 1.6} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function TopAvatar({ to = "/settings" }: { to?: string }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) {
    return <div className="size-9 animate-pulse rounded-full bg-night-3" />;
  }
  const name = user?.displayName ?? user?.primaryEmail ?? "You";
  return (
    <Link
      to={to}
      className="keep-press block size-9 overflow-hidden rounded-full bg-night-3 outline outline-1 -outline-offset-1 outline-white/10"
    >
      {user?.profileImageUrl ? (
        <img src={user.profileImageUrl} alt="" className="size-full object-cover" />
      ) : (
        <span className="grid size-full place-items-center text-sm font-medium text-on-night">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </Link>
  );
}

export function BellLink({
  notifications,
  night,
}: {
  notifications: AppNotification[];
  night?: boolean;
}) {
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <Link
      to="/reports"
      className={cn(
        "relative grid size-10 place-items-center rounded-full",
        night ? "bg-night-3 text-on-night" : "bg-cream text-ink shadow-soft",
        unread > 0 && "keep-alert-live",
      )}
      aria-label={unread > 0 ? `${unread} new alerts` : "Notifications and reports"}
    >
      {unread > 0 ? (
        <>
          <span className="keep-alert-ripple" aria-hidden />
          <span className="keep-alert-ripple keep-alert-ripple-2" aria-hidden />
        </>
      ) : null}
      <Bell className={cn("relative z-10 size-4", unread > 0 && "keep-alert-bell")} strokeWidth={1.8} />
      {unread > 0 ? (
        <span className="keep-alert-dot absolute right-1 top-1 z-10 grid min-w-4 place-items-center rounded-full bg-terra px-1 text-[9px] font-medium leading-4 text-cream">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

export function ScopeSwitch({ data }: { data: DashboardPayload }) {
  const qc = useQueryClient();
  const { user } = useCurrentUserState();
  const family = data.scope === "family";

  async function switchScope(scope: "personal" | "family") {
    if (scope === data.scope) return;
    if (scope === "family" && !data.hasFamily) return;
    const payload = await setLedgerScope({ data: { scope } });
    applyDashboard(qc, user?.id, payload);
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-paper-2 p-1">
        <button
          type="button"
          className={cn(
            "keep-press h-10 rounded-md text-sm font-medium",
            data.scope === "personal" ? "bg-cream text-ink shadow-soft" : "text-muted",
          )}
          onClick={() => void switchScope("personal")}
        >
          Personal
        </button>
        <button
          type="button"
          className={cn(
            "keep-press h-10 rounded-md text-sm font-medium",
            family ? "bg-cream text-ink shadow-soft" : "text-muted",
            !data.hasFamily && "opacity-50",
          )}
          onClick={() => {
            if (data.hasFamily) void switchScope("family");
          }}
        >
          Family
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        {data.hasFamily
          ? family
            ? `${data.household?.name ?? "Family"} · shared spend, trends, and reports. Personal stays on the other tab.`
            : "Only your personal ledger. Family spend, insights, and reports live on Family."
          : "Personal ledger · only you see this. Start a household on Family to share."}
      </p>
    </div>
  );
}

export function useViewerName() {
  const user = useCurrentUser();
  return user?.displayName ?? user?.primaryEmail ?? "You";
}

export function ScrollTopButton({
  scrollRef,
}: {
  scrollRef: RefObject<HTMLElement | null>;
}) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setOn(el.scrollTop > 160);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrollRef]);

  if (!on) return null;

  return (
    <button
      type="button"
      aria-label="Back to top"
      className="keep-press absolute bottom-3 right-3 z-20 grid size-9 place-items-center rounded-full bg-ink/90 text-cream shadow-card backdrop-blur-sm"
      onClick={() => {
        scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }}
    >
      <ChevronUp className="size-4" strokeWidth={2.2} />
    </button>
  );
}
