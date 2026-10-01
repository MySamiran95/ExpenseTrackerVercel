import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button, DateField, Field, Input, Select, Textarea } from "@/components/ui";
import {
  CATEGORIES,
  FOR_WHOM,
  FROM_WHOM,
  INVESTMENT_KINDS,
  PAYMENT_MODES,
  formatInr,
  investSubsFor,
  subsFor,
  todayIso,
  whomChoices,
  type Budget,
  type Expense,
  type Investment,
  type Member,
  type Trip,
} from "@/lib/keep";
import { saveExpense, saveInvestment } from "@/lib/server/keep";

function capFor(category: string, budgets: Budget[]) {
  const hit = budgets.find((b) => b.category === category && b.limitAmount > 0);
  return hit?.limitAmount ?? 0;
}

export function ExpenseForm({
  initial,
  budgets = [],
  spentByCategory = {},
  members = [],
  trips = [],
  presetTripId,
  currentUserId,
  onSaved,
}: {
  initial?: Expense | null;
  budgets?: Budget[];
  spentByCategory?: Record<string, number>;
  members?: Member[];
  trips?: Trip[];
  presetTripId?: number;
  currentUserId?: string;
  onSaved?: () => void;
}) {
  const navigate = useNavigate();
  const [occurredOn, setOccurredOn] = useState(initial?.occurredOn ?? todayIso());
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0]!.id);
  const [subcategory, setSubcategory] = useState(initial?.subcategory ?? subsFor(CATEGORIES[0]!.id)[0]!);
  const [subcategoryOther, setSubcategoryOther] = useState(initial?.subcategoryOther ?? "");
  const [forWhom, setForWhom] = useState(initial?.forWhom ?? "Self");
  const [forWhomOther, setForWhomOther] = useState(initial?.forWhomOther ?? "");
  const [fromWhom, setFromWhom] = useState(initial?.fromWhom ?? "Self");
  const [fromWhomOther, setFromWhomOther] = useState(initial?.fromWhomOther ?? "");
  const [paymentMode, setPaymentMode] = useState(initial?.paymentMode ?? "UPI");
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [spentByUserId, setSpentByUserId] = useState(
    initial?.userId ?? currentUserId ?? members[0]?.userId ?? "",
  );
  const [tripId, setTripId] = useState(
    initial?.tripId ? String(initial.tripId) : presetTripId ? String(presetTripId) : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ackOver, setAckOver] = useState(false);

  const subs = useMemo(() => subsFor(category), [category]);
  const selectedTrip = trips.find((t) => String(t.id) === tripId) ?? null;
  const isTripSpend = Boolean(tripId && selectedTrip);
  const tripLimit = selectedTrip?.budgetLimit ?? 0;
  const tripAlready = selectedTrip
    ? Math.max(0, selectedTrip.total - (initial?.tripId === selectedTrip.id ? initial.amount : 0))
    : 0;
  const adding = Number(amount);
  const addAmt = Number.isFinite(adding) && adding > 0 ? adding : 0;
  const tripProjected = tripAlready + addAmt;
  const tripAlreadyOver = tripLimit > 0 && tripAlready >= tripLimit;
  const tripWouldCross = tripLimit > 0 && !tripAlreadyOver && addAmt > 0 && tripProjected > tripLimit;
  const tripOver = isTripSpend && tripLimit > 0 && (tripAlreadyOver || tripWouldCross);

  const limit = isTripSpend ? 0 : capFor(category, budgets);
  const alreadySpent = Math.max(
    0,
    (spentByCategory[category] ?? 0) - (initial && initial.category === category ? initial.amount : 0),
  );
  const projected = alreadySpent + addAmt;
  const alreadyOver = limit > 0 && alreadySpent >= limit;
  const wouldCross = limit > 0 && !alreadyOver && addAmt > 0 && projected > limit;
  const overCap = tripOver || alreadyOver || wouldCross;
  const familyOn = members.length > 1;
  const spenders = useMemo(() => {
    const list = members.slice();
    if (initial?.userId && !list.some((m) => m.userId === initial.userId)) {
      list.push({
        userId: initial.userId,
        displayName: initial.recorderName?.trim() || "Former member",
        role: "member",
        spentThisMonth: 0,
      });
    }
    return list;
  }, [members, initial?.userId, initial?.recorderName]);
  const forWhomOptions = useMemo(
    () => whomChoices(FOR_WHOM, members, { currentUserId, extra: initial?.forWhom }),
    [members, currentUserId, initial?.forWhom],
  );
  const fromWhomOptions = useMemo(
    () => whomChoices(FROM_WHOM, members, { currentUserId, extra: initial?.fromWhom }),
    [members, currentUserId, initial?.fromWhom],
  );

  const amountOk = Number.isFinite(Number(amount)) && Number(amount) > 0;
  const reasonOk = reason.trim().length > 0;
  const subOk = subcategory !== "Others" || subcategoryOther.trim().length > 0;
  const forOk = forWhom !== "Others" || forWhomOther.trim().length > 0;
  const fromOk = fromWhom !== "Others" || fromWhomOther.trim().length > 0;
  const complete = amountOk && reasonOk && subOk && forOk && fromOk && Boolean(category && subcategory && forWhom && fromWhom && paymentMode && occurredOn);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter an amount in rupees");
      return;
    }
    if (!reason.trim()) {
      setError("Add a reason before saving");
      return;
    }
    if (subcategory === "Others" && !subcategoryOther.trim()) {
      setError("Describe the other subcategory");
      return;
    }
    if (forWhom === "Others" && !forWhomOther.trim()) {
      setError("Say who this was for");
      return;
    }
    if (fromWhom === "Others" && !fromWhomOther.trim()) {
      setError("Say who this came from");
      return;
    }
    if (overCap && !ackOver) {
      setAckOver(true);
      if (isTripSpend && selectedTrip && tripLimit > 0) {
        setError(
          tripAlreadyOver
            ? `${selectedTrip.name} has already crossed its ${formatInr(tripLimit)} trip budget. Save again if you still want to spend.`
            : `This will push ${selectedTrip.name} over its ${formatInr(tripLimit)} trip budget. Save again to record it anyway.`,
        );
      } else {
        setError(
          alreadyOver
            ? `${category} has already crossed its ${formatInr(limit)} limit. Save again if you still want to spend.`
            : `This will push ${category} over its ${formatInr(limit)} limit. Save again to record it anyway.`,
        );
      }
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveExpense({
        data: {
          id: initial?.id,
          occurredOn,
          category,
          subcategory,
          subcategoryOther: subcategory === "Others" ? subcategoryOther : null,
          forWhom,
          forWhomOther: forWhom === "Others" ? forWhomOther : null,
          fromWhom,
          fromWhomOther: fromWhom === "Others" ? fromWhomOther : null,
          paymentMode,
          reason,
          amount: n,
          spentByUserId: spentByUserId || undefined,
          tripId: tripId ? Number(tripId) : null,
        },
      });
      toast(
        tripOver
          ? `Saved — ${selectedTrip?.name ?? "trip"} is over its budget`
          : overCap
            ? `Saved — ${category} is over its limit`
            : "Expense saved",
      );
      onSaved?.();
      void navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
      <Field label="Amount (₹)">
        <Input
          inputMode="decimal"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setAckOver(false);
          }}
          placeholder="0.00"
          className="font-display text-lg tabular-nums"
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <DateField value={occurredOn} onChange={setOccurredOn} max={todayIso()} />
        </Field>
        <Field label="Payment">
          <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {familyOn ? (
        <Field label="Who spent this">
          <Select value={spentByUserId} onChange={(e) => setSpentByUserId(e.target.value)}>
            {spenders.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.displayName}
                {m.userId === currentUserId ? " (you)" : ""}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      {trips.length > 0 ? (
        <Field label="Trip">
          <Select
            value={tripId}
            onChange={(e) => {
              setTripId(e.target.value);
              setAckOver(false);
            }}
          >
            <option value="">None — regular spend</option>
            {trips.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      {isTripSpend && selectedTrip ? (
        tripLimit > 0 ? (
          <p className="text-xs text-muted">
            {formatInr(tripAlready)} of {formatInr(tripLimit)} used on {selectedTrip.name}
            {addAmt > 0
              ? ` · ${formatInr(Math.max(0, tripLimit - tripProjected))} pending after this`
              : ` · ${formatInr(Math.max(0, tripLimit - tripAlready))} pending`}
          </p>
        ) : (
          <p className="text-xs text-muted">
            Trip spend stays off everyday category limits. Set a trip budget on Trips to track how much is pending.
          </p>
        )
      ) : null}
      <Field label="Category">
        <Select
          value={category}
          onChange={(e) => {
            const next = e.target.value;
            setCategory(next);
            setSubcategory(subsFor(next)[0] ?? "Others");
            setAckOver(false);
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      {limit > 0 && !isTripSpend ? (
        <p className="text-xs text-muted">
          {formatInr(alreadySpent)} of {formatInr(limit)} used in {category} this month
          {addAmt > 0 ? ` · ${formatInr(projected)} after this` : ""}
        </p>
      ) : null}
      {overCap ? (
        <div className="flex gap-3 rounded-xl bg-danger/10 px-3.5 py-3 text-danger" role="alert">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" strokeWidth={1.8} />
          <p className="text-sm leading-relaxed">
            {isTripSpend && selectedTrip && tripLimit > 0
              ? tripAlreadyOver
                ? `You have already crossed the ${formatInr(tripLimit)} budget for ${selectedTrip.name}. Spending more will go further over.`
                : `This expense crosses the ${formatInr(tripLimit)} budget for ${selectedTrip.name} by ${formatInr(tripProjected - tripLimit)}.`
              : alreadyOver
                ? `You have already crossed the ${formatInr(limit)} limit for ${category}. Spending more will go further over.`
                : `This expense crosses the ${formatInr(limit)} limit for ${category} by ${formatInr(projected - limit)}.`}
          </p>
        </div>
      ) : null}
      <Field label="Subcategory">
        <Select value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
          {subs.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>
      {subcategory === "Others" ? (
        <Field label="Other subcategory">
          <Input value={subcategoryOther} onChange={(e) => setSubcategoryOther(e.target.value)} placeholder="Describe it" />
        </Field>
      ) : null}
      <div className="grid grid-cols-1 gap-3">
        <Field label="For whom">
          <Select value={forWhom} onChange={(e) => setForWhom(e.target.value)}>
            {forWhomOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="From whom">
          <Select value={fromWhom} onChange={(e) => setFromWhom(e.target.value)}>
            {fromWhomOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {forWhom === "Others" ? (
        <Field label="For whom (other)">
          <Input value={forWhomOther} onChange={(e) => setForWhomOther(e.target.value)} />
        </Field>
      ) : null}
      {fromWhom === "Others" ? (
        <Field label="From whom (other)">
          <Input value={fromWhomOther} onChange={(e) => setFromWhomOther(e.target.value)} />
        </Field>
      ) : null}
      <Field label="Reason">
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What was this for?"
          required
        />
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {!complete && !error ? (
        <p className="text-xs leading-relaxed text-muted">
          {!amountOk
            ? "Enter an amount to save."
            : !reasonOk
              ? "Add a reason to save — Keep will not accept a blank note."
              : !subOk
                ? "Describe the other subcategory."
                : !forOk
                  ? "Say who this was for."
                  : !fromOk
                    ? "Say who this came from."
                    : "Fill every field before saving."}
        </p>
      ) : null}
      <Button type="submit" disabled={busy || !complete} variant={overCap ? "danger" : "primary"}>
        {busy ? "Saving…" : overCap && ackOver ? "Save anyway" : initial ? "Update expense" : "Save expense"}
      </Button>
    </form>
  );
}

export function InvestmentForm({
  initial,
  onSaved,
}: {
  initial?: Investment | null;
  onSaved?: () => void;
}) {
  const navigate = useNavigate();
  const [investedOn, setInvestedOn] = useState(initial?.investedOn ?? todayIso());
  const [kind, setKind] = useState(initial?.kind ?? "MF");
  const [subcategory, setSubcategory] = useState(initial?.subcategory ?? investSubsFor("MF")[0]!);
  const [subcategoryOther, setSubcategoryOther] = useState(initial?.subcategoryOther ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [institution, setInstitution] = useState(initial?.institution ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subs = useMemo(() => investSubsFor(kind), [kind]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter an amount in rupees");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await saveInvestment({
        data: {
          id: initial?.id,
          investedOn,
          kind,
          subcategory,
          subcategoryOther: subcategory === "Others" ? subcategoryOther : null,
          name,
          institution,
          amount: n,
          notes,
        },
      });
      toast("Investment saved");
      onSaved?.();
      void navigate({ to: "/investments" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
      <Field label="Amount (₹)">
        <Input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="font-display text-lg tabular-nums"
          required
        />
      </Field>
      <Field label="Date">
        <DateField value={investedOn} onChange={setInvestedOn} max={todayIso()} />
      </Field>
      <Field label="Type">
        <Select
          value={kind}
          onChange={(e) => {
            const next = e.target.value;
            setKind(next);
            setSubcategory(investSubsFor(next)[0] ?? "Others");
          }}
        >
          {INVESTMENT_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Subcategory">
        <Select value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
          {subs.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>
      {subcategory === "Others" ? (
        <Field label="Other subcategory">
          <Input value={subcategoryOther} onChange={(e) => setSubcategoryOther(e.target.value)} />
        </Field>
      ) : null}
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="HDFC Flexi Cap" />
      </Field>
      <Field label="Institution">
        <Input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Bank / AMC / LIC" />
      </Field>
      <Field label="Notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Folio, lock-in, reason" />
      </Field>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : initial ? "Update investment" : "Save investment"}
      </Button>
    </form>
  );
}
