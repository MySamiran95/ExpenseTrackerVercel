import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Car, CalendarDays, Plus, ShoppingBag, Tv } from "lucide-react";
import { AppGate } from "@/components/app-gate";
import { CategoryDonut, PaymentModeChart } from "@/components/charts";
import { SpendScoreCard } from "@/components/credit-card";
import { ScopeSwitch } from "@/components/shell";
import { Badge, MemberChip } from "@/components/ui";
import {
  CATEGORIES,
  displayPerson,
  displaySub,
  formatDay,
  formatInr,
  GOAL_PRESETS,
  historyMonthKeys,
  monthKey,
  monthLabel,
  spenderName,
  spendScoresForMonth,
  withoutTrips,
  type Expense,
  type Member,
} from "@/lib/keep";
import { useKeep } from "@/lib/use-keep";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/expenses")({ component: Page });

function Page() {
  return (
    <AppGate>
      <Body />
    </AppGate>
  );
}

const ICONS = {
  car: Car,
  bag: ShoppingBag,
  play: Tv,
  home: CalendarDays,
} as const;

const ALL = "all";

function Body() {
  const [month, setMonth] = useState(monthKey());
  const [historyMonth, setHistoryMonth] = useState<string>(ALL);
  const [category, setCategory] = useState<string>("all");
  const [memberId, setMemberId] = useState<string>("all");
  const { data } = useKeep(month === ALL ? monthKey() : month);
  const expenses = data?.expenses ?? [];
  const historyRows = useMemo(() => {
    const source =
      historyMonth === ALL
        ? expenses
        : expenses.filter((e) => e.occurredOn.startsWith(historyMonth));
    return [...source].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.id - a.id);
  }, [expenses, historyMonth]);

  const historyGroups = useMemo(() => {
    const groups: { key: string; items: Expense[] }[] = [];
    const map = new Map<string, Expense[]>();
    for (const e of historyRows) {
      const key = e.occurredOn.slice(0, 7);
      const list = map.get(key);
      if (list) list.push(e);
      else map.set(key, [e]);
    }
    for (const key of [...map.keys()].sort((a, b) => b.localeCompare(a))) {
      groups.push({ key, items: map.get(key)! });
    }
    return groups;
  }, [historyRows]);

  if (!data?.household) return null;

  const familyOn = data.members.length > 1;
  const monthKeys = historyMonthKeys(data.expenses);
  const selectedMonth = month === ALL ? monthKey() : month;
  const monthExpenses = data.expenses.filter((e) => e.occurredOn.startsWith(selectedMonth));
  const everydayMonth = withoutTrips(month === ALL ? data.expenses : monthExpenses);
  const byMember =
    memberId === "all" ? monthExpenses : monthExpenses.filter((e) => e.userId === memberId);
  const filtered =
    category === "all" ? byMember : byMember.filter((e) => e.category === category);
  const total = everydayMonth.reduce((s, e) => s + e.amount, 0);
  const scores = spendScoresForMonth(data.expenses, selectedMonth);

  return (
    <div className="overflow-x-hidden px-5 pb-8 pt-6">
      <header className="flex items-center justify-between">
        <Link to="/" className="keep-press grid size-10 place-items-center rounded-full bg-cream shadow-soft" aria-label="Back">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="text-base font-medium">{familyOn ? "Family expenses" : "My Expenses"}</h1>
        <select
          className="h-10 max-w-36 rounded-full bg-cream px-3 text-xs text-muted shadow-soft outline-none"
          value={month}
          onChange={(e) => {
            const next = e.target.value;
            setMonth(next);
            setHistoryMonth(next === ALL ? ALL : next);
          }}
        >
          <option value={ALL}>All months</option>
          {[...monthKeys].reverse().map((key) => (
            <option key={key} value={key}>
              {monthLabel(key)}
            </option>
          ))}
        </select>
      </header>

      <div className="mt-4">
        <ScopeSwitch data={data} />
      </div>

      <div className="mt-4">
        <SpendScoreCard scores={scores} expenses={data.expenses} month={selectedMonth} />
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-cream p-4 shadow-soft">
        <h2 className="text-sm font-medium">By category</h2>
        <p className="mt-0.5 text-xs text-muted">
          {month === ALL ? "Every logged spend · trips stay on the trip ledger" : "Everyday spend · trips stay on the trip ledger"}
        </p>
        <CategoryDonut
          expenses={everydayMonth}
          month={month === ALL ? "all" : selectedMonth}
          centerLabel={month === ALL ? "All time" : monthLabel(selectedMonth)}
          showBars
        />
        <p className="mt-3 text-center text-xs text-muted">
          {month === ALL ? "Household everyday total" : "Household everyday total"} {formatInr(total)}
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-cream p-4 shadow-soft">
        <h2 className="text-sm font-medium">How you paid</h2>
        <p className="mt-0.5 text-xs text-muted">
          UPI, online, cards, and cash for {month === ALL ? "the full ledger" : monthLabel(selectedMonth)}
        </p>
        <div className="mt-2 overflow-hidden">
          <PaymentModeChart expenses={everydayMonth} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Link to="/budgets" className="rounded-xl bg-terra/90 p-4 text-cream">
          <p className="text-xs opacity-80">Caps</p>
          <p className="mt-6 font-display text-lg leading-snug">No minimum. Set a limit.</p>
          <p className="mt-3 text-xs underline-offset-2">Explore</p>
        </Link>
        <Link to="/investments" className="rounded-xl bg-sage-deep p-4 text-cream">
          <p className="text-xs opacity-80">Invest</p>
          <p className="mt-3 text-sm font-medium leading-snug">Stock, MF, LIC, FD, gold, NPS</p>
          <span className="mt-4 inline-block rounded-pill bg-ink px-2.5 py-1 text-[10px]">Open book</span>
        </Link>
      </div>

      <div className="mt-7">
        <h2 className="text-base font-medium">Your spending goals</h2>
        <div className="mt-3 flex gap-3 overflow-x-auto keep-hide-scroll pb-1">
          <Link
            to="/add"
            className="flex min-w-16 flex-col items-center gap-2"
          >
            <span className="grid size-12 place-items-center rounded-full bg-cream shadow-soft">
              <Plus className="size-5" />
            </span>
            <span className="text-[11px] text-muted">Create</span>
          </Link>
          {GOAL_PRESETS.map((g) => {
            const Icon = ICONS[g.icon];
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setCategory(g.id)}
                className="flex min-w-16 flex-col items-center gap-2"
              >
                <span className="grid size-12 place-items-center rounded-full bg-cream shadow-soft">
                  <Icon className="size-5 text-ink" strokeWidth={1.7} />
                </span>
                <span className="text-[11px] text-muted">{g.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {familyOn ? (
        <div className="mt-6">
          <p className="text-xs font-medium tracking-wide text-muted">Who spent</p>
          <div className="mt-2 flex gap-2 overflow-x-auto keep-hide-scroll pb-1">
            <button
              type="button"
              onClick={() => setMemberId("all")}
              className={`rounded-pill px-3 py-1.5 text-xs ${memberId === "all" ? "bg-ink text-cream" : "bg-cream text-muted"}`}
            >
              Everyone
            </button>
            {data.members.map((m) => (
              <button
                key={m.userId}
                type="button"
                onClick={() => setMemberId(m.userId)}
                className={`whitespace-nowrap rounded-pill px-3 py-1.5 text-xs ${memberId === m.userId ? "bg-ink text-cream" : "bg-cream text-muted"}`}
              >
                {m.displayName}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex gap-2 overflow-x-auto keep-hide-scroll pb-1">
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={`rounded-pill px-3 py-1.5 text-xs ${category === "all" ? "bg-ink text-cream" : "bg-cream text-muted"}`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`whitespace-nowrap rounded-pill px-3 py-1.5 text-xs ${category === c.id ? "bg-ink text-cream" : "bg-cream text-muted"}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <h2 className="mt-5 text-base font-medium">
        {month === ALL ? "This month" : monthLabel(selectedMonth)}
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {filtered.map((e) => (
          <li key={e.id}>
            <ExpenseRow expense={e} members={data.members} />
          </li>
        ))}
        {filtered.length === 0 ? (
          <li className="rounded-xl bg-cream px-4 py-6 text-center text-sm text-muted">Nothing in this filter.</li>
        ) : null}
      </ul>

      <section className="mt-8" id="all-transactions">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-medium">All transactions</h2>
            <p className="mt-0.5 text-xs text-muted">Every payment from the first log — not just the last two years.</p>
          </div>
          <p className="shrink-0 text-xs tabular-nums text-muted">{historyRows.length}</p>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto keep-hide-scroll pb-1">
          <button
            type="button"
            onClick={() => setHistoryMonth(ALL)}
            className={`rounded-pill px-3 py-1.5 text-xs ${historyMonth === ALL ? "bg-ink text-cream" : "bg-cream text-muted"}`}
          >
            All
          </button>
          {[...monthKeys].reverse().map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setHistoryMonth(key)}
              className={`whitespace-nowrap rounded-pill px-3 py-1.5 text-xs ${historyMonth === key ? "bg-ink text-cream" : "bg-cream text-muted"}`}
            >
              {monthLabel(key)}
            </button>
          ))}
        </div>
        {historyGroups.length === 0 ? (
          <p className="mt-3 rounded-xl bg-cream px-4 py-6 text-center text-sm text-muted">No payments on the ledger yet.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-5">
            {historyGroups.map((group) => {
              const sum = group.items.reduce((s, e) => s + e.amount, 0);
              return (
                <div key={group.key}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <h3 className="text-sm font-medium">{monthLabel(group.key)}</h3>
                    <p className="text-xs tabular-nums text-muted">
                      {group.items.length} · {formatInr(sum)}
                    </p>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {group.items.map((e) => (
                      <li key={e.id}>
                        <ExpenseRow expense={e} members={data.members} />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function ExpenseRow({
  expense: e,
  members,
}: {
  expense: Expense;
  members: Member[];
}) {
  return (
    <Link
      to="/add"
      search={{ type: "expense", id: e.id }}
      className="keep-lift flex items-center gap-3 rounded-xl bg-cream px-3.5 py-3 shadow-soft"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {e.reason || displaySub(e.subcategory, e.subcategoryOther)}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted">
          <span>{formatDay(e.occurredOn)}</span>
          <span>·</span>
          <span>{e.category}</span>
          <span>·</span>
          <span>{displayPerson(e.forWhom, e.forWhomOther)}</span>
          {e.tripName ? (
            <>
              <span>·</span>
              <span>{e.tripName}</span>
            </>
          ) : null}
        </span>
        <span className="mt-1 block text-xs text-muted">
          Spent by <MemberChip name={spenderName(e, members)} />
        </span>
      </span>
      <span className="text-right">
        <span className="block text-sm font-medium tabular-nums">{formatInr(e.amount)}</span>
        <Badge className="mt-1">{e.paymentMode}</Badge>
      </span>
    </Link>
  );
}