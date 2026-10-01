import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";
import { AppGate } from "@/components/app-gate";
import { AlertItem } from "@/components/alerts";
import { ScopeSwitch } from "@/components/shell";
import {
  alertsForNow,
  analyzeSpending,
  buildActionInsights,
  buildMonthClose,
  formatDay,
  formatInr,
  lastNMonthKeys,
  LOOKBACK_MONTHS,
  monthKey,
  monthLabel,
  projectCategories,
  shiftMonth,
  splitLedger,
  withoutTrips,
} from "@/lib/keep";
import { useKeep } from "@/lib/use-keep";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({ component: Page });

function Page() {
  return (
    <AppGate>
      <Body />
    </AppGate>
  );
}

function Body() {
  const { data } = useKeep();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#month-close") return;
    document.getElementById("month-close")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [data]);

  if (!data?.household) return null;
  const prev = shiftMonth(monthKey(), -1);
  const current = monthKey();
  const everyday = withoutTrips(data.expenses);
  const behavior = analyzeSpending(everyday, lastNMonthKeys(LOOKBACK_MONTHS));
  const thisMonth = data.expenses.filter((e) => e.occurredOn.startsWith(current));
  const split = splitLedger(thisMonth);
  const prevSpend = withoutTrips(data.expenses)
    .filter((e) => e.occurredOn.startsWith(prev))
    .reduce((s, e) => s + e.amount, 0);
  const byCategory: Record<string, number> = {};
  for (const e of split.regular) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  const investMonth = data.investments
    .filter((i) => i.investedOn.startsWith(current))
    .reduce((s, i) => s + i.amount, 0);
  const insights = buildActionInsights({
    monthSpend: split.regularTotal,
    tripTotal: split.tripTotal,
    byCategory,
    budgets: data.budgets,
    trips: data.trips,
    prevSpend: prevSpend > 0 ? prevSpend : null,
    behavior,
    investmentsMonth: investMonth,
    householdLimit: data.household.monthlyLimit,
  });
  const projections = projectCategories(split.regular, data.budgets, current).filter(
    (p) => p.budget != null && (p.spent / (p.budget || 1) >= 0.8 || (p.projected > (p.budget || 0))),
  );
  const allTotal = split.regularTotal + split.tripTotal;
  const prevClose = buildMonthClose({
    expenses: data.expenses,
    investments: data.investments,
    month: prev,
  });
  const alerts = alertsForNow(data.notifications, {
    trips: data.trips,
    expenses: data.expenses,
    budgets: data.budgets,
    joinRequests: data.joinRequests,
    month: current,
    monthlyLimit: data.household.monthlyLimit,
  });

  return (
    <div className="overflow-x-hidden px-5 pb-8 pt-6">
      <header className="flex items-center justify-between">
        <Link to="/" className="keep-press grid size-10 place-items-center rounded-full bg-cream shadow-soft" aria-label="Back">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-display text-xl font-medium">Reports</h1>
        <span className="w-10" />
      </header>
      <div className="mt-4">
        <ScopeSwitch data={data} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {data.scope === "family"
          ? `Family reports for ${data.household.name}. Personal reports stay on the Personal tab.`
          : "Personal reports only. Family trends never mix in here."}{" "}
        Everyday limits and trip budgets stay on separate books.
      </p>

      <div className="mt-5 rounded-xl bg-night p-5 text-on-night">
        <p className="text-xs text-on-night-muted">
          {monthLabel(current)} · {data.scope === "family" ? "family spend" : "personal spend"}
        </p>
        <p className="mt-1 font-display text-3xl tabular-nums">{formatInr(allTotal)}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-on-night-muted">Everyday</p>
            <p className="tabular-nums">{formatInr(split.regularTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-on-night-muted">Trips</p>
            <p className="tabular-nums">{formatInr(split.tripTotal)}</p>
          </div>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-base font-medium">Do this next</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {insights.map((item) => (
            <li key={item.id}>
              <Link
                to={item.href as "/budgets"}
                className="keep-lift block rounded-xl bg-cream px-4 py-3 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={cn(
                        "text-[11px] uppercase tracking-wider",
                        item.tone === "danger" && "text-danger",
                        item.tone === "warn" && "text-terra",
                        item.tone === "good" && "text-sage-deep",
                        item.tone === "info" && "text-muted",
                      )}
                    >
                      {item.tone === "danger" ? "Act now" : item.tone === "warn" ? "This week" : item.tone === "good" ? "Keep it" : "Worth doing"}
                    </p>
                    <p className="mt-0.5 text-sm font-medium">{item.title}</p>
                  </div>
                  {item.metric ? (
                    <span className="shrink-0 text-xs tabular-nums text-muted">{item.metric}</span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-sm underline underline-offset-4">
                  {item.hrefLabel}
                  <ChevronRight className="size-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {projections.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-base font-medium">Limits at risk</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {projections.map((p) => (
              <li key={p.category} className="rounded-xl bg-cream px-4 py-3 shadow-soft">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium">{p.category}</p>
                  <p className="text-sm tabular-nums">
                    {formatInr(p.spent)}
                    {p.budget != null ? <span className="text-muted"> / {formatInr(p.budget)}</span> : null}
                  </p>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted">{p.guidance}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.trips.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-base font-medium">Trip budgets</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {data.trips.map((trip) => {
              const pending = trip.budgetLimit > 0 ? trip.budgetLimit - trip.total : null;
              return (
                <li key={trip.id}>
                  <Link to="/trips" className="flex items-center justify-between rounded-xl bg-cream px-4 py-3 shadow-soft">
                    <span>
                      <span className="block text-sm font-medium">{trip.name}</span>
                      <span className="text-xs text-muted">
                        {pending == null
                          ? "No trip budget set"
                          : pending < 0
                            ? `${formatInr(-pending)} over trip budget`
                            : `${formatInr(pending)} pending`}
                      </span>
                    </span>
                    <span className="text-sm tabular-nums">{formatInr(trip.total)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-cream p-4 shadow-soft">
          <p className="text-xs text-muted">24-month everyday avg</p>
          <p className="mt-1 font-display text-lg tabular-nums">{formatInr(behavior.avgMonthly)}</p>
        </div>
        <div className="rounded-xl bg-cream p-4 shadow-soft">
          <p className="text-xs text-muted">Weekend share</p>
          <p className="mt-1 font-display text-lg tabular-nums">{Math.round(behavior.weekendShare * 100)}%</p>
        </div>
      </div>

      {prevClose.count > 0 || prevClose.tripTotal > 0 || data.report ? (
        <article id="month-close" className="mt-6 rounded-xl bg-cream p-5 shadow-soft">
          <p className="text-xs uppercase tracking-wider text-muted">{monthLabel(prevClose.month)} close</p>
          <h2 className="mt-1 font-display text-2xl font-medium tabular-nums">{formatInr(prevClose.everyday)}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink">{prevClose.summary}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted">Trips</p>
              <p className="text-sm tabular-nums">{formatInr(prevClose.tripTotal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Invested</p>
              <p className="text-sm tabular-nums">{formatInr(prevClose.invest)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Entries</p>
              <p className="text-sm tabular-nums">{prevClose.count}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Avg ticket</p>
              <p className="text-sm tabular-nums">{formatInr(prevClose.avgTicket)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Weekend share</p>
              <p className="text-sm tabular-nums">{Math.round(prevClose.weekendShare * 100)}%</p>
            </div>
            <div>
              <p className="text-xs text-muted">Vs previous</p>
              <p className="text-sm tabular-nums">
                {prevClose.vsPrevious == null
                  ? "—"
                  : `${prevClose.vsPrevious >= 0 ? "+" : "−"}${Math.abs(Math.round(prevClose.vsPrevious))}%`}
              </p>
            </div>
          </div>
          {prevClose.heaviestDay ? (
            <p className="mt-3 text-sm text-muted">
              Heaviest day {formatDay(prevClose.heaviestDay.date)} · {formatInr(prevClose.heaviestDay.amount)}
            </p>
          ) : null}
          {prevClose.topCategories.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-2">
              {prevClose.topCategories.slice(0, 4).map((c) => (
                <li key={c.name} className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{c.name}</span>
                  <span className="tabular-nums text-muted">
                    {formatInr(c.amount)} · {Math.round(c.share * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <h3 className="mt-5 text-sm font-medium">How you spent</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {prevClose.habits.map((h) => (
              <li key={h} className="text-sm leading-relaxed text-muted">
                {h}
              </li>
            ))}
          </ul>
          <h3 className="mt-5 text-sm font-medium">Decisions for this month</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {prevClose.decisions.map((d) => (
              <li key={d} className="rounded-lg bg-paper-2 px-3 py-2.5 text-sm leading-relaxed">
                {d}
              </li>
            ))}
          </ul>
        </article>
      ) : (
        <div className="mt-6 rounded-xl bg-cream p-5 text-sm text-muted shadow-soft">
          The {monthLabel(prev)} close appears once that month has spend on the books.
        </div>
      )}

      <h2 className="mt-7 text-base font-medium">Alerts</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {alerts.map((n) => (
          <AlertItem key={n.id} n={n} />
        ))}
        {alerts.length === 0 ? (
          <li className="rounded-xl bg-cream px-4 py-5 text-sm text-muted">No alerts right now. The household cap, category limits, and trip budgets trigger them when they still apply.</li>
        ) : null}
      </ul>
    </div>
  );
}
