import { useRef, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button, Field, Input } from "@/components/ui";
import { Stamp } from "@/components/logo";
import { completeOnboarding, createHousehold, joinHousehold } from "@/lib/server/keep";
import { firstName } from "@/lib/keep";
import { applyDashboard } from "@/lib/use-keep";
import { useViewerName } from "@/components/shell";
import { markWelcomeSeen } from "@/lib/keep-cache";

function Spark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 48" className={className} fill="none" aria-hidden>
      <path
        className="keep-draw"
        d="M4 32 C 20 32, 24 10, 40 18 S 64 44, 80 28 S 112 4, 132 16 S 148 30, 156 22"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="80" cy="28" r="3" fill="var(--color-terra)" className="keep-pulse-dot" />
    </svg>
  );
}

function Waves({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 56" className={className} fill="none" aria-hidden>
      {[0, 8, 16].map((y) => (
        <path
          key={y}
          className="keep-draw"
          d={`M4 ${28 + y / 3} C 28 ${12 + y}, 48 ${44 + y / 4}, 72 ${24 + y / 5} S 108 ${8 + y}, 116 ${22 + y / 6}`}
          stroke="currentColor"
          strokeWidth="1.1"
        />
      ))}
    </svg>
  );
}

export function Welcome({ onContinue }: { onContinue: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const drag = useRef<{ start: number; origin: number; max: number; active: boolean }>({
    start: 0,
    origin: 0,
    max: 0,
    active: false,
  });
  const [busy, setBusy] = useState(false);

  async function finish() {
    if (busy) return;
    setBusy(true);
    markWelcomeSeen();
    try {
      await completeOnboarding();
    } catch {
      // still enter the app
    }
    onContinue();
  }

  function pointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const track = trackRef.current;
    if (!track || busy) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const max = Math.max(track.clientWidth - 52, 1);
    drag.current = { start: e.clientX, origin: x, max, active: true };
  }

  function pointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    const next = Math.max(0, Math.min(drag.current.max, drag.current.origin + (e.clientX - drag.current.start)));
    setX(next);
  }

  function pointerUp() {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (x >= drag.current.max * 0.62) {
      setX(drag.current.max);
      void finish();
      return;
    }
    setX(0);
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper px-6 pb-8 pt-10">
      <div className="grid flex-1 grid-cols-2 grid-rows-3 overflow-hidden rounded-2xl border border-line bg-cream keep-enter">
        <div className="grid place-items-center border-b border-r border-line p-4">
          <Stamp />
        </div>
        <div className="flex flex-col justify-between border-b border-line p-4 keep-enter keep-delay-1">
          <p className="text-right text-xs text-muted">−1,200</p>
          <Waves className="w-full text-sage" />
          <p className="text-xs text-muted">Expense</p>
        </div>
        <div className="col-span-2 flex items-center justify-between gap-3 border-b border-line px-5 py-4 keep-enter keep-delay-2">
          <div>
            <p className="font-display text-lg text-terra">Keep Expense</p>
            <Spark className="mt-2 w-40 text-ink" />
          </div>
          <p className="font-display text-lg text-sage-deep">Crystal Clear</p>
        </div>
        <div className="flex items-end border-r border-line p-4 keep-enter keep-delay-3">
          <Waves className="w-full text-sage/70" />
        </div>
        <div className="grid place-items-center p-4 keep-enter keep-delay-4">
          <Stamp />
        </div>
      </div>
      <h1 className="mt-8 font-display text-[2.1rem] leading-[1.15] font-medium tracking-tight keep-enter keep-delay-2">
        Manage your Expenses Easily
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted keep-enter keep-delay-3">
        Personal ledger first. Family sharing when you want it. IDs and cards stay yours.
      </p>

      <div
        ref={trackRef}
        className="relative mt-8 h-14 w-full select-none overflow-hidden rounded-pill bg-ink text-cream keep-enter keep-delay-4"
        style={{ touchAction: "none" }}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round((x / Math.max(drag.current.max, 1)) * 100)}
        aria-label="Swipe to get started"
      >
        <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm font-medium">
          {busy ? "Opening…" : "Swipe to get started"}
        </span>
        <span
          className="absolute top-1 left-1 grid size-12 place-items-center rounded-full bg-cream text-ink shadow-soft"
          style={{ transform: `translateX(${x}px)`, transition: drag.current.active ? "none" : "transform 200ms var(--ease-out-soft)" }}
        >
          <ArrowRight className="size-4" />
        </span>
      </div>
      <button
        type="button"
        className="mt-3 text-sm text-muted underline underline-offset-4"
        onClick={() => void finish()}
      >
        Or tap here to enter
      </button>
    </div>
  );
}

export function HouseholdSetup({
  userId,
  queryClient,
}: {
  userId: string;
  queryClient: QueryClient;
}) {
  const viewer = useViewerName();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [displayName, setDisplayName] = useState(viewer === "You" ? "" : viewer);
  const [houseName, setHouseName] = useState(viewer === "You" ? "Our home" : `${firstName(viewer)}'s home`);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const name = displayName.trim() || "You";
      const payload =
        mode === "create"
          ? await createHousehold({ data: { name: houseName.trim() || "Our home", displayName: name } })
          : await joinHousehold({ data: { code, displayName: name } });
      applyDashboard(queryClient, userId, payload);
      markWelcomeSeen();
      toast.success(mode === "create" ? "Family household ready" : "Request sent to the owner");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-paper px-6 pb-10 pt-12" onSubmit={(e) => void submit(e)}>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted keep-enter">Family sharing</p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-tight keep-enter keep-delay-1">
        {mode === "create" ? "Start a family ledger" : "Ask to join"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted keep-enter keep-delay-2">
        Your personal ledger is already open. Family sharing is optional — the owner accepts each request.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-2 rounded-lg bg-paper-2 p-1 keep-enter keep-delay-2">
        <button
          type="button"
          className={`h-10 rounded-md text-sm font-medium transition-colors duration-200 ${mode === "create" ? "bg-cream text-ink shadow-soft" : "text-muted"}`}
          onClick={() => setMode("create")}
        >
          Create
        </button>
        <button
          type="button"
          className={`h-10 rounded-md text-sm font-medium transition-colors duration-200 ${mode === "join" ? "bg-cream text-ink shadow-soft" : "text-muted"}`}
          onClick={() => setMode("join")}
        >
          Join
        </button>
      </div>
      <div className="mt-6 flex flex-col gap-4 keep-enter keep-delay-3">
        <Field label="Your name">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Alexa"
            autoComplete="name"
          />
        </Field>
        {mode === "create" ? (
          <Field label="Household name">
            <Input
              value={houseName}
              onChange={(e) => setHouseName(e.target.value)}
              placeholder="The Guptas"
              autoFocus
            />
          </Field>
        ) : (
          <Field label="Invite code">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="K7M2PQ"
              autoCapitalize="characters"
              autoFocus
            />
          </Field>
        )}
      </div>
      {error ? <p className="mt-4 text-sm text-danger keep-enter">{error}</p> : null}
      <Button className="mt-auto keep-enter keep-delay-4" disabled={busy} type="submit">
        {busy ? "Working…" : mode === "create" ? "Create family household" : "Send join request"}
      </Button>
    </form>
  );
}
