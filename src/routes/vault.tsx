import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CreditCard as CardIcon, Eye, EyeOff, IdCard, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppGate } from "@/components/app-gate";
import { Button, Field, Input, Select } from "@/components/ui";
import {
  CARD_NETWORKS,
  formatCardExpiry,
  formatCardNumber,
  formatInr,
  ID_KINDS,
  identityLabel,
  type IdentityDoc,
  type PaymentCard,
} from "@/lib/keep";
import { deleteIdentityDoc, deletePaymentCard, getVault, saveIdentityDoc, savePaymentCard } from "@/lib/server/keep";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vault")({ component: Page });

function Page() {
  return (
    <AppGate nav={false}>
      <Body />
    </AppGate>
  );
}

function Body() {
  const qc = useQueryClient();
  const vault = useQuery({
    queryKey: ["keep-vault"],
    queryFn: () => getVault(),
  });
  const [tab, setTab] = useState<"ids" | "cards">("ids");
  const docs = vault.data?.docs ?? [];
  const cards = vault.data?.cards ?? [];

  return (
    <div className="px-5 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <Link to="/settings" className="grid size-10 place-items-center rounded-full bg-cream shadow-soft" aria-label="Back">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-display text-xl font-medium">Wallet</h1>
        <span className="w-10" />
      </header>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        IDs and cards stay on your account. Family members never see them — not even in Family sharing.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-paper-2 p-1">
        <button
          type="button"
          className={cn("h-10 rounded-md text-sm font-medium", tab === "ids" ? "bg-cream text-ink shadow-soft" : "text-muted")}
          onClick={() => setTab("ids")}
        >
          IDs
        </button>
        <button
          type="button"
          className={cn("h-10 rounded-md text-sm font-medium", tab === "cards" ? "bg-cream text-ink shadow-soft" : "text-muted")}
          onClick={() => setTab("cards")}
        >
          Cards
        </button>
      </div>

      {vault.isPending ? (
        <p className="mt-6 text-sm text-muted">Loading your wallet…</p>
      ) : tab === "ids" ? (
        <IdentityPanel
          docs={docs}
          onSaved={async () => {
            await qc.invalidateQueries({ queryKey: ["keep-vault"] });
          }}
        />
      ) : (
        <CardsPanel
          cards={cards}
          onSaved={async () => {
            await qc.invalidateQueries({ queryKey: ["keep-vault"] });
          }}
        />
      )}
    </div>
  );
}

function IdentityPanel({ docs, onSaved }: { docs: IdentityDoc[]; onSaved: () => Promise<void> }) {
  const [adding, setAdding] = useState(docs.length === 0);
  return (
    <div className="mt-5 flex flex-col gap-4">
      {docs.map((doc) => (
        <SavedId key={doc.id} doc={doc} onSaved={onSaved} />
      ))}
      {adding ? (
        <IdForm
          onCancel={() => setAdding(false)}
          onSaved={async () => {
            setAdding(false);
            await onSaved();
          }}
        />
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          Add an ID
        </Button>
      )}
    </div>
  );
}

function SavedId({ doc, onSaved }: { doc: IdentityDoc; onSaved: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  return (
    <article className="rounded-xl bg-cream p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-full bg-paper-2 text-sage-deep">
            <IdCard className="size-4" strokeWidth={1.7} />
          </span>
          <div>
            <p className="text-sm font-medium">{identityLabel(doc.kind, doc.label)}</p>
            <p className="text-xs text-muted">{doc.holderName}</p>
          </div>
        </div>
        <button type="button" className="text-xs text-muted" onClick={() => setOpen((v) => !v)}>
          {open ? "Close" : "Edit"}
        </button>
      </div>
      {open ? (
        <IdForm initial={doc} onCancel={() => setOpen(false)} onSaved={onSaved} />
      ) : (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wider text-muted">Number</p>
          <p className="mt-0.5 font-mono text-sm tabular-nums">{doc.number}</p>
          {doc.extra.dob ? <p className="mt-2 text-xs text-muted">DOB {doc.extra.dob}</p> : null}
          {doc.extra.expiry ? <p className="mt-1 text-xs text-muted">Valid till {doc.extra.expiry}</p> : null}
          {doc.extra.notes ? <p className="mt-1 text-xs text-muted">{doc.extra.notes}</p> : null}
          <Button
            variant="ghost"
            className="mt-3 h-9 px-0 text-danger"
            onClick={async () => {
              await deleteIdentityDoc({ data: { id: doc.id } });
              toast("Removed");
              await onSaved();
            }}
          >
            <Trash2 className="size-3.5" />
            Remove
          </Button>
        </div>
      )}
    </article>
  );
}

function IdForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: IdentityDoc;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState(initial?.kind ?? "aadhaar");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [holderName, setHolderName] = useState(initial?.holderName ?? "");
  const [number, setNumber] = useState(initial?.number ?? "");
  const [dob, setDob] = useState(initial?.extra.dob ?? "");
  const [expiry, setExpiry] = useState(initial?.extra.expiry ?? "");
  const [notes, setNotes] = useState(initial?.extra.notes ?? "");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const extra: Record<string, string> = {};
      if (dob) extra.dob = dob;
      if (expiry) extra.expiry = expiry;
      if (notes) extra.notes = notes;
      await saveIdentityDoc({
        data: {
          id: initial?.id,
          kind,
          label: kind === "custom" ? label : identityLabel(kind, label),
          holderName,
          number,
          extra,
        },
      });
      toast(initial ? "ID updated" : "ID saved");
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-4 flex flex-col gap-3" onSubmit={(e) => void save(e)}>
      <Field label="Type">
        <Select value={kind} onChange={(e) => setKind(e.target.value)}>
          {ID_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </Select>
      </Field>
      {kind === "custom" ? (
        <Field label="Name this ID">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Employee ID, visa…" required />
        </Field>
      ) : null}
      <Field label="Name as on the document">
        <Input value={holderName} onChange={(e) => setHolderName(e.target.value)} required />
      </Field>
      <Field label="Full number">
        <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Stored in full — not masked" required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date of birth">
          <Input value={dob} onChange={(e) => setDob(e.target.value)} placeholder="DD/MM/YYYY" />
        </Field>
        <Field label="Valid till">
          <Input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="MM/YYYY" />
        </Field>
      </div>
      <Field label="Notes">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Address, file number…" />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="flex-1">
          {busy ? "Saving…" : initial ? "Update" : "Save ID"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function CardsPanel({ cards, onSaved }: { cards: PaymentCard[]; onSaved: () => Promise<void> }) {
  const [adding, setAdding] = useState(cards.length === 0);
  return (
    <div className="mt-5 flex flex-col gap-4">
      {cards.map((card) => (
        <SavedCard key={card.id} card={card} onSaved={onSaved} />
      ))}
      {adding ? (
        <CardForm
          onCancel={() => setAdding(false)}
          onSaved={async () => {
            setAdding(false);
            await onSaved();
          }}
        />
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>
          Add a debit or credit card
        </Button>
      )}
    </div>
  );
}

function SavedCard({ card, onSaved }: { card: PaymentCard; onSaved: () => Promise<void> }) {
  const [showPin, setShowPin] = useState(false);
  const [editing, setEditing] = useState(false);
  const credit = card.cardKind === "credit";
  if (editing) {
    return <CardForm initial={card} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onSaved(); }} />;
  }
  return (
    <article className="rounded-xl bg-cream p-4 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted">
            {credit ? "Credit" : "Debit"} · {card.network}
          </p>
          <p className="mt-1 font-display text-lg">{card.nickname || card.bank}</p>
        </div>
        <CardIcon className="size-5 text-muted" strokeWidth={1.6} />
      </div>
      <p className="mt-4 font-mono text-base tracking-[0.12em] tabular-nums">{formatCardNumber(card.numberFull)}</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted">Bank</p>
          <p>{card.bank}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-muted">Expires</p>
          <p className="tabular-nums">{formatCardExpiry(card.expiryMonth, card.expiryYear)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted">Name</p>
          <p>{card.holderName || "—"}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-muted">PIN</p>
          <p className="flex items-center justify-end gap-1 font-mono tabular-nums">
            {card.pin ? (showPin ? card.pin : "••••") : "—"}
            {card.pin ? (
              <button type="button" className="text-muted" onClick={() => setShowPin((v) => !v)} aria-label="Toggle PIN">
                {showPin ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            ) : null}
          </p>
        </div>
      </div>
      {card.cvv ? <p className="mt-2 text-xs text-muted">CVV {card.cvv}</p> : null}
      {credit && card.creditLimit ? (
        <p className="mt-2 text-xs text-muted">Limit {formatInr(card.creditLimit)}</p>
      ) : null}
      {card.notes ? <p className="mt-2 text-xs text-muted">{card.notes}</p> : null}
      <div className="mt-3 flex gap-4">
        <button type="button" className="text-xs text-muted" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button
          type="button"
          className="text-xs text-danger"
          onClick={async () => {
            await deletePaymentCard({ data: { id: card.id } });
            toast("Card removed");
            await onSaved();
          }}
        >
          Remove
        </button>
      </div>
    </article>
  );
}

function CardForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: PaymentCard;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const [cardKind, setCardKind] = useState<"debit" | "credit">(initial?.cardKind ?? "debit");
  const [nickname, setNickname] = useState(initial?.nickname ?? "");
  const [bank, setBank] = useState(initial?.bank ?? "");
  const [network, setNetwork] = useState<(typeof CARD_NETWORKS)[number]>(
    (CARD_NETWORKS.find((n) => n === initial?.network) ?? "Visa") as (typeof CARD_NETWORKS)[number],
  );
  const [numberFull, setNumberFull] = useState(initial?.numberFull ?? "");
  const [pin, setPin] = useState(initial?.pin ?? "");
  const [cvv, setCvv] = useState(initial?.cvv ?? "");
  const [expiry, setExpiry] = useState(
    initial?.expiryMonth && initial?.expiryYear
      ? `${String(initial.expiryMonth).padStart(2, "0")}/${String(initial.expiryYear).slice(-2)}`
      : "",
  );
  const [creditLimit, setCreditLimit] = useState(initial?.creditLimit ? String(initial.creditLimit) : "");
  const [holderName, setHolderName] = useState(initial?.holderName ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);

  function parseExpiry(value: string): { month: number | null; year: number | null } {
    const m = /^(\d{1,2})\s*\/\s*(\d{2}|\d{4})$/.exec(value.trim());
    if (!m) return { month: null, year: null };
    const month = Number(m[1]);
    let year = Number(m[2]);
    if (year < 100) year += 2000;
    if (month < 1 || month > 12) return { month: null, year: null };
    return { month, year };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const digits = numberFull.replace(/\D/g, "");
    if (digits.length < 4) {
      toast.error("Enter the full card number so you can read it back later.");
      return;
    }
    const { month, year } = parseExpiry(expiry);
    setBusy(true);
    try {
      await savePaymentCard({
        data: {
          id: initial?.id,
          cardKind,
          nickname,
          bank,
          network,
          numberFull: digits,
          pin,
          cvv,
          notes,
          expiryMonth: month,
          expiryYear: year,
          creditLimit: cardKind === "credit" && creditLimit ? Number(creditLimit) : null,
          holderName,
        },
      });
      toast(`${cardKind === "credit" ? "Credit" : "Debit"} card saved`);
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="rounded-xl bg-cream p-4 shadow-soft" onSubmit={(e) => void submit(e)}>
      <h2 className="text-sm font-medium">{initial ? "Edit card" : "New card"}</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Stored in full, including PIN, so you can look it up later. Never shared with family.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-paper-2 p-1">
        <button
          type="button"
          className={cn("h-10 rounded-md text-sm font-medium", cardKind === "debit" ? "bg-cream shadow-soft" : "text-muted")}
          onClick={() => setCardKind("debit")}
        >
          Debit
        </button>
        <button
          type="button"
          className={cn("h-10 rounded-md text-sm font-medium", cardKind === "credit" ? "bg-cream shadow-soft" : "text-muted")}
          onClick={() => setCardKind("credit")}
        >
          Credit
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-3">
        <Field label="Bank">
          <Input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="HDFC, SBI, ICICI" required />
        </Field>
        <Field label="Nickname">
          <Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Salary debit / Amazon pay" />
        </Field>
        <Field label="Card number">
          <Input
            inputMode="numeric"
            value={numberFull}
            onChange={(e) => setNumberFull(e.target.value)}
            placeholder="ACCT-000035"
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Network">
            <Select value={network} onChange={(e) => setNetwork(e.target.value as (typeof CARD_NETWORKS)[number])}>
              {CARD_NETWORKS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="PIN">
            <Input
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="ATM / card PIN"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valid thru (MM/YY)">
            <Input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="08/28" />
          </Field>
          <Field label="CVV">
            <Input inputMode="numeric" maxLength={4} value={cvv} onChange={(e) => setCvv(e.target.value)} />
          </Field>
        </div>
        <Field label="Name on card">
          <Input value={holderName} onChange={(e) => setHolderName(e.target.value)} />
        </Field>
        {cardKind === "credit" ? (
          <Field label="Card limit (₹)">
            <Input inputMode="decimal" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
          </Field>
        ) : null}
        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Linked UPI, variant…" />
        </Field>
        <div className="flex gap-2">
          <Button type="submit" disabled={busy} className="flex-1">
            {busy ? "Saving…" : "Save card"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
