import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppGate } from "@/components/app-gate";
import { Button, Field, Input } from "@/components/ui";
import { CATEGORIES, formatInr, monthKey, withoutTrips } from "@/lib/keep";
import { saveBudget, saveMonthlyLimit } from "@/lib/server/keep";
import { useKeep } from "@/lib/use-keep";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/budgets")({ component: Page });

function Page() {
  return (
    <AppGate>
      <Body />
    </AppGate>
  );
}

function Body() {
  const month = monthKey();
  const { data } = useKeep(month);
  const qc = useQueryClient();
  const [overall, setOverall] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (!data?.household) return null;

  const spentBy: Record<string, number> = {};
  const everyday = withoutTrips(data.expenses.filter((x) => x.occurredOn.startsWith(month)));
  for (const e of everyday) {
    spentBy[e.category] = (spentBy[e.category] ?? 0) + e.amount;
  }
  const monthSpend = Object.values(spentBy).reduce((s, n) => s + n, 0);
  const tripSpend = data.expenses
    .filter((x) => x.occurredOn.startsWith(month) && x.tripId != null)
    .reduce((s, e) => s + e.amount, 0);

  async function saveCap(category: string, raw: string) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    await saveBudget({ data: { category, limitAmount: n } });
    await qc.invalidateQueries({ queryKey: ["keep-dashboard"] });
    toast("Limit saved. We'll warn you at 80% and 100%.");
  }

  async function saveOverall() {
    const n = Number(overall || data!.household!.monthlyLimit);
    await saveMonthlyLimit({ data: { amount: n } });
    await qc.invalidateQueries({ queryKey: ["keep-dashboard"] });
    toast("Monthly household cap updated");
  }

  return (
    <div className="px-5 pb-8 pt-6">
      <header className="flex items-center justify-between">
        <Link to="/" className="grid size-10 place-items-center rounded-full bg-cream shadow-soft" aria-label="Back">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-display text-xl font-medium">Limits</h1>
        <span className="w-10" />
      </header>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Cap any everyday category. Trip money is not counted here — set a budget on each trip instead.
      </p>

      <div className="mt-5 rounded-xl bg-night p-4 text-on-night">
        <p className="text-xs text-on-night-muted">Household monthly cap · everyday</p>
        <p className="mt-1 font-display text-2xl tabular-nums">
          {formatInr(monthSpend)}
          <span className="text-base text-on-night-muted"> / {formatInr(data.household.monthlyLimit)}</span>
        </p>
        {tripSpend > 0 ? (
          <p className="mt-1 text-xs text-on-night-muted">Trips this month {formatInr(tripSpend)} · not in this cap</p>
        ) : null}
        <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-night-3">
          <div
            className="h-full rounded-pill bg-sage"
            style={{
              width: `${Math.min(100, (monthSpend / Math.max(data.household.monthlyLimit, 1)) * 100)}%`,
            }}
          />
        </div>
        {data.household.role === "owner" ? (
          <div className="mt-4 flex gap-2">
            <Input
              className="bg-night-2 text-on-night border-night-3"
              inputMode="decimal"
              placeholder="New overall cap"
              value={overall}
              onChange={(e) => setOverall(e.target.value)}
            />
            <Button variant="night" onClick={() => void saveOverall()}>
              Save
            </Button>
          </div>
        ) : null}
      </div>

      <ul className="mt-5 flex flex-col gap-3">
        {CATEGORIES.filter((c) => c.id !== "Others").map((c) => {
          const budget = data.budgets.find((b) => b.category === c.id);
          const spent = spentBy[c.id] ?? 0;
          const limit = budget?.limitAmount ?? 0;
          const pct = limit > 0 ? (spent / limit) * 100 : 0;
          const over = limit > 0 && spent > limit;
          return (
            <li key={c.id} className="rounded-xl bg-cream p-4 shadow-soft">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium">{c.label}</p>
                <p className={`text-sm tabular-nums ${over ? "text-danger" : "text-ink"}`}>
                  {formatInr(spent)}
                  {limit > 0 ? <span className="text-muted"> / {formatInr(limit)}</span> : null}
                </p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-paper-2">
                <div
                  className={`h-full rounded-pill ${over ? "bg-danger" : pct >= 80 ? "bg-mustard" : "bg-sage"}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <div className="mt-3 flex gap-2">
                <Field label="Monthly limit (₹)">
                  <Input
                    inputMode="decimal"
                    value={drafts[c.id] ?? (limit ? String(limit) : "")}
                    onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                    placeholder="No cap"
                  />
                </Field>
                <Button
                  className="mt-5 shrink-0"
                  variant="secondary"
                  onClick={() => void saveCap(c.id, drafts[c.id] ?? String(limit))}
                >
                  Set
                </Button>
              </div>
              {over ? (
                <p className="mt-2 text-xs text-danger">Overspent by {formatInr(spent - limit)} this month.</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
