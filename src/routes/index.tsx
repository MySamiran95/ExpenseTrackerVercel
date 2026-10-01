import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, IdCard, Luggage, Plus } from "lucide-react";
import { AppGate } from "@/components/app-gate";
import { SpendArea } from "@/components/charts";
import { BehaviourDigest, CategoryLimitsCard, EmiBehaviourCard, HouseholdCapCard, MonthSpend, SpendScores } from "@/components/credit-card";
import { BellLink, ScopeSwitch, TopAvatar } from "@/components/shell";
import { ThemeIconButton } from "@/components/theme";
import { MemberChip } from "@/components/ui";
import { AlertItem } from "@/components/alerts";
import {
  alertsForNow,
  analyzeEmi,
  backupIsDue,
  buildMonthClose,
  buildPeriodDigest,
  buildSuggestions,
  daysLeftInMonth,
  displayPerson,
  displaySub,
  firstName,
  formatDay,
  formatInr,
  greeting,
  monthCloseIsFresh,
  monthKey,
  monthLabel,
  shiftMonth,
  spenderName,
  spendScoresForMonth,
  tripPending,
  typicalMonthAverage,
  withoutTrips,
  type InsightCadence,
} from "@/lib/keep";
import { saveInsightCadence } from "@/lib/server/keep";
import { applyDashboard, useKeep } from "@/lib/use-keep";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  return (
    <AppGate>
      <HomeBody />
    </AppGate>
  );
}

function HomeBody() {
  const month = monthKey();
  const { data } = useKeep(month);
  const qc = useQueryClient();
  const { user } = useCurrentUserState();
  if (!data?.household) return null;

  const monthExpenses = data.expenses.filter((e) => e.occurredOn.startsWith(month));
  const everydayMonth = withoutTrips(monthExpenses);
  const tripMonth = monthExpenses.filter((e) => e.tripId != null);
  const spent = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const everyday = everydayMonth.reduce((s, e) => s + e.amount, 0);
  const tripTotal = tripMonth.reduce((s, e) => s + e.amount, 0);
  const typical = typicalMonthAverage(data.expenses, month);
  const recent = [...monthExpenses].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn)).slice(0, 4);
  const name = firstName(data.profile.displayName);
  const byCategory: Record<string, number> = {};
  for (const e of everydayMonth) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  const prevKey = shiftMonth(month, -1);
  const prevSpend = withoutTrips(data.expenses)
    .filter((e) => e.occurredOn.startsWith(prevKey))
    .reduce((s, e) => s + e.amount, 0);
  const investMonth = data.investments
    .filter((i) => i.investedOn.startsWith(month))
    .reduce((s, i) => s + i.amount, 0);
  const suggestions = buildSuggestions({
    monthSpend: everyday,
    byCategory,
    budgets: data.budgets,
    investmentsMonth: investMonth,
    prevSpend: prevSpend > 0 ? prevSpend : null,
  }).slice(0, 2);
  const backupDue = backupIsDue(data.profile.backupCadence, data.profile.lastBackupAt);
  const family = data.scope === "family";
  const categoryCaps = data.budgets
    .filter((b) => b.limitAmount > 0 && b.category !== "EMI & Loans")
    .map((b) => ({
      category: b.category,
      spent: byCategory[b.category] ?? 0,
      limit: b.limitAmount,
    }));
  const scores = spendScoresForMonth(data.expenses, month);
  const prevMonth = shiftMonth(month, -1);
  const close = buildMonthClose({
    expenses: data.expenses,
    investments: data.investments,
    month: prevMonth,
  });
  const showClose = monthCloseIsFresh() && (close.count > 0 || close.tripTotal > 0 || Boolean(data.report));
  const alerts = alertsForNow(data.notifications, {
    trips: data.trips,
    expenses: data.expenses,
    budgets: data.budgets,
    joinRequests: data.joinRequests,
    month,
    monthlyLimit: data.household.monthlyLimit,
  });
  const emi = analyzeEmi(data.expenses, month);
  const left = daysLeftInMonth();
  const cadence = data.profile.insightCadence;
  const digest =
    cadence === "off"
      ? null
      : buildPeriodDigest({
          expenses: data.expenses,
          budgets: data.budgets,
          investments: data.investments,
          members: data.members,
          cadence,
        });

  async function setCadence(next: InsightCadence) {
    const payload = await saveInsightCadence({ data: { cadence: next } });
    applyDashboard(qc, user?.id, payload);
  }

  return (
    <div className="overflow-x-hidden pb-8">
      <header className="flex items-center justify-between px-5 pt-6">
        <div className="flex items-center gap-2">
          <BellLink notifications={alerts} />
          <ThemeIconButton />
        </div>
        <TopAvatar />
      </header>

      <section className="px-5 pt-5">
        <p className="keep-enter text-sm text-muted">{greeting()}</p>
        <h1 className="keep-enter keep-delay-1 mt-0.5 font-display text-[1.7rem] font-medium tracking-tight">
          Hello, {name}
        </h1>

        <div className="keep-enter keep-delay-2 mt-4">
          <ScopeSwitch data={data} />
        </div>

        {data.joinRequests.length > 0 && data.household.role === "owner" ? (
          <Link to="/family" className="keep-lift mt-4 flex items-center justify-between rounded-xl bg-cream px-4 py-3 shadow-soft">
            <span>
              <span className="block text-sm font-medium">Join requests</span>
              <span className="text-xs text-muted">{data.joinRequests.length} waiting for you</span>
            </span>
            <ChevronRight className="size-4 text-muted" />
          </Link>
        ) : null}

        <div className="keep-enter keep-delay-3 mt-4">
          <MonthSpend
            spent={spent}
            everyday={everyday}
            tripTotal={tripTotal}
            average={typical}
            label={family ? `${data.household.name} · ${monthLabel(month)}` : monthLabel(month)}
          />
        </div>

        {data.household.monthlyLimit > 0 ? (
          <div className="keep-enter keep-delay-3 mt-3">
            <HouseholdCapCard spent={everyday} limit={data.household.monthlyLimit} daysLeft={left} />
          </div>
        ) : null}

        {alerts.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {alerts.slice(0, 3).map((n) => (
              <AlertItem key={n.id} n={n} />
            ))}
          </ul>
        ) : null}

        <div className="keep-enter keep-delay-4 mt-3">
          <SpendScores scores={scores} expenses={data.expenses} month={month} compact />
        </div>

        {digest ? (
          <div className="mt-3">
            <BehaviourDigest
              digest={digest}
              cadence={cadence}
              onCadence={(next) => void setCadence(next)}
              onHide={() => void setCadence("off")}
            />
          </div>
        ) : (
          <button
            type="button"
            className="keep-press mt-3 w-full rounded-xl bg-cream px-4 py-3 text-left text-sm shadow-soft"
            onClick={() => void setCadence("weekly")}
          >
            <span className="block font-medium">Behaviour reports are off</span>
            <span className="mt-0.5 block text-xs text-muted">Turn on daily, weekly, bi-monthly, or monthly insights.</span>
          </button>
        )}

        {showClose ? (
          <Link to="/reports" className="keep-lift mt-4 block rounded-xl bg-night p-4 text-on-night shadow-night">
            <p className="text-xs uppercase tracking-wider text-on-night-muted">{monthLabel(prevMonth)} close is ready</p>
            <p className="mt-1 font-display text-2xl tabular-nums">{formatInr(close.everyday)}</p>
            <p className="mt-1 text-sm leading-relaxed text-on-night-muted">
              {close.habits[0] ?? close.summary}
            </p>
            <span className="mt-2 inline-block text-sm underline underline-offset-4">Read the full report</span>
          </Link>
        ) : null}

        {emi.monthAmount > 0 ? (
          <div className="mt-3">
            <EmiBehaviourCard emi={emi} />
          </div>
        ) : null}

        {categoryCaps.length > 0 ? (
          <div className="mt-4">
            <CategoryLimitsCard caps={categoryCaps} />
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Link to="/add" className="keep-press flex flex-col items-center gap-1.5 rounded-xl bg-cream px-2 py-3 shadow-soft">
            <Plus className="size-4" strokeWidth={1.8} />
            <span className="text-xs text-muted">Add</span>
          </Link>
          <Link to="/trips" className="keep-press flex flex-col items-center gap-1.5 rounded-xl bg-cream px-2 py-3 shadow-soft">
            <Luggage className="size-4" strokeWidth={1.8} />
            <span className="text-xs text-muted">Trips</span>
          </Link>
          <Link to="/vault" className="keep-press flex flex-col items-center gap-1.5 rounded-xl bg-cream px-2 py-3 shadow-soft">
            <IdCard className="size-4" strokeWidth={1.8} />
            <span className="text-xs text-muted">Wallet</span>
          </Link>
        </div>

        {data.trips.length > 0 ? (
          <Link to="/trips" className="keep-lift mt-4 block rounded-xl bg-cream px-4 py-3 shadow-soft">
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{data.trips[0]!.name}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">
                  {data.trips[0]!.budgetLimit > 0
                    ? `${formatInr(data.trips[0]!.total)} spent`
                    : `${data.trips.length} trip${data.trips.length === 1 ? "" : "s"}`}
                </span>
                {data.trips[0]!.budgetLimit > 0 ? (
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                    {formatInr(data.trips[0]!.budgetLimit)} budget · {formatInr(Math.max(0, tripPending(data.trips[0]!) ?? 0))} pending
                  </span>
                ) : null}
              </span>
              <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted" />
            </span>
          </Link>
        ) : null}

        <div className="mt-6 rounded-xl bg-cream p-4 shadow-soft">
          <h2 className="text-sm font-medium">Daily spend</h2>
          <p className="mt-0.5 text-xs text-muted">
            {family ? `${data.household.name} · ` : "Personal · "}
            {monthLabel(month)} · everyday
          </p>
          <SpendArea expenses={everydayMonth} month={month} />
        </div>

        <div className="mt-6 flex items-end justify-between">
          <h2 className="text-base font-medium">Recent</h2>
          <Link to="/expenses" className="text-xs text-muted">
            All
          </Link>
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {recent.length === 0 ? (
            <li className="rounded-xl bg-cream px-4 py-5 text-sm text-muted shadow-soft">
              Nothing this month. Tap Add to log one.
            </li>
          ) : (
            recent.map((e) => (
              <li key={e.id}>
                <Link
                  to="/add"
                  search={{ type: "expense", id: e.id }}
                  className="keep-lift flex items-center gap-3 rounded-xl bg-cream px-3.5 py-3 shadow-soft"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {e.reason || displaySub(e.subcategory, e.subcategoryOther)}
                    </span>
                    <span className="block text-xs text-muted">
                      {formatDay(e.occurredOn)} · {displayPerson(e.forWhom, e.forWhomOther)}
                      {e.tripName ? ` · ${e.tripName}` : ""}
                      {data.members.length > 1 ? (
                        <>
                          {" · "}
                          <MemberChip name={spenderName(e, data.members)} />
                        </>
                      ) : null}
                    </span>
                  </span>
                  <span className="text-sm font-medium tabular-nums">{formatInr(e.amount)}</span>
                </Link>
              </li>
            ))
          )}
        </ul>

        {backupDue ? (
          <Link to="/settings" className="keep-lift mt-4 flex items-center justify-between rounded-xl bg-cream px-4 py-3 shadow-soft">
            <span>
              <span className="block text-sm font-medium">Backup is due</span>
              <span className="text-xs text-muted">Download a JSON copy of this ledger</span>
            </span>
            <ChevronRight className="size-4 text-muted" />
          </Link>
        ) : null}

        {suggestions.length > 0 ? (
          <div className="mt-8">
            <div className="flex items-end justify-between">
              <h2 className="text-base font-medium">Suggestions</h2>
              <Link to="/insights" className="text-xs text-muted">
                Full plan
              </Link>
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {suggestions.map((s) => (
                <li key={s.title} className="rounded-xl bg-cream px-4 py-3 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{s.title}</p>
                    {s.save ? (
                      <span className="shrink-0 text-xs tabular-nums text-sage-deep">{formatInr(s.save)}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
