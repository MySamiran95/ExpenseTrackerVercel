import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppGate } from "@/components/app-gate";
import { ScopeSwitch } from "@/components/shell";
import { Button, Field, Input } from "@/components/ui";
import { formatInr } from "@/lib/keep";
import {
  acceptJoinRequest,
  createHousehold,
  declineJoinRequest,
  joinHousehold,
  leaveHousehold,
  removeMember,
  renameHousehold,
} from "@/lib/server/keep";
import { applyDashboard, useKeep } from "@/lib/use-keep";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/family")({ component: Page });

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
  const { user } = useCurrentUserState();
  const familyOn = data?.scope === "family" && data.household?.kind === "family";
  const [name, setName] = useState(familyOn ? (data?.household?.name ?? "") : "");
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState(data?.profile.displayName ?? "");
  const [newHouse, setNewHouse] = useState("");

  if (!data?.household) return null;
  const household = data.household;

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["keep-dashboard"] });
  }

  async function copyCode() {
    if (!data?.household || data.household.kind !== "family") return;
    try {
      await navigator.clipboard.writeText(data.household.inviteCode);
      toast("Invite code copied");
    } catch {
      toast(data.household.inviteCode);
    }
  }

  return (
    <div className="px-5 pb-8 pt-6">
      <header className="flex items-center justify-between">
        <Link to="/" className="keep-press grid size-10 place-items-center rounded-full bg-cream shadow-soft" aria-label="Back">
          <ArrowLeft className="size-4" />
        </Link>
        <h1 className="font-display text-xl font-medium">Family</h1>
        <span className="w-10" />
      </header>
      {data.hasFamily ? (
        <div className="mt-4">
          <ScopeSwitch data={data} />
        </div>
      ) : null}
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Shared spend, trends, and reports live only on the Family ledger. Remove someone and they drop back to their
        personal book — they cannot see this household again. IDs, debit cards, and PINs stay in each person's wallet.
      </p>

      {!data.hasFamily ? (
        <div className="mt-5 rounded-xl bg-cream p-4 shadow-soft">
          <h2 className="text-sm font-medium">How family sharing works</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-sm leading-relaxed text-muted">
            <li>Create a household below. You become the owner.</li>
            <li>Copy the invite code that appears and send it (WhatsApp, SMS, anything).</li>
            <li>They sign in with their own Google or email, open Family, and paste the code under Ask to join.</li>
            <li>You accept their request here. Then switch Home to Family to see shared spend.</li>
          </ol>
          <p className="mt-2 text-xs text-muted">Each person keeps their own personal ledger. Family is a second, shared book.</p>
        </div>
      ) : null}

      {!data.hasFamily ? (
        <div className="mt-5 flex flex-col gap-4">
          <div className="rounded-xl bg-cream p-4 shadow-soft">
            <h2 className="text-sm font-medium">Start a family household</h2>
            <p className="mt-1 text-xs text-muted">You remain the owner. Others send a request you can accept or ignore.</p>
            <Field label="Household name">
              <Input className="mt-3" value={newHouse} onChange={(e) => setNewHouse(e.target.value)} placeholder="The Guptas" />
            </Field>
            <Button
              className="mt-3"
              onClick={async () => {
                try {
                  const payload = await createHousehold({
                    data: { name: newHouse.trim() || "Our home", displayName: data.profile.displayName || "You" },
                  });
                  applyDashboard(qc, user?.id, payload);
                  toast("Family household ready");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not create");
                }
              }}
            >
              Create
            </Button>
          </div>
          <div className="rounded-xl bg-cream p-4 shadow-soft">
            <h2 className="text-sm font-medium">Ask to join</h2>
            <p className="mt-1 text-xs text-muted">The owner has to accept before you see their family spend.</p>
            <div className="mt-3 flex flex-col gap-3">
              <Field label="Your name">
                <Input value={joinName} onChange={(e) => setJoinName(e.target.value)} />
              </Field>
              <Field label="Invite code">
                <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} />
              </Field>
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    const payload = await joinHousehold({
                      data: { code: joinCode, displayName: joinName || "You" },
                    });
                    applyDashboard(qc, user?.id, payload);
                    toast("Request sent — waiting for the owner");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Could not join");
                  }
                }}
              >
                Send request
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {data.hasFamily && data.household.kind === "family" ? (
        <>
          <div className="mt-5 rounded-xl bg-night p-5 text-on-night">
            <p className="text-xs text-on-night-muted">Invite code</p>
            <p className="mt-1 font-display text-3xl tracking-[0.2em]">{data.household.inviteCode}</p>
            <Button variant="night" className="mt-4" onClick={() => void copyCode()}>
              <Copy className="size-4" />
              Copy code
            </Button>
          </div>

          {data.household.role === "owner" ? (
            <div className="mt-5 rounded-xl bg-cream p-4 shadow-soft">
              <Field label="Household name">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Button
                className="mt-3"
                variant="secondary"
                onClick={async () => {
                  await renameHousehold({ data: { name } });
                  await refresh();
                  toast("Household renamed");
                }}
              >
                Save name
              </Button>
            </div>
          ) : null}

          {data.joinRequests.length > 0 && data.household.role === "owner" ? (
            <div className="mt-5">
              <h2 className="text-base font-medium">Waiting for you</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {data.joinRequests.map((r) => (
                  <li key={r.id} className="rounded-xl bg-cream px-4 py-3 shadow-soft">
                    <p className="text-sm font-medium">{r.displayName}</p>
                    <p className="text-xs text-muted">Asked to join this household</p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        className="h-9 flex-1"
                        onClick={async () => {
                          await acceptJoinRequest({ data: { id: r.id } });
                          await refresh();
                          toast(`${r.displayName} is in`);
                        }}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="ghost"
                        className="h-9"
                        onClick={async () => {
                          await declineJoinRequest({ data: { id: r.id } });
                          await refresh();
                        }}
                      >
                        Decline
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <h2 className="mt-6 text-base font-medium">This month</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {data.members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between rounded-xl bg-cream px-4 py-3 shadow-soft">
                <div>
                  <p className="text-sm font-medium">{m.displayName}</p>
                  <p className="text-xs capitalize text-muted">{m.role}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm tabular-nums">{formatInr(m.spentThisMonth)}</p>
                  {household.role === "owner" && m.role !== "owner" ? (
                    <button
                      type="button"
                      className="mt-1 text-xs text-danger"
                      onClick={async () => {
                        await removeMember({ data: { userId: m.userId } });
                        await refresh();
                        toast("Removed — their past entries stay on this ledger");
                      }}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>

          {data.household.role !== "owner" ? (
            <Button
              variant="ghost"
              className="mt-6 w-full text-danger"
              onClick={async () => {
                await leaveHousehold();
                await refresh();
              }}
            >
              Leave this household
            </Button>
          ) : null}
        </>
      ) : data.hasFamily ? (
        <p className="mt-5 text-sm leading-relaxed text-muted">
          You are on your personal ledger. Tap Family above to open the shared household — trends, insights, and
          reports for this family stay there until someone is removed.
        </p>
      ) : null}
    </div>
  );
}
