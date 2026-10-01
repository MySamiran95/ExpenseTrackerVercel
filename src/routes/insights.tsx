import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { AppGate } from "@/components/app-gate";
import { CategoryBars, CategoryDonut, CategoryRadar, ChildrenTrend, MemberSpendBars, PaymentModeChart, ProjectionBars, TrendByCategory } from "@/components/charts";
import { BehaviourDigest, EmiBehaviourCard } from "@/components/credit-card";
import { ScopeSwitch } from "@/components/shell";
import { Button } from "@/components/ui";
import {
  analyzeSpending,
  analyzeEmi,
  buildCoachNarrative,
  buildPeriodDigest,
  buildSuggestions,
  CATEGORIES,
  formatInr,
  historyMonthKeys,
  isChildrenSpend,
  memberMonthSpend,
  monthKey,
  monthLabel,
  projectCategories,
  shiftMonth,
  withoutTrips,
  type InsightCadence,
  type Suggestion,
} from "@/lib/keep";
import { getCoachAdvice, saveInsightCadence, type CoachAdvice } from "@/lib/server/keep";
import { applyDashboard, useKeep } from "@/lib/use-keep";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/insights")({ component: Page });

function Page() {
  return (
    <AppGate>
      <Body />
    </AppGate>
  );
}

function CoachCard({ item }: { item: Suggestion }) {
  return (
    <li className="rounded-xl bg-cream px-4 py-3 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          {item.when ? <p className="text-[11px] uppercase tracking-wider text-muted">{item.when}</p> : null}
          <p className="text-sm font-medium">{item.title}</p>
        </div>
        {item.save ? (
          <span className="shrink-0 text-xs tabular-nums text-sage-deep">{formatInr(item.save)}</span>
        ) : null}
      </div>
      {item.why ? <p className="mt-1 text-xs leading-relaxed text-terra">{item.why}</p> : null}
      <p className="mt-1 text-sm leading-relaxed text-muted">{item.body}</p>
      {item.steps && item.steps.length > 0 ? (
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm leading-relaxed text-ink">
          {item.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : null}
    </li>
  );
}

function Body() {
  const [month, setMonth] = useState(monthKey());
  const [category, setCategory] = useState<string>("all");
  const [coach, setCoach] = useState<CoachAdvice | null>(null);
  const [coachBusy, setCoachBusy] = useState(false);
  const { data } = useKeep(month);
  const qc = useQueryClient();
  const { user } = useCurrentUserState();
  const expenses = data?.expenses ?? [];
  const months = historyMonthKeys(expenses);
  const monthExpenses = withoutTrips(expenses.filter((e) => e.occurredOn.startsWith(month)));
  const prevKey = shiftMonth(month, -1);
  const prevExpenses = withoutTrips(expenses.filter((e) => e.occurredOn.startsWith(prevKey)));

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of monthExpenses) map[e.category] = (map[e.category] ?? 0) + e.amount;
    return map;
  }, [monthExpenses]);

  const behavior = useMemo(() => analyzeSpending(withoutTrips(expenses), months), [expenses, months]);

  if (!data?.household) return null;

  const family = data.scope === "family";
  const emi = analyzeEmi(data.expenses, month);
  const investMonth = data.investments
    .filter((i) => i.investedOn.startsWith(month))
    .reduce((s, i) => s + i.amount, 0);
  const total = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const prevTotal = prevExpenses.reduce((s, e) => s + e.amount, 0);
  const delta = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;

  const suggestions = buildSuggestions({
    monthSpend: total,
    byCategory,
    budgets: data.budgets,
    investmentsMonth: investMonth,
    prevSpend: prevExpenses.length ? prevTotal : null,
    behavior,
    members: data.members,
  });

  const localNarrative = buildCoachNarrative({
    monthSpend: total,
    prevSpend: prevExpenses.length ? prevTotal : null,
    behavior,
    members: data.members,
  });

  const rows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const projections = projectCategories(monthExpenses, data.budgets, month);
  const prevMix = Object.entries(
    prevExpenses.reduce<Record<string, number>>((m, e) => {
      m[e.category] = (m[e.category] ?? 0) + e.amount;
      return m;
    }, {}),
  ).map(([category, amount]) => ({ category, amount }));
  const monthMix = rows.map(([category, amount]) => ({ category, amount }));
  const avgMix = behavior.topCategories.map((c) => ({
    category: c.name,
    amount: c.amount / Math.max(behavior.monthsCovered, 1),
  }));
  const memberRows = memberMonthSpend(data.expenses, data.members, month);
  const childExpenses = data.expenses.filter(isChildrenSpend);
  const childMonth = childExpenses.filter((e) => e.occurredOn.startsWith(month));
  const childTotal = childMonth.reduce((s, e) => s + e.amount, 0);
  const childPrev = childExpenses
    .filter((e) => e.occurredOn.startsWith(prevKey))
    .reduce((s, e) => s + e.amount, 0);
  const allMonthTotal = data.expenses
    .filter((e) => e.occurredOn.startsWith(month))
    .reduce((s, e) => s + e.amount, 0);
  const childShare = allMonthTotal > 0 ? childTotal / allMonthTotal : 0;
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

  async function askCoach() {
    setCoachBusy(true);
    try {
      const res = await getCoachAdvice({ data: { force: Boolean(coach) } });
      setCoach(res);
    } catch (err) {
      setCoach({
        ok: false,
        cached: false,
        narrative: "",
        items: [],
        error: err instanceof Error ? err.message : "Could not reach Finance coach",
      });
    } finally {
      setCoachBusy(false);
    }
  }

  return (
    <div className="overflow-x-hidden px-5 pb-8 pt-6">
      <header className="flex items-center justify-between">
        <Link to="/" className="keep-press grid size-10 place-items-center rounded-full bg-cream shadow-soft" aria-label="Back">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-display text-xl font-medium">Insights</h1>
        <span className="w-10" />
      </header>

      <div className="mt-4">
        <ScopeSwitch data={data} />
      </div>

      {digest ? (
        <div className="mt-4">
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
          className="keep-press mt-4 w-full rounded-xl bg-cream px-4 py-3 text-left text-sm shadow-soft"
          onClick={() => void setCadence("weekly")}
        >
          <span className="block font-medium">Behaviour reports are off</span>
          <span className="mt-0.5 block text-xs text-muted">Turn on daily, weekly, bi-monthly, or monthly insights.</span>
        </button>
      )}

      <div className="mt-5 flex items-center justify-between rounded-xl bg-cream px-3 py-2 shadow-soft">
        <button
          type="button"
          className="keep-press grid size-9 place-items-center"
          onClick={() => setMonth(shiftMonth(month, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-medium">{monthLabel(month)}</p>
        <button
          type="button"
          className="keep-press grid size-9 place-items-center"
          onClick={() => setMonth(shiftMonth(month, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-cream p-4 shadow-soft">
          <p className="text-xs text-muted">{family ? "Family spent" : "You spent"}</p>
          <p className="mt-1 font-display text-xl tabular-nums">{formatInr(total)}</p>
        </div>
        <div className="rounded-xl bg-cream p-4 shadow-soft">
          <p className="text-xs text-muted">vs last month</p>
          <p className="mt-1 font-display text-xl tabular-nums">
            {delta == null ? "—" : `${delta > 0 ? "+" : ""}${Math.round(delta)}%`}
          </p>
        </div>
      </div>

      <section className="mt-4 rounded-xl bg-night p-4 text-on-night shadow-soft">
        <p className="text-[11px] uppercase tracking-wider text-on-night-muted">
          {family ? `${data.household.name} behaviour` : "Personal behaviour"}
        </p>
        <p className="mt-1 font-display text-2xl tabular-nums">{formatInr(behavior.avgMonthly)}</p>
        <p className="text-xs text-on-night-muted">average month · {behavior.monthsCovered} months on the books</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[11px] text-on-night-muted">Trend (last 3 vs prior 3)</p>
            <p className="tabular-nums">
              {behavior.trendPct == null
                ? "—"
                : `${behavior.trendPct > 0 ? "+" : ""}${Math.round(behavior.trendPct)}%`}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-on-night-muted">Weekend share</p>
            <p className="tabular-nums">{Math.round(behavior.weekendShare * 100)}%</p>
          </div>
          <div>
            <p className="text-[11px] text-on-night-muted">Heaviest month</p>
            <p>
              {behavior.heaviest
                ? `${monthLabel(behavior.heaviest.month).split(" ")[0]} · ${formatInr(behavior.heaviest.amount, { compact: true })}`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-on-night-muted">Weekend vs weekday</p>
            <p className="tabular-nums">
              {formatInr(behavior.weekendAvg, { compact: true })} / {formatInr(behavior.weekdayAvg, { compact: true })}
            </p>
          </div>
        </div>
      </section>

      <div className="mt-4 rounded-xl bg-cream p-4 shadow-soft">
        <h2 className="text-sm font-medium">Spend trend</h2>
        <p className="mt-0.5 text-xs text-muted">
          {family ? "Every month on the family ledger." : "Every month on your personal ledger."}
        </p>
        <TrendByCategory expenses={withoutTrips(data.expenses)} category={category} months={months} />
        <select
          className="mt-2 h-9 w-full rounded-md bg-paper px-2 text-xs outline-none"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 rounded-xl bg-cream p-4 shadow-soft">
        <h2 className="text-sm font-medium">Who spent this month</h2>
        <p className="mt-0.5 text-xs text-muted">
          {family
            ? "Everyone currently on this family ledger. Personal spend is on the Personal tab."
            : "Your own taps this month. Family names appear after you open the Family ledger."}
        </p>
        <div className="mt-2">
          <MemberSpendBars rows={memberRows} />
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-cream p-4 shadow-soft">
        <h2 className="text-sm font-medium">Month-end projection</h2>
        <p className="mt-0.5 text-xs text-muted">
          {projections[0] && projections[0].remainingDays <= 0
            ? `${monthLabel(month)} is closed — actual spend against each limit.`
            : `If today's pace holds, where each category lands in ${monthLabel(month)}.`}
        </p>
        <ProjectionBars rows={projections} />
        <ul className="mt-3 flex flex-col gap-3">
          {projections.slice(0, 6).map((row) => (
            <li key={row.category}>
              <div className="flex items-baseline justify-between text-sm">
                <span>{row.category}</span>
                <span className="tabular-nums text-muted">
                  {formatInr(row.spent)}
                  {row.remainingDays > 0 ? ` → ${formatInr(row.projected)}` : row.budget != null ? ` / ${formatInr(row.budget)}` : ""}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{row.guidance}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-xl bg-cream p-4 shadow-soft">
        <h2 className="text-sm font-medium">This month vs last</h2>
        <p className="mt-0.5 text-xs text-muted">How this month’s mix compares with last month.</p>
        <CategoryBars current={monthMix} previous={prevMix} />
      </div>

      <div className="mt-4 rounded-xl bg-cream p-4 shadow-soft">
        <h2 className="text-sm font-medium">Shape vs your usual mix</h2>
        <p className="mt-0.5 text-xs text-muted">This month against your usual mix of categories.</p>
        <CategoryRadar monthMix={monthMix} averageMix={avgMix} />
      </div>

      <div className="mt-4 rounded-xl bg-cream p-4 shadow-soft">
        <h2 className="text-sm font-medium">Category spending</h2>
        <p className="mt-0.5 text-xs text-muted">Share of everyday spend in {monthLabel(month)} — pie and bars, same as how you paid.</p>
        <CategoryDonut expenses={monthExpenses} month={month} centerLabel={monthLabel(month)} showBars />
      </div>

      <div className="mt-4 rounded-xl bg-cream p-4 shadow-soft">
        <h2 className="text-sm font-medium">How you paid this month</h2>
        <p className="mt-0.5 text-xs text-muted">Which rail moved more rupees — UPI, online, cards, or EMI.</p>
        <div className="mt-2">
          <PaymentModeChart expenses={monthExpenses} />
        </div>
      </div>

      {emi.monthAmount > 0 || emi.committed.length > 0 ? (
          <div className="mt-4">
            <EmiBehaviourCard emi={emi} />
            {emi.actions.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-2">
                {emi.actions.map((item) => (
                  <CoachCard key={item.title} item={item} />
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

      <h2 className="mt-6 text-base font-medium">This month</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {rows.map(([cat, amount]) => {
          const budget = data.budgets.find((b) => b.category === cat);
          const pct = budget && budget.limitAmount > 0 ? Math.min(100, (amount / budget.limitAmount) * 100) : null;
          return (
            <li key={cat} className="rounded-xl bg-cream px-4 py-3 shadow-soft">
              <div className="flex items-center justify-between text-sm">
                <span>{cat}</span>
                <span className="tabular-nums">{formatInr(amount)}</span>
              </div>
              {pct != null ? (
                <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-paper-2">
                  <div
                    className={`h-full rounded-pill ${pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-mustard" : "bg-sage"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <h2 className="mt-6 text-base font-medium">Where the ledger goes</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {behavior.topCategories.map((c) => (
          <li key={c.name} className="flex items-center justify-between rounded-xl bg-cream px-4 py-3 text-sm shadow-soft">
            <span>{c.name}</span>
            <span className="tabular-nums text-muted">
              {formatInr(c.amount, { compact: true })} · {Math.round(c.share * 100)}%
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-xl bg-cream p-4 shadow-soft">
        <h2 className="text-sm font-medium">Spending on children</h2>
        <p className="mt-0.5 text-xs text-muted">
          Expenses tagged For whom: Children. School fees, care, and treats land here.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted">This month</p>
            <p className="mt-1 font-display text-xl tabular-nums">{formatInr(childTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-muted">vs last month</p>
            <p className="mt-1 font-display text-xl tabular-nums">
              {childPrev <= 0
                ? "—"
                : `${childTotal >= childPrev ? "+" : "−"}${formatInr(Math.abs(childTotal - childPrev))}`}
            </p>
          </div>
        </div>
        <p className="mt-2 text-xs tabular-nums text-muted">
          {Math.round(childShare * 100)}% of this month’s spend
        </p>
        <ChildrenTrend expenses={childExpenses} months={months} />
        <div className="mt-3">
          <CategoryDonut expenses={childMonth} month={month} centerLabel="On children" showBars />
        </div>
      </div>

      <section className="mt-6 rounded-xl bg-night p-4 text-on-night shadow-soft">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-mustard" strokeWidth={1.8} />
          <h2 className="text-sm font-medium">Finance coach</h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-on-night-muted">{localNarrative}</p>
      </section>

      <h2 className="mt-6 text-base font-medium">This week's plan to spend less</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Concrete moves, in order. Each one names what to do, why it works, and what it saves.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {suggestions.map((s) => (
          <CoachCard key={s.title} item={s} />
        ))}
      </ul>

      <section className="mt-6 rounded-xl bg-cream p-4 shadow-soft">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-terra" strokeWidth={1.8} />
          <h2 className="text-sm font-medium">Personalize this plan</h2>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Finance coach can reread this ledger and rewrite the cuts
          {family ? " for the household" : " for you"}.
        </p>
        <Button className="mt-3 w-full" disabled={coachBusy} onClick={() => void askCoach()}>
          {coachBusy ? "Reading your ledger…" : coach ? "Refresh the plan" : "Ask Finance coach"}
        </Button>
        {coach?.narrative ? <p className="mt-3 text-sm leading-relaxed">{coach.narrative}</p> : null}
        {coach?.items?.length ? (
          <ul className="mt-3 flex flex-col gap-2">
            {coach.items.map((item) => (
              <CoachCard
                key={item.title}
                item={{
                  title: item.title,
                  body: item.body,
                  save: item.save ?? undefined,
                  why: item.why,
                  steps: item.steps,
                  when: item.when,
                }}
              />
            ))}
          </ul>
        ) : null}
        {coach?.error && !coach.items.length ? <p className="mt-3 text-sm text-danger">{coach.error}</p> : null}
      </section>
    </div>
  );
}
