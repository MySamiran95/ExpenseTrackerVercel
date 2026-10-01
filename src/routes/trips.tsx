import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppGate } from "@/components/app-gate";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { displaySub, formatDay, formatInr, type Trip } from "@/lib/keep";
import { clearTripExpenses, deleteTrip, saveTrip, setExpenseTrip } from "@/lib/server/keep";
import { useKeep } from "@/lib/use-keep";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/trips")({ component: Page });

function Page() {
  return (
    <AppGate>
      <Body />
    </AppGate>
  );
}

function Body() {
  const { data } = useKeep();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  if (!data?.household) return null;

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["keep-dashboard"] });
  }

  return (
    <div className="overflow-x-hidden px-5 pb-8 pt-6">
      <header className="flex items-center justify-between">
        <Link to="/" className="grid size-10 place-items-center rounded-full bg-cream shadow-soft" aria-label="Back">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-display text-xl font-medium">Trips</h1>
        <span className="w-10" />
      </header>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Tag spend to a trip and give the trip its own budget. Trip money is included in Home totals, but it never counts against everyday category limits.
      </p>

      <ul className="mt-5 flex flex-col gap-3">
        {data.trips.map((trip) => (
          <li key={trip.id} className="rounded-xl bg-cream p-4 shadow-soft">
            <button type="button" className="w-full text-left" onClick={() => setOpenId(openId === trip.id ? null : trip.id)}>
              <span className="block text-sm font-medium">{trip.name}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted">
                {trip.startedOn ? formatDay(trip.startedOn) : "Open dates"}
                {trip.endedOn ? ` – ${formatDay(trip.endedOn)}` : ""}
              </span>
              <span className="mt-1 block text-sm font-medium tabular-nums">{formatInr(trip.total)} spent</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                {trip.budgetLimit > 0
                  ? `${formatInr(trip.budgetLimit)} budget · ${formatInr(Math.max(0, trip.budgetLimit - trip.total))} pending`
                  : `${trip.count} ${trip.count === 1 ? "entry" : "entries"}`}
              </span>
            </button>
            {openId === trip.id ? (
              <TripDetail
                trip={trip}
                expenses={data.expenses.filter((e) => e.tripId === trip.id)}
                onChanged={refresh}
              />
            ) : null}
          </li>
        ))}
      </ul>

      {adding ? (
        <TripForm
          onCancel={() => setAdding(false)}
          onSaved={async () => {
            setAdding(false);
            await refresh();
          }}
        />
      ) : (
        <Button className="mt-5 w-full" variant="secondary" onClick={() => setAdding(true)}>
          New trip
        </Button>
      )}
    </div>
  );
}

function TripDetail({
  trip,
  expenses,
  onChanged,
}: {
  trip: Trip;
  expenses: { id: number; occurredOn: string; amount: number; reason: string; subcategory: string; subcategoryOther: string | null }[];
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="mt-4 border-t border-line pt-3">
      {editing ? (
        <TripForm
          trip={trip}
          onCancel={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            await onChanged();
          }}
        />
      ) : (
        <>
          {trip.notes ? <p className="mb-3 text-sm text-muted">{trip.notes}</p> : null}
          {trip.budgetLimit > 0 ? (
            <div className="mb-3">
              <p className="text-sm">Trip budget</p>
              <p className={`mt-1 text-sm tabular-nums ${trip.total > trip.budgetLimit ? "text-danger" : "text-muted"}`}>
                {formatInr(trip.total)} spent
              </p>
              <p className="mt-0.5 text-xs tabular-nums text-muted">{formatInr(trip.budgetLimit)} budget</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-paper-2">
                <div
                  className={`h-full rounded-pill ${trip.total > trip.budgetLimit ? "bg-danger" : trip.total / trip.budgetLimit >= 0.8 ? "bg-mustard" : "bg-sage"}`}
                  style={{ width: `${Math.min(100, (trip.total / Math.max(trip.budgetLimit, 1)) * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {trip.total > trip.budgetLimit
                  ? `${formatInr(trip.total - trip.budgetLimit)} over this trip · everyday category limits are not affected`
                  : `${formatInr(trip.budgetLimit - trip.total)} pending on this trip`}
              </p>
            </div>
          ) : (
            <p className="mb-3 text-xs text-muted">No trip budget yet. Edit details to set one — it stays separate from category limits.</p>
          )}
          {expenses.length === 0 ? (
            <p className="text-sm text-muted">No tagged spend yet. Add an expense and pick this trip.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {expenses.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link to="/add" search={{ type: "expense", id: e.id }} className="min-w-0 truncate">
                    {e.reason || displaySub(e.subcategory, e.subcategoryOther)}
                    <span className="ml-2 text-xs text-muted">{formatDay(e.occurredOn)}</span>
                  </Link>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="tabular-nums">{formatInr(e.amount)}</span>
                    <button
                      type="button"
                      className="text-xs text-muted underline underline-offset-2"
                      onClick={async () => {
                        await setExpenseTrip({ data: { expenseId: e.id, tripId: null } });
                        toast("Moved back to everyday spend");
                        await onChanged();
                      }}
                    >
                      Untag
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            <Link
              to="/add"
              search={{ type: "expense", trip: trip.id }}
              className="text-sm underline underline-offset-4"
            >
              Add spend to this trip
            </Link>
            <button type="button" className="text-sm underline underline-offset-4" onClick={() => setEditing(true)}>
              Edit details
            </button>
          </div>
          {expenses.length > 0 ? (
            <button
              type="button"
              className="mt-3 block text-xs text-muted"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await clearTripExpenses({ data: { id: trip.id } });
                  toast("All expenses moved back to everyday spend");
                  await onChanged();
                } finally {
                  setBusy(false);
                }
              }}
            >
              Untag all from this trip
            </button>
          ) : null}
          <button
            type="button"
            className="mt-3 block text-xs text-danger"
            onClick={async () => {
              await deleteTrip({ data: { id: trip.id } });
              toast("Trip removed — expenses stay in the ledger");
              await onChanged();
            }}
          >
            Delete trip
          </button>
        </>
      )}
    </div>
  );
}

function TripForm({
  trip,
  onSaved,
  onCancel,
}: {
  trip?: Trip;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(trip?.name ?? "");
  const [startedOn, setStartedOn] = useState(trip?.startedOn ?? "");
  const [endedOn, setEndedOn] = useState(trip?.endedOn ?? "");
  const [notes, setNotes] = useState(trip?.notes ?? "");
  const [budget, setBudget] = useState(trip?.budgetLimit ? String(trip.budgetLimit) : "");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className={trip ? "mt-2" : "mt-5 rounded-xl bg-cream p-4 shadow-soft"}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await saveTrip({
            data: {
              id: trip?.id,
              name,
              startedOn: startedOn || null,
              endedOn: endedOn || null,
              notes,
              budgetLimit: Number.isFinite(Number(budget)) && Number(budget) > 0 ? Number(budget) : 0,
            },
          });
          toast(trip ? "Trip updated" : "Trip saved");
          await onSaved();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Could not save");
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Trip name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Goa weekend" required />
      </Field>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Start">
          <Input type="date" value={startedOn} onChange={(e) => setStartedOn(e.target.value)} />
        </Field>
        <Field label="End">
          <Input type="date" value={endedOn} onChange={(e) => setEndedOn(e.target.value)} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Trip budget (₹)">
          <Input
            inputMode="decimal"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Separate from category limits"
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={busy} className="flex-1">
          {busy ? "Saving…" : trip ? "Update trip" : "Save trip"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
