import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppGate } from "@/components/app-gate";
import { InvestDonut } from "@/components/charts";
import { Badge } from "@/components/ui";
import { displaySub, formatInr, INVESTMENT_KINDS, monthKey } from "@/lib/keep";
import { useKeep } from "@/lib/use-keep";

export const Route = createFileRoute("/investments")({ component: Page });

function Page() {
  return (
    <AppGate>
      <Body />
    </AppGate>
  );
}

function Body() {
  const { data } = useKeep();
  if (!data?.household) return null;
  const month = monthKey();
  const byKind = INVESTMENT_KINDS.map((k) => ({
    kind: k.id,
    amount: data.investments.filter((i) => i.kind === k.id).reduce((s, i) => s + i.amount, 0),
  }));
  const total = data.investments.reduce((s, i) => s + i.amount, 0);
  const thisMonth = data.investments
    .filter((i) => i.investedOn.startsWith(month))
    .reduce((s, i) => s + i.amount, 0);

  return (
    <div className="px-5 pb-8 pt-6">
      <header className="flex items-center justify-between">
        <Link to="/" className="grid size-10 place-items-center rounded-full bg-cream shadow-soft" aria-label="Back">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-display text-xl font-medium">Investments</h1>
        <Link to="/add" search={{ type: "investment" }} className="text-sm text-muted">
          Add
        </Link>
      </header>
      <p className="mt-2 text-sm text-muted">
        Stock, MF, LIC, FD, gold, bonds, real estate, NPS, PF — plus Others when it does not fit.
      </p>
      <div className="mt-4 rounded-xl bg-cream p-4 shadow-soft">
        <InvestDonut items={byKind} />
        <div className="mt-2 grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-xs text-muted">Book value</p>
            <p className="font-display text-lg tabular-nums">{formatInr(total, { compact: true })}</p>
          </div>
          <div>
            <p className="text-xs text-muted">This month</p>
            <p className="font-display text-lg tabular-nums">{formatInr(thisMonth)}</p>
          </div>
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {byKind
          .filter((k) => k.amount > 0)
          .map((k) => (
            <Badge key={k.kind} tone="sage">
              {k.kind} · {formatInr(k.amount, { compact: true })}
            </Badge>
          ))}
      </ul>
      <ul className="mt-5 flex flex-col gap-2">
        {data.investments.map((i) => (
          <li key={i.id}>
            <Link
              to="/add"
              search={{ type: "investment", id: i.id }}
              className="flex items-center gap-3 rounded-xl bg-cream px-3.5 py-3 shadow-soft"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{i.name || i.kind}</span>
                <span className="block text-xs text-muted">
                  {i.investedOn} · {i.kind} / {displaySub(i.subcategory, i.subcategoryOther)}
                  {i.institution ? ` · ${i.institution}` : ""}
                </span>
              </span>
              <span className="text-sm font-medium tabular-nums">{formatInr(i.amount)}</span>
            </Link>
          </li>
        ))}
        {data.investments.length === 0 ? (
          <li className="rounded-xl bg-cream px-4 py-6 text-center text-sm text-muted">
            No investments yet. Add a SIP, FD, or gold lot from +.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
