import { Link, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { notificationAction, type AppNotification } from "@/lib/keep";
import { dismissNotification, markNotificationRead } from "@/lib/server/keep";
import { keepQueryKey } from "@/lib/use-keep";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

export function AlertItem({
  n,
  onHidden,
}: {
  n: AppNotification;
  onHidden?: (id: number) => void;
}) {
  const action = notificationAction(n);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const qc = useQueryClient();
  const { user } = useCurrentUserState();
  const [busy, setBusy] = useState<"read" | "close" | null>(null);
  const danger = n.kind.includes("overspend") || n.kind === "household_overspend";
  const warn = n.kind.includes("warning") || n.kind === "household_warning";

  function scrollIfNeeded() {
    if (!action.hash) return;
    if (pathname !== action.to) return;
    window.requestAnimationFrame(() => {
      document.getElementById(action.hash!)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function onRead() {
    setBusy("read");
    scrollIfNeeded();
    try {
      if (n.id > 0) await markNotificationRead({ data: { id: n.id } });
      qc.setQueryData(keepQueryKey(user?.id), (old: { notifications?: AppNotification[] } | undefined) => {
        if (!old?.notifications) return old;
        return {
          ...old,
          notifications: old.notifications.map((row) => (row.id === n.id ? { ...row, read: true } : row)),
        };
      });
    } finally {
      setBusy(null);
    }
  }

  async function onClose() {
    setBusy("close");
    onHidden?.(n.id);
    try {
      if (n.id > 0) await dismissNotification({ data: { id: n.id } });
      qc.setQueryData(keepQueryKey(user?.id), (old: { notifications?: AppNotification[] } | undefined) => {
        if (!old?.notifications) return old;
        return { ...old, notifications: old.notifications.filter((row) => row.id !== n.id) };
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="rounded-xl bg-cream px-4 py-3 shadow-soft">
      <p
        className={cn(
          "text-[11px] uppercase tracking-wider",
          danger && "text-danger",
          warn && "text-terra",
          !danger && !warn && "text-muted",
        )}
      >
        {danger ? "Act now" : warn ? "This week" : n.kind === "report" ? "Month close" : "Alert"}
      </p>
      <p className="mt-0.5 text-sm font-medium">{n.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{n.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          to={action.to}
          hash={action.hash}
          onClick={() => void onRead()}
          className="inline-flex min-h-11 items-center rounded-pill bg-ink px-4 text-sm text-cream"
        >
          {busy === "read" ? "Opening…" : action.label}
        </Link>
        <button
          type="button"
          className="keep-press inline-flex min-h-11 items-center rounded-pill bg-paper-2 px-4 text-sm text-ink"
          disabled={busy !== null}
          onClick={() => void onClose()}
        >
          {busy === "close" ? "Closing…" : "Close"}
        </button>
      </div>
    </li>
  );
}
