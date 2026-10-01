import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppGate } from "@/components/app-gate";
import { ExpenseForm, InvestmentForm } from "@/components/expense-form";
import { Button } from "@/components/ui";
import { monthKey } from "@/lib/keep";
import { deleteExpense, deleteInvestment } from "@/lib/server/keep";
import { useKeep } from "@/lib/use-keep";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

type AddSearch = {
  type?: "expense" | "investment";
  id?: number;
  trip?: number;
};

export const Route = createFileRoute("/add")({
  validateSearch: (s: Record<string, unknown>): AddSearch => {
    const type = s.type === "investment" || s.type === "expense" ? s.type : undefined;
    const raw = s.id;
    const id = raw == null || raw === "" ? undefined : Number(raw);
    const tripRaw = s.trip;
    const trip = tripRaw == null || tripRaw === "" ? undefined : Number(tripRaw);
    return {
      type,
      id: Number.isFinite(id) ? id : undefined,
      trip: Number.isFinite(trip) ? trip : undefined,
    };
  },
  component: Page,
});

function Page() {
  return (
    <AppGate nav={false}>
      <Body />
    </AppGate>
  );
}

function Body() {
  const { type, id, trip } = Route.useSearch();
  const { data } = useKeep();
  const { user } = useCurrentUserState();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const initialExpense = id && data ? data.expenses.find((e) => e.id === id) : undefined;
  const initialInvest = id && data ? data.investments.find((i) => i.id === id) : undefined;
  const [tab, setTab] = useState<"expense" | "investment">(
    type ?? (initialInvest ? "investment" : "expense"),
  );
  const month = monthKey();
  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    if (!data) return map;
    for (const e of data.expenses) {
      if (!e.occurredOn.startsWith(month)) continue;
      if (e.tripId) continue;
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    }
    return map;
  }, [data, month]);

  async function remove() {
    if (tab === "expense" && initialExpense) {
      await deleteExpense({ data: { id: initialExpense.id } });
      await qc.invalidateQueries({ queryKey: ["keep-dashboard"] });
      void navigate({ to: "/expenses" });
    }
    if (tab === "investment" && initialInvest) {
      await deleteInvestment({ data: { id: initialInvest.id } });
      await qc.invalidateQueries({ queryKey: ["keep-dashboard"] });
      void navigate({ to: "/investments" });
    }
  }

  return (
    <div className="px-5 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <Link to="/" className="grid size-10 place-items-center rounded-full bg-cream shadow-soft" aria-label="Back">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-display text-xl font-medium">
          {id ? "Edit" : "Add"} {tab === "expense" ? "expense" : "investment"}
        </h1>
        <span className="w-10" />
      </header>
      <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-paper-2 p-1">
        <button
          type="button"
          className={`h-10 rounded-md text-sm font-medium ${tab === "expense" ? "bg-cream text-ink shadow-soft" : "text-muted"}`}
          onClick={() => setTab("expense")}
        >
          Expense
        </button>
        <button
          type="button"
          className={`h-10 rounded-md text-sm font-medium ${tab === "investment" ? "bg-cream text-ink shadow-soft" : "text-muted"}`}
          onClick={() => setTab("investment")}
        >
          Investment
        </button>
      </div>
      <div className="mt-6">
        {tab === "expense" ? (
          <ExpenseForm
            initial={initialExpense}
            budgets={data?.budgets ?? []}
            spentByCategory={spentByCategory}
            members={data?.members ?? []}
            trips={data?.trips ?? []}
            presetTripId={trip}
            currentUserId={user?.id}
            onSaved={() => void qc.invalidateQueries({ queryKey: ["keep-dashboard"] })}
          />
        ) : (
          <InvestmentForm
            initial={initialInvest}
            onSaved={() => void qc.invalidateQueries({ queryKey: ["keep-dashboard"] })}
          />
        )}
      </div>
      {id ? (
        <Button variant="ghost" className="mt-4 w-full text-danger" onClick={() => void remove()}>
          Delete
        </Button>
      ) : null}
    </div>
  );
}
