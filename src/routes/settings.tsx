import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { UserButton } from "@/lib/auth/gates";
import { AppGate } from "@/components/app-gate";
import { ThemeSwitch } from "@/components/theme";
import { Button, Field, Input } from "@/components/ui";
import { monthKey, type BackupCadence, type InsightCadence, INSIGHT_CADENCE_OPTIONS } from "@/lib/keep";
import {
  clearSampleData,
  exportBackup,
  exportCsv,
  saveBackupCadence,
  saveDisplayName,
  saveInsightCadence,
  syncGoogleCalendar,
  type CalendarHint,
} from "@/lib/server/keep";
import { applyDashboard, useKeep } from "@/lib/use-keep";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { redirectToLoginIfRequired } from "@/lib/app-data";

export const Route = createFileRoute("/settings")({ component: Page });

function Page() {
  return (
    <AppGate nav={false}>
      <Body />
    </AppGate>
  );
}

function Body() {
  const { data } = useKeep();
  const qc = useQueryClient();
  const { user } = useCurrentUserState();
  const [events, setEvents] = useState<CalendarHint[] | null>(null);
  const [googleMsg, setGoogleMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [displayName, setDisplayName] = useState(data?.profile.displayName ?? "");
  const [cadence, setCadence] = useState<BackupCadence>(data?.profile.backupCadence ?? "weekly");

  if (!data?.household) return null;
  const hasSample = data.expenses.some((e) => e.isSample) || data.investments.some((i) => i.isSample);
  const insightCadence = data.profile.insightCadence;

  async function setInsight(next: InsightCadence) {
    const payload = await saveInsightCadence({ data: { cadence: next } });
    applyDashboard(qc, user?.id, payload);
    toast(next === "off" ? "Behaviour reports hidden" : `${next[0]!.toUpperCase()}${next.slice(1)} reports on`);
  }

  async function downloadCsv() {
    const res = await exportCsv({ data: { month: monthKey() } });
    const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = res.filename;
    a.click();
    URL.revokeObjectURL(url);
    toast("Spreadsheet downloaded — open in Google Sheets");
  }

  async function pullCalendar() {
    setBusy(true);
    setGoogleMsg(null);
    try {
      const res = await syncGoogleCalendar();
      if (!res.ok) {
        if (res.loginUrl) {
          redirectToLoginIfRequired({
            ok: false,
            data: null,
            loginRequired: true,
            loginUrl: res.loginUrl,
            errorMessage: res.message ?? undefined,
          });
        }
        setGoogleMsg(res.message ?? "Google Calendar is not connected in this session.");
        setEvents([]);
        return;
      }
      setEvents(res.events);
      setGoogleMsg(
        res.events.length
          ? "Events from this month. Add any of them as an expense from the + button."
          : "No calendar events returned for this month.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-5 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <Link to="/" className="grid size-10 place-items-center rounded-full bg-cream shadow-soft" aria-label="Back">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-display text-xl font-medium">Settings</h1>
        <span className="w-10" />
      </header>

      <div className="mt-5 rounded-xl bg-cream p-4 shadow-soft">
        <p className="text-xs text-muted">Signed in</p>
        <div className="mt-2">
          <UserButton />
        </div>
        <Field label="Your name">
          <Input className="mt-3" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </Field>
        <Button
          variant="secondary"
          className="mt-3"
          onClick={async () => {
            await saveDisplayName({ data: { name: displayName.trim() || "You" } });
            await qc.invalidateQueries({ queryKey: ["keep-dashboard"] });
            toast("Name saved");
          }}
        >
          Save name
        </Button>
      </div>

      <section className="mt-5 rounded-xl bg-cream p-4 shadow-soft">
        <h2 className="text-sm font-medium">Appearance</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Light or dark. Keep remembers your choice on this device, and on your account after you sign in.
        </p>
        <div className="mt-4">
          <ThemeSwitch />
        </div>
      </section>

      <section className="mt-5 rounded-xl bg-cream p-4 shadow-soft">
        <h2 className="text-sm font-medium">Google</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Sign in with Google on the login screen. Export this month to Sheets, or pull Calendar
          events as spending hints when Google is connected.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button onClick={() => void downloadCsv()}>Download CSV for Google Sheets</Button>
          <Button variant="secondary" disabled={busy} onClick={() => void pullCalendar()}>
            {busy ? "Talking to Google…" : "Import from Google Calendar"}
          </Button>
        </div>
        {googleMsg ? <p className="mt-3 text-sm text-muted">{googleMsg}</p> : null}
        {events && events.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {events.map((ev) => (
              <li key={ev.id} className="flex items-center justify-between rounded-md bg-paper px-3 py-2 text-sm">
                <span className="min-w-0 truncate">{ev.title}</span>
                <span className="ml-3 shrink-0 text-xs text-muted">{ev.start}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="mt-5 rounded-xl bg-cream p-4 shadow-soft">
        <h2 className="text-sm font-medium">Behaviour reports</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Daily, weekly, bi-monthly, or monthly notes on how you spend — and how to cut it. Turn off to hide the menu
          on Home and Insights. Personal and family reports stay on their own ledgers.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {INSIGHT_CADENCE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => void setInsight(opt.id)}
              className={`keep-press rounded-lg px-3 py-2.5 text-left ${
                insightCadence === opt.id ? "bg-ink text-cream" : "bg-paper-2 text-ink"
              }`}
            >
              <span className="block text-sm font-medium">{opt.label}</span>
              <span className={`mt-0.5 block text-xs ${insightCadence === opt.id ? "text-cream/70" : "text-muted"}`}>
                {opt.hint}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-xl bg-cream p-4 shadow-soft">
        <h2 className="text-sm font-medium">Household</h2>
        <p className="mt-1 text-sm text-muted">
          {data.household.name} · invite {data.household.inviteCode}
        </p>
        <Link to="/family" className="mt-3 inline-block text-sm underline underline-offset-4">
          Manage family
        </Link>
      </section>

      <section className="mt-5 rounded-xl bg-cream p-4 shadow-soft">
        <h2 className="text-sm font-medium">Wallet</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Aadhaar, PAN, driving licence, and your debit or credit cards — stored only for you.
        </p>
        <Link to="/vault" className="mt-3 inline-block text-sm underline underline-offset-4">
          Open wallet
        </Link>
      </section>

      {hasSample ? (
        <Button
          variant="ghost"
          className="mt-4 w-full text-danger"
          onClick={async () => {
            await clearSampleData();
            await qc.invalidateQueries({ queryKey: ["keep-dashboard"] });
            toast("Sample activity cleared");
          }}
        >
          Clear sample activity
        </Button>
      ) : null}
    </div>
  );
}
