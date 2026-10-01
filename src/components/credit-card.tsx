import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Flame, Medal, Target } from "lucide-react";
import {
  anchorDate,
  computeKeepPlay,
  daysLeftInMonth,
  formatInr,
  householdCapStatus,
  HOME_SCORE_PERIODS,
  periodWord,
  scoreCompareLabels,
  scoreWhy,
  type EmiBehaviour,
  type Expense,
  type InsightCadence,
  type KeepPlay,
  type PeriodDigest,
  type ScorePeriod,
  type SpendScore,
  INSIGHT_CADENCE_OPTIONS,
} from "@/lib/keep";
import { cn } from "@/lib/utils";

export function MonthSpend({
  spent,
  everyday,
  tripTotal,
  average,
  label,
}: {
  spent: number;
  everyday: number;
  tripTotal: number;
  average: number;
  label?: string;
}) {
  const pending = average - everyday;
  const over = average > 0 && everyday > average;
  const pct = average > 0 ? Math.min(100, (everyday / average) * 100) : everyday > 0 ? 100 : 0;
  const left = daysLeftInMonth();

  return (
    <article className="rounded-xl bg-cream p-5 text-ink shadow-soft">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
        {label ?? "This month"}
      </p>
      <p className="mt-2 font-display text-3xl font-medium tracking-tight tabular-nums">{formatInr(spent)}</p>
      <p className="mt-1 text-xs text-muted">All spend this month</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-paper-2 px-3 py-2.5">
          <p className="text-xs text-muted">Everyday</p>
          <p className="mt-1 text-sm font-medium tabular-nums">{formatInr(everyday)}</p>
        </div>
        <div className="rounded-lg bg-paper-2 px-3 py-2.5">
          <p className="text-xs text-muted">Trips</p>
          <p className="mt-1 text-sm font-medium tabular-nums">{formatInr(tripTotal)}</p>
        </div>
      </div>

      {average > 0 ? (
        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-3 text-xs text-muted">
            <span>Everyday vs a usual month</span>
            <span className="tabular-nums">{formatInr(average)}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-paper-2">
            <div
              className={cn("h-full rounded-pill", over ? "bg-terra" : pct >= 80 ? "bg-mustard" : "bg-sage")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className={cn("mt-2 text-sm leading-relaxed", over ? "text-terra" : "text-muted")}>
            {over
              ? `${formatInr(everyday - average)} over a usual everyday month of ${formatInr(average)}.`
              : `${formatInr(pending)} still under a usual everyday month of ${formatInr(average)}.`}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          A usual everyday month appears after a few months of logs.
        </p>
      )}
      <p className="mt-3 text-xs leading-relaxed text-muted">
        {left} {left === 1 ? "day" : "days"} left this month.
      </p>
    </article>
  );
}

function ringColor(score: number) {
  return score >= 72 ? "var(--color-sage)" : score >= 55 ? "var(--color-mustard)" : "var(--color-terra)";
}

function ScoreRing({ score, size = "md" }: { score: number; size?: "xs" | "sm" | "md" }) {
  const spec = size === "xs" ? { dim: 40, stroke: 6, type: "text-xs" } : size === "sm" ? { dim: 56, stroke: 7, type: "text-base" } : { dim: 72, stroke: 8.5, type: "text-xl" };
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const r = (spec.dim - spec.stroke) / 2;
  const c = 2 * Math.PI * r;
  const full = pct >= 0.995;
  const empty = pct <= 0;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: spec.dim, height: spec.dim }}>
      <svg
        width={spec.dim}
        height={spec.dim}
        viewBox={`0 0 ${spec.dim} ${spec.dim}`}
        className="keep-score-ring -rotate-90"
        aria-hidden
      >
        <circle
          cx={spec.dim / 2}
          cy={spec.dim / 2}
          r={r}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={spec.stroke}
          strokeLinecap="round"
        />
        {empty ? null : (
          <circle
            cx={spec.dim / 2}
            cy={spec.dim / 2}
            r={r}
            fill="none"
            stroke={ringColor(score)}
            strokeWidth={spec.stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={full ? undefined : `${c * pct} ${c}`}
          />
        )}
      </svg>
      <span className={cn("keep-score-num absolute font-display font-medium tabular-nums text-ink", spec.type)}>
        {score}
      </span>
    </div>
  );
}

function ScoreWhyPanel({
  scores,
  expenses,
  period,
  month,
}: {
  scores: Record<ScorePeriod, SpendScore>;
  expenses: Expense[];
  period: ScorePeriod;
  month?: string;
}) {
  const now = month ? anchorDate(month) : new Date();
  const s = scores[period];
  const why = scoreWhy(s, expenses, now);
  const compare = scoreCompareLabels(period);
  const over = why.expected > 0 && why.spent > why.expected;
  const pct = why.expected > 0 ? Math.min(100, (why.spent / why.expected) * 100) : why.spent > 0 ? 100 : 0;

  return (
    <div className="keep-score-why mt-3 rounded-2xl bg-paper-2 p-3">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">{why.headline}</p>
      <div className="mt-2 flex items-center gap-3">
        <ScoreRing score={why.score} size="sm" />
        <div className="min-w-0">
          <p className="font-display text-lg font-medium leading-tight">Why {why.score}</p>
          <p className="text-xs text-muted">{why.label}</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink">{why.summary}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-md bg-cream px-3 py-2 shadow-soft">
          <p className="text-xs text-muted">{compare.spent}</p>
          <p className="mt-0.5 text-sm font-medium tabular-nums">{formatInr(why.spent)}</p>
        </div>
        <div className="rounded-md bg-cream px-3 py-2 shadow-soft">
          <p className="text-xs text-muted">{compare.usual}</p>
          <p className="mt-0.5 text-sm font-medium tabular-nums">{formatInr(why.expected)}</p>
        </div>
      </div>
      {why.expected > 0 ? (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-pill bg-cream">
            <div
              className={cn("h-full rounded-pill", over ? "bg-terra" : pct >= 80 ? "bg-mustard" : "bg-sage")}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ) : null}
      <ul className="mt-3 flex flex-col gap-2">
        {why.points.map((point) => (
          <li key={point} className="rounded-md bg-cream px-3 py-2.5 text-sm leading-relaxed shadow-soft">
            {point}
          </li>
        ))}
      </ul>
      {why.drivers.length > 0 ? (
        <div className="mt-3">
          <h3 className="text-sm font-medium">What made this {periodWord(period)}</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {why.drivers.map((d) => (
              <li key={d.name} className="flex items-baseline justify-between gap-3 text-sm">
                <span>{d.name}</span>
                <span className="tabular-nums text-muted">
                  {formatInr(d.amount)} · {Math.round(d.share * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="mt-3 rounded-md bg-night px-3 py-2.5 text-sm leading-relaxed text-on-night">{why.nextStep}</p>
    </div>
  );
}

export function SpendScores({
  scores,
  expenses,
  month,
  compact = false,
}: {
  scores: Record<ScorePeriod, SpendScore>;
  expenses: Expense[];
  month?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState<ScorePeriod | null>(null);
  const play = useMemo(
    () => (compact ? null : computeKeepPlay(expenses, scores, month ? anchorDate(month) : new Date())),
    [compact, expenses, scores, month],
  );

  return (
    <article className={cn("rounded-xl bg-cream shadow-soft", compact ? "p-3" : "p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Spend scores</p>
          <p className="mt-1 text-xs text-muted">Tap a number to see why it scored that way.</p>
        </div>
        {play ? <StreakChip play={play} /> : null}
      </div>
      <div className={cn("grid grid-cols-3", compact ? "mt-2 gap-1.5" : "mt-3 gap-2")}>
        {HOME_SCORE_PERIODS.map((id) => {
          const s = scores[id];
          const active = open === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setOpen(active ? null : id)}
              className={cn(
                "keep-score-btn keep-press flex min-h-11 flex-col items-center rounded-2xl px-1.5",
                compact ? "gap-1 py-2" : "gap-1.5 px-2 py-3",
                active && "is-open",
              )}
              aria-expanded={active}
              aria-label={`${s.headline} spend score ${s.score}. ${active ? "Hide why." : "Open why."}`}
            >
              <ScoreRing score={s.score} size={compact ? "xs" : "sm"} />
              <span className="text-xs font-medium capitalize text-muted">{id}</span>
            </button>
          );
        })}
      </div>
      {open ? (
        <ScoreWhyPanel scores={scores} expenses={expenses} period={open} month={month} />
      ) : null}
      {play ? <KeepPlayCard play={play} compact={compact} /> : null}
    </article>
  );
}

function StreakChip({ play }: { play: KeepPlay }) {
  const live = play.logStreak > 0;
  return (
    <p
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-medium",
        live ? "bg-sage/15 text-sage-deep" : "bg-paper-2 text-muted",
      )}
    >
      <Flame className={cn("size-3.5", live && "keep-streak-flame")} strokeWidth={2} />
      {live ? `${play.logStreak}-day streak` : "Start a streak"}
    </p>
  );
}

function KeepPlayCard({ play, compact }: { play: KeepPlay; compact: boolean }) {
  const rankPct =
    play.nextRankAt == null ? 100 : Math.min(100, Math.round((play.xp / play.nextRankAt) * 100));
  const questPct = play.quest.goal > 0 ? Math.min(100, (play.quest.progress / play.quest.goal) * 100) : 0;
  const shown = play.badges.filter((b) => b.earned).concat(play.badges.filter((b) => !b.earned)).slice(0, 4);

  return (
    <div className={cn("mt-3 rounded-2xl bg-paper-2 p-3", compact ? "" : "p-3.5")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Keep play</p>
          <p className="mt-1 font-display text-lg font-medium leading-tight">{play.rank}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{play.rankHint}</p>
        </div>
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-cream text-sage-deep shadow-soft">
          <Medal className="size-4" strokeWidth={1.8} />
        </div>
      </div>
      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-3 text-xs text-muted">
          <span>{play.nextRankAt == null ? "Top rank" : `${play.xp} / ${play.nextRankAt}`}</span>
          <span>
            {play.earnedCount}/{play.badges.length} badges
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-cream">
          <div className="h-full rounded-pill bg-sage" style={{ width: `${rankPct}%` }} />
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-cream px-3 py-2.5 shadow-soft">
        <div className="flex items-start gap-2">
          <Target className="mt-0.5 size-3.5 shrink-0 text-sage-deep" strokeWidth={1.8} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{play.quest.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">{play.quest.body}</p>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-paper-2">
          <div
            className={cn("h-full rounded-pill", play.quest.done ? "bg-sage" : "bg-mustard")}
            style={{ width: `${questPct}%` }}
          />
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {shown.map((badge) => (
          <li
            key={badge.id}
            title={badge.hint}
            className={cn(
              "rounded-pill px-2.5 py-1 text-xs font-medium",
              badge.earned ? "bg-cream text-ink shadow-soft" : "bg-cream/40 text-faint",
            )}
          >
            {badge.title}
          </li>
        ))}
      </ul>
      {!play.loggedToday ? (
        <Link to="/add" className="mt-3 block text-xs text-muted underline underline-offset-4">
          Log today to keep the streak
        </Link>
      ) : play.scoreStreak >= 3 ? (
        <p className="mt-3 text-xs leading-relaxed text-sage-deep">
          Calm scores for {play.scoreStreak} days in a row.
        </p>
      ) : null}
    </div>
  );
}

export function HouseholdCapCard({
  spent,
  limit,
  daysLeft,
}: {
  spent: number;
  limit: number;
  daysLeft: number;
}) {
  const cap = householdCapStatus(spent, limit);
  if (!cap) return null;
  const over = cap.level === "over";
  const warn = cap.level === "warn";
  const bar = Math.min(100, cap.pct * 100);

  return (
    <article className={cn("rounded-xl p-5 shadow-soft", over ? "bg-night text-on-night" : "bg-cream text-ink")}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={cn("text-xs font-medium uppercase tracking-[0.16em]", over ? "text-on-night-muted" : "text-muted")}>
            Household monthly cap
          </p>
          <p className="mt-2 font-display text-2xl font-medium tabular-nums">
            {formatInr(cap.spent)}
            <span className={cn("text-base", over ? "text-on-night-muted" : "text-muted")}> / {formatInr(cap.limit)}</span>
          </p>
        </div>
        <Link
          to="/budgets"
          className={cn("text-xs underline-offset-2", over ? "text-on-night-muted underline" : "text-muted")}
        >
          Edit
        </Link>
      </div>
      <div className={cn("mt-3 h-1.5 overflow-hidden rounded-pill", over ? "bg-night-3" : "bg-paper-2")}>
        <div
          className={cn("h-full rounded-pill", over ? "bg-terra" : warn ? "bg-mustard" : "bg-sage")}
          style={{ width: `${bar}%` }}
        />
      </div>
      <p className={cn("mt-3 text-sm leading-relaxed", over ? "text-on-night" : warn ? "text-terra" : "text-muted")}>
        {over
          ? `${formatInr(-cap.remaining)} over the household cap. Pause optional spends for the next ${daysLeft} ${daysLeft === 1 ? "day" : "days"}.`
          : warn
            ? `${formatInr(cap.remaining)} left of the household cap · about ${formatInr(daysLeft > 0 ? cap.remaining / daysLeft : cap.remaining)} a day.`
            : `${formatInr(cap.remaining)} remaining this month · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left.`}
      </p>
    </article>
  );
}

export function EmiBehaviourCard({ emi }: { emi: EmiBehaviour }) {
  if (emi.monthAmount <= 0 && emi.committed.length === 0) return null;
  const hot = emi.monthShare >= 0.35 || emi.newThisMonth.length > 0;
  const action = emi.actions[0];

  return (
    <article className="rounded-xl bg-cream p-5 shadow-soft">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">EMI behaviour</p>
          <p className="mt-2 font-display text-2xl font-medium tabular-nums">{formatInr(emi.monthAmount)}</p>
          <p className="mt-0.5 text-xs text-muted">
            {Math.round(emi.monthShare * 100)}% of this month · {emi.monthCount} {emi.monthCount === 1 ? "payment" : "payments"}
          </p>
        </div>
        <Link to="/insights" className="text-xs text-muted">
          Full mix
        </Link>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {emi.notes.slice(0, 2).map((note) => (
          <li key={note} className="text-sm leading-relaxed text-muted">
            {note}
          </li>
        ))}
      </ul>
      {action ? (
        <div className={cn("mt-3 rounded-lg px-3 py-2.5", hot ? "bg-terra/10" : "bg-paper-2")}>
          <p className="text-sm font-medium">{action.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{action.body}</p>
        </div>
      ) : null}
    </article>
  );
}

export function CategoryLimitsCard({
  caps,
}: {
  caps: { category: string; spent: number; limit: number }[];
}) {
  if (caps.length === 0) return null;
  return (
    <article className="rounded-xl bg-cream p-5 shadow-soft">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Category limits</h2>
          <p className="mt-0.5 text-xs text-muted">Everyday spend only · trips have their own budget</p>
        </div>
        <Link to="/budgets" className="text-xs text-muted underline-offset-2">
          Edit
        </Link>
      </div>
      <ul className="mt-4 flex flex-col gap-3">
        {caps.map((cap) => {
          const capOver = cap.spent > cap.limit;
          const capPct = cap.limit > 0 ? Math.min(100, (cap.spent / cap.limit) * 100) : 0;
          const pending = cap.limit - cap.spent;
          return (
            <li key={cap.category}>
              <div className="flex items-baseline justify-between text-sm">
                <span>{cap.category}</span>
                <span className={cn("tabular-nums", capOver ? "text-terra" : "text-muted")}>
                  {formatInr(cap.spent)} / {formatInr(cap.limit)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-paper-2">
                <div
                  className={cn("h-full rounded-pill", capOver ? "bg-terra" : capPct >= 80 ? "bg-mustard" : "bg-sage")}
                  style={{ width: `${capPct}%` }}
                />
              </div>
              <p className={cn("mt-1 text-xs tabular-nums", capOver ? "text-terra" : "text-muted")}>
                {capOver ? `${formatInr(cap.spent - cap.limit)} over` : `${formatInr(pending)} pending`}
              </p>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

/** Full-size scores used on Spend. */
export function SpendScoreCard({
  scores,
  expenses,
  month,
}: {
  scores: Record<ScorePeriod, SpendScore>;
  expenses: Expense[];
  month?: string;
}) {
  return <SpendScores scores={scores} expenses={expenses} month={month} />;
}

export function CadenceMenu({
  value,
  onChange,
  allowOff = true,
}: {
  value: InsightCadence;
  onChange: (next: InsightCadence) => void;
  allowOff?: boolean;
}) {
  const options = allowOff ? INSIGHT_CADENCE_OPTIONS : INSIGHT_CADENCE_OPTIONS.filter((o) => o.id !== "off");
  return (
    <div className="flex gap-1 overflow-x-auto keep-hide-scroll rounded-lg bg-paper-2 p-1">
      {options.map((opt) => {
        const on = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "keep-press h-9 shrink-0 rounded-md px-3 text-xs font-medium",
              on ? "bg-cream text-ink shadow-soft" : "text-muted",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function BehaviourDigest({
  digest,
  cadence,
  onCadence,
  onHide,
}: {
  digest: PeriodDigest;
  cadence: InsightCadence;
  onCadence: (next: InsightCadence) => void;
  onHide?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const over = digest.usual > 0 && digest.spent > digest.usual;
  const pct = digest.usual > 0 ? Math.min(100, (digest.spent / digest.usual) * 100) : digest.spent > 0 ? 100 : 0;
  const hint = useMemo(
    () => INSIGHT_CADENCE_OPTIONS.find((o) => o.id === cadence)?.hint ?? "",
    [cadence],
  );

  return (
    <article className="rounded-xl bg-cream p-3 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted">Behaviour report</p>
          <p className="mt-0.5 text-xs text-muted">{hint}</p>
        </div>
        <button
          type="button"
          className="keep-press grid size-9 place-items-center rounded-full bg-paper-2"
          aria-expanded={open}
          aria-label={open ? "Collapse report" : "Expand report"}
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown className={cn("size-4 transition-transform duration-200", open && "rotate-180")} />
        </button>
      </div>
      <div className="mt-3">
        <CadenceMenu value={cadence} onChange={onCadence} />
      </div>
      {open ? (
        <div className="keep-score-why mt-3">
          <p className="text-xs text-muted">{digest.label}</p>
          <p className="mt-1 font-display text-2xl font-medium tabular-nums">{formatInr(digest.spent)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-md bg-paper-2 px-3 py-2">
              <p className="text-xs text-muted">Usual</p>
              <p className="mt-0.5 text-sm font-medium tabular-nums">{formatInr(digest.usual)}</p>
            </div>
            <div className="rounded-md bg-paper-2 px-3 py-2">
              <p className="text-xs text-muted">{over ? "Over" : "Under"}</p>
              <p className={cn("mt-0.5 text-sm font-medium tabular-nums", over ? "text-terra" : "text-sage-deep")}>
                {formatInr(Math.abs(digest.remaining))}
              </p>
            </div>
          </div>
          {digest.usual > 0 ? (
            <div className="mt-3 h-1.5 overflow-hidden rounded-pill bg-paper-2">
              <div
                className={cn("h-full rounded-pill", over ? "bg-terra" : pct >= 80 ? "bg-mustard" : "bg-sage")}
                style={{ width: `${pct}%` }}
              />
            </div>
          ) : null}
          <ul className="mt-3 flex flex-col gap-2">
            {digest.notes.map((note) => (
              <li key={note} className="rounded-md bg-paper-2 px-3 py-2.5 text-sm leading-relaxed">
                {note}
              </li>
            ))}
          </ul>
          {digest.drivers.length > 0 ? (
            <div className="mt-3">
              <h3 className="text-sm font-medium">Where it went</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {digest.drivers.map((d) => (
                  <li key={d.name} className="flex items-baseline justify-between gap-3 text-sm">
                    <span>{d.name}</span>
                    <span className="tabular-nums text-muted">
                      {formatInr(d.amount)} · {Math.round(d.share * 100)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {digest.suggestions.length > 0 ? (
            <div className="mt-4">
              <h3 className="text-sm font-medium">How to spend less</h3>
              <ul className="mt-2 flex flex-col gap-2">
                {digest.suggestions.map((s) => (
                  <li key={s.title} className="rounded-md bg-paper-2 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">{s.title}</p>
                      {s.save ? (
                        <span className="shrink-0 text-xs tabular-nums text-sage-deep">{formatInr(s.save)}</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{s.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {onHide ? (
            <button type="button" className="mt-3 text-xs text-muted underline underline-offset-4" onClick={onHide}>
              Hide behaviour reports
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/** @deprecated alias — homescreen no longer mimics a payment card. */
export const CreditCard = MonthSpend;
