import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  daysInMonth,
  formatInr,
  lastNMonthKeys,
  LOOKBACK_MONTHS,
  monthKey,
  shortMonthLabel,
  tallyPaymentGroups,
  type Expense,
  type MemberSpendRow,
} from "@/lib/keep";

const FALLBACK = {
  ink: "#1c1917",
  cream: "#faf7f2",
  muted: "#7a7368",
  line: "#e4ddd2",
  sage: "#6b8f71",
  sageDeep: "#4f7a59",
  terra: "#c17a4a",
  mustard: "#c4a35a",
  plum: "#6b5b7a",
};

function readCssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function useChartPalette() {
  const [rev, setRev] = useState(0);
  useEffect(() => {
    const el = document.documentElement;
    const mo = new MutationObserver(() => setRev((n) => n + 1));
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return useMemo(() => {
    void rev;
    return {
      ink: readCssVar("--color-ink", FALLBACK.ink),
      cream: readCssVar("--color-cream", FALLBACK.cream),
      muted: readCssVar("--color-muted", FALLBACK.muted),
      line: readCssVar("--color-line", FALLBACK.line),
      sage: readCssVar("--color-sage", FALLBACK.sage),
      sageDeep: readCssVar("--color-sage-deep", FALLBACK.sageDeep),
      terra: readCssVar("--color-terra", FALLBACK.terra),
      mustard: readCssVar("--color-mustard", FALLBACK.mustard),
      plum: readCssVar("--color-plum", FALLBACK.plum),
    };
  }, [rev]);
}

type Palette = ReturnType<typeof useChartPalette>;

function fillFor(name: string, p: Palette) {
  const map: Record<string, string> = {
    House: p.sageDeep,
    Groceries: p.terra,
    Fashion: p.plum,
    Education: p.sageDeep,
    Travel: p.mustard,
    Wellbeing: p.sage,
    Entertainment: p.mustard,
    Subscriptions: p.plum,
    Household: p.sage,
    Electronics: p.ink,
    Giving: p.sageDeep,
    Medical: p.terra,
    Vehicle: p.mustard,
    Care: p.terra,
    Events: p.plum,
    Pets: p.sage,
    "EMI & Loans": p.ink,
    Others: p.muted,
    Stock: p.sageDeep,
    MF: p.sage,
    LIC: p.plum,
    FD: p.mustard,
    Gold: p.mustard,
    Bonds: p.sage,
    "Real Estate": p.terra,
    NPS: p.sageDeep,
    PF: p.ink,
  };
  return map[name] ?? p.muted;
}

function paymentFill(id: string, p: Palette) {
  const map: Record<string, string> = {
    UPI: p.sage,
    "Credit Card": p.terra,
    "Debit Card": p.sageDeep,
    EMI: p.ink,
    Online: p.plum,
    Cash: p.mustard,
    Others: p.muted,
  };
  return map[id] ?? p.muted;
}

function ChartLegend({
  items,
}: {
  items: { color: string; label: string; faded?: boolean }[];
}) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs text-muted">
          <span
            className="size-2.5 shrink-0 rounded-[3px]"
            style={{ background: item.color, opacity: item.faded ? 0.45 : 1 }}
            aria-hidden
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function ChartFrame({
  height,
  children,
}: {
  height: number;
  children: (size: { w: number; h: number }) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(Math.max(0, Math.floor(el.clientWidth)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full min-w-0 overflow-hidden" style={{ height }}>
      {w > 16 ? children({ w, h: height }) : null}
    </div>
  );
}

function Tip({ title, value, ink }: { title: string; value: string; ink: string }) {
  return (
    <div className="rounded-md px-2.5 py-1.5 text-cream shadow-card" style={{ background: ink }}>
      <p className="text-[10px] text-on-night-muted">{title}</p>
      <p className="text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}

export function SpendArea({ expenses, month }: { expenses: Expense[]; month: string }) {
  const p = useChartPalette();
  const data = useMemo(() => {
    const days = daysInMonth(month);
    const byDay = new Array<number>(days).fill(0);
    for (const e of expenses) {
      if (!e.occurredOn.startsWith(month)) continue;
      const d = Number(e.occurredOn.slice(8, 10));
      if (d >= 1 && d <= days) byDay[d - 1] += e.amount;
    }
    return byDay.map((amount, i) => ({
      day: i + 1,
      amount,
    }));
  }, [expenses, month]);

  const step = data.length > 20 ? 5 : 4;

  return (
    <ChartFrame height={176}>
      {({ w, h }) => (
        <AreaChart width={w} height={h} data={data} margin={{ top: 12, right: 8, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="keepSage" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={p.sage} stopOpacity={0.4} />
              <stop offset="100%" stopColor={p.sage} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={p.line} strokeDasharray="3 8" />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            interval={0}
            ticks={data.filter((_, i) => i % step === 0).map((d) => d.day)}
            tick={{ fill: p.muted, fontSize: 11 }}
          />
          <YAxis hide />
          <Tooltip
            cursor={{ stroke: p.terra, strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const row = payload[0].payload as { day: number; amount: number };
              return <Tip title={`Day ${row.day}`} value={formatInr(row.amount, { sign: true })} ink={p.ink} />;
            }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke={p.sageDeep}
            strokeWidth={2}
            fill="url(#keepSage)"
            activeDot={{ r: 5, fill: p.terra, stroke: p.cream, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      )}
    </ChartFrame>
  );
}

export function CategoryDonut({
  expenses,
  month,
  centerLabel,
  showBars = false,
}: {
  expenses: Expense[];
  month: string;
  centerLabel?: string;
  showBars?: boolean;
}) {
  const p = useChartPalette();
  const { slices, total } = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      if (month !== "all" && !e.occurredOn.startsWith(month)) continue;
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    const slices = [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const total = slices.reduce((s, x) => s + x.value, 0);
    return { slices: slices.slice(0, 6), total };
  }, [expenses, month]);

  if (total === 0) {
    return <div className="grid h-52 place-items-center text-sm text-muted">No spend in this window yet.</div>;
  }

  return (
    <div className="min-w-0 overflow-hidden">
      <div className="relative h-52 w-full min-w-0 overflow-hidden">
        <ChartFrame height={208}>
          {({ w, h }) => (
            <PieChart width={w} height={h}>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={82}
                paddingAngle={3}
                stroke="none"
                isAnimationActive={false}
              >
                {slices.map((s) => (
                  <Cell key={s.name} fill={fillFor(s.name, p)} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const row = payload[0].payload as { name: string; value: number };
                  return <Tip title={row.name} value={formatInr(row.value)} ink={p.ink} />;
                }}
              />
            </PieChart>
          )}
        </ChartFrame>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="text-[11px] text-muted">{centerLabel ?? "This month"}</p>
            <p className="font-display text-xl font-medium tabular-nums">{formatInr(total)}</p>
          </div>
        </div>
      </div>
      {showBars ? (
        <ul className="mt-2 flex flex-col gap-2.5">
          {slices.map((s) => {
            const share = total > 0 ? s.value / total : 0;
            return (
              <li key={s.name}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <i className="size-2 shrink-0 rounded-full" style={{ background: fillFor(s.name, p) }} />
                    <span className="truncate">{s.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted">
                    {formatInr(s.value, { compact: true })} · {Math.round(share * 100)}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-paper-2">
                  <div
                    className="h-full rounded-pill"
                    style={{ width: `${Math.max(4, share * 100)}%`, background: fillFor(s.name, p) }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function TrendByCategory({
  expenses,
  category,
  months = lastNMonthKeys(LOOKBACK_MONTHS),
}: {
  expenses: Expense[];
  category: string | "all";
  months?: string[];
}) {
  const p = useChartPalette();
  const data = useMemo(() => {
    return months.map((m) => {
      let amount = 0;
      for (const e of expenses) {
        if (!e.occurredOn.startsWith(m)) continue;
        if (category !== "all" && e.category !== category) continue;
        amount += e.amount;
      }
      return { month: m, label: shortMonthLabel(m), amount };
    });
  }, [expenses, category, months]);

  const tickEvery = Math.max(1, Math.ceil(data.length / 6));

  return (
    <ChartFrame height={180}>
      {({ w, h }) => (
        <AreaChart width={w} height={h} data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="keepTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={p.terra} stopOpacity={0.38} />
              <stop offset="100%" stopColor={p.terra} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={p.line} strokeDasharray="3 8" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            interval={0}
            ticks={data.filter((_, i) => i % tickEvery === 0).map((d) => d.month)}
            tickFormatter={(value: string) => data.find((d) => d.month === value)?.label ?? value}
            tick={{ fill: p.muted, fontSize: 10 }}
          />
          <YAxis hide />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const row = payload[0].payload as { amount: number; label: string };
              return <Tip title={row.label} value={formatInr(row.amount)} ink={p.ink} />;
            }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke={p.terra}
            strokeWidth={2}
            fill="url(#keepTrend)"
            isAnimationActive={false}
          />
        </AreaChart>
      )}
    </ChartFrame>
  );
}

export function InvestDonut({
  items,
}: {
  items: { kind: string; amount: number }[];
}) {
  const p = useChartPalette();
  const slices = items.filter((i) => i.amount > 0);
  const total = slices.reduce((s, i) => s + i.amount, 0);
  if (total === 0) {
    return <div className="grid h-48 place-items-center text-sm text-muted">No investments yet.</div>;
  }
  return (
    <div className="relative h-48 w-full min-w-0">
      <ChartFrame height={192}>
        {({ w, h }) => (
          <PieChart width={w} height={h}>
            <Pie
              data={slices}
              dataKey="amount"
              nameKey="kind"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={76}
              paddingAngle={3}
              stroke="none"
              isAnimationActive={false}
            >
              {slices.map((s) => (
                <Cell key={s.kind} fill={fillFor(s.kind, p)} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const row = payload[0].payload as { kind: string; amount: number };
                return <Tip title={row.kind} value={formatInr(row.amount)} ink={p.ink} />;
              }}
            />
          </PieChart>
        )}
      </ChartFrame>
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="text-[11px] text-muted">Portfolio</p>
          <p className="font-display text-lg font-medium tabular-nums">{formatInr(total, { compact: true })}</p>
        </div>
      </div>
    </div>
  );
}

export function PaymentModeChart({ expenses }: { expenses: Expense[] }) {
  const p = useChartPalette();
  const slices = useMemo(() => tallyPaymentGroups(expenses), [expenses]);
  const total = slices.reduce((s, x) => s + x.amount, 0);
  const top = slices[0];

  if (total === 0) {
    return <div className="grid h-40 place-items-center text-sm text-muted">No payments in this window yet.</div>;
  }

  return (
    <div className="min-w-0 overflow-hidden">
      <div className="relative h-48 w-full min-w-0 overflow-hidden">
        <ChartFrame height={192}>
          {({ w, h }) => (
            <PieChart width={w} height={h}>
              <Pie
                data={slices}
                dataKey="amount"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={76}
                paddingAngle={3}
                stroke="none"
                isAnimationActive={false}
              >
                {slices.map((s) => (
                  <Cell key={s.id} fill={paymentFill(s.id, p)} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const row = payload[0].payload as { label: string; amount: number };
                  return <Tip title={row.label} value={formatInr(row.amount)} ink={p.ink} />;
                }}
              />
            </PieChart>
          )}
        </ChartFrame>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="text-[11px] text-muted">Most used</p>
            <p className="font-display text-lg font-medium">{top?.label ?? "—"}</p>
          </div>
        </div>
      </div>
      <ul className="mt-2 flex flex-col gap-2.5">
        {slices.map((s) => (
          <li key={s.id}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-2">
                <i className="size-2 rounded-full" style={{ background: paymentFill(s.id, p) }} />
                {s.label}
              </span>
              <span className="tabular-nums text-muted">
                {formatInr(s.amount, { compact: true })} · {Math.round(s.share * 100)}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-paper-2">
              <div
                className="h-full rounded-pill"
                style={{ width: `${Math.max(4, s.share * 100)}%`, background: paymentFill(s.id, p) }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function monthOptions(count = LOOKBACK_MONTHS) {
  return lastNMonthKeys(count, monthKey()).reverse();
}

export function CategoryBars({
  current,
  previous,
}: {
  current: { category: string; amount: number }[];
  previous: { category: string; amount: number }[];
}) {
  const p = useChartPalette();
  const data = useMemo(() => {
    const names = new Set([...current.map((c) => c.category), ...previous.map((c) => c.category)]);
    return [...names].map((category) => ({
      category,
      thisMonth: current.find((c) => c.category === category)?.amount ?? 0,
      lastMonth: previous.find((c) => c.category === category)?.amount ?? 0,
    })).sort((a, b) => b.thisMonth - a.thisMonth).slice(0, 8);
  }, [current, previous]);

  if (data.length === 0) {
    return <div className="grid h-40 place-items-center text-sm text-muted">No category mix yet.</div>;
  }

  return (
    <div className="min-w-0">
      <ChartFrame height={220}>
        {({ w, h }) => (
          <BarChart width={w} height={h} data={data} margin={{ top: 8, right: 8, left: 0, bottom: 28 }}>
            <CartesianGrid vertical={false} stroke={p.line} strokeDasharray="3 8" />
            <XAxis dataKey="category" tick={{ fill: p.muted, fontSize: 9 }} interval={0} angle={-28} textAnchor="end" tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const row = payload[0].payload as { category: string; thisMonth: number; lastMonth: number };
                return (
                  <Tip
                    title={row.category}
                    value={`${formatInr(row.thisMonth)} vs ${formatInr(row.lastMonth)}`}
                    ink={p.ink}
                  />
                );
              }}
            />
            <Bar dataKey="lastMonth" fill={p.line} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="thisMonth" fill={p.sageDeep} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        )}
      </ChartFrame>
      <ChartLegend
        items={[
          { color: p.line, label: "Last month" },
          { color: p.sageDeep, label: "This month" },
        ]}
      />
    </div>
  );
}

export function SpendScatter({ expenses, month }: { expenses: Expense[]; month: string }) {
  const p = useChartPalette();
  const data = useMemo(() => {
    return expenses
      .filter((e) => e.occurredOn.startsWith(month))
      .map((e) => ({
        day: Number(e.occurredOn.slice(8, 10)),
        amount: e.amount,
        name: e.reason || e.category,
      }));
  }, [expenses, month]);

  if (data.length === 0) {
    return <div className="grid h-40 place-items-center text-sm text-muted">Log a few spends to see the scatter.</div>;
  }

  return (
    <ChartFrame height={200}>
      {({ w, h }) => (
        <ScatterChart width={w} height={h} margin={{ top: 12, right: 8, left: 4, bottom: 4 }}>
          <CartesianGrid stroke={p.line} strokeDasharray="3 8" />
          <XAxis dataKey="day" name="Day" tick={{ fill: p.muted, fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis dataKey="amount" hide />
          <ZAxis range={[40, 40]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const row = payload[0].payload as { day: number; amount: number; name: string };
              return <Tip title={`Day ${row.day} · ${row.name}`} value={formatInr(row.amount)} ink={p.ink} />;
            }}
          />
          <Scatter data={data} fill={p.terra} isAnimationActive={false} />
        </ScatterChart>
      )}
    </ChartFrame>
  );
}

export function CategoryRadar({
  monthMix,
  averageMix,
}: {
  monthMix: { category: string; amount: number }[];
  averageMix: { category: string; amount: number }[];
}) {
  const p = useChartPalette();
  const data = useMemo(() => {
    const names = [...new Set([...monthMix, ...averageMix].map((c) => c.category))].slice(0, 7);
    const max = Math.max(
      1,
      ...monthMix.map((c) => c.amount),
      ...averageMix.map((c) => c.amount),
    );
    return names.map((category) => ({
      category,
      month: Math.round(((monthMix.find((c) => c.category === category)?.amount ?? 0) / max) * 100),
      usual: Math.round(((averageMix.find((c) => c.category === category)?.amount ?? 0) / max) * 100),
    }));
  }, [monthMix, averageMix]);

  if (data.length < 3) {
    return <div className="grid h-40 place-items-center text-sm text-muted">Need a few categories for a radar.</div>;
  }

  return (
    <div className="min-w-0">
      <ChartFrame height={240}>
        {({ w, h }) => (
          <RadarChart width={w} height={h} data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke={p.line} />
            <PolarAngleAxis dataKey="category" tick={{ fill: p.muted, fontSize: 10 }} />
            <PolarRadiusAxis tick={false} axisLine={false} />
            <Radar name="This month" dataKey="month" stroke={p.terra} fill={p.terra} fillOpacity={0.28} isAnimationActive={false} />
            <Radar name="Usual" dataKey="usual" stroke={p.sageDeep} fill={p.sageDeep} fillOpacity={0.12} isAnimationActive={false} />
          </RadarChart>
        )}
      </ChartFrame>
      <ChartLegend
        items={[
          { color: p.terra, label: "This month" },
          { color: p.sageDeep, label: "Usual mix" },
        ]}
      />
    </div>
  );
}

export function ProjectionBars({
  rows,
}: {
  rows: { category: string; spent: number; projected: number; budget: number | null; remainingDays?: number }[];
}) {
  const p = useChartPalette();
  const closed = rows.every((row) => (row.remainingDays ?? 1) <= 0);
  const data = rows.slice(0, 8).map((row) => ({
    ...row,
    cap: row.budget ?? 0,
  }));
  if (data.length === 0) {
    return <div className="grid h-40 place-items-center text-sm text-muted">No projection until spend lands.</div>;
  }
  return (
    <div className="min-w-0">
      <ChartFrame height={220}>
        {({ w, h }) => (
          <BarChart width={w} height={h} data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
            <CartesianGrid horizontal={false} stroke={p.line} strokeDasharray="3 8" />
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="category" width={100} tick={{ fill: p.muted, fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const row = payload[0].payload as {
                  category: string;
                  spent: number;
                  projected: number;
                  budget: number | null;
                };
                const extra = row.budget != null ? ` · limit ${formatInr(row.budget)}` : "";
                return (
                  <Tip
                    title={row.category}
                    value={
                      closed
                        ? `Closed ${formatInr(row.spent)}${extra}`
                        : `Now ${formatInr(row.spent)} · close ${formatInr(row.projected)}${extra}`
                    }
                    ink={p.ink}
                  />
                );
              }}
            />
            <Bar dataKey="spent" fill={p.sage} radius={[0, 4, 4, 0]} isAnimationActive={false} />
            {closed ? (
              <Bar dataKey="cap" fill={p.ink} radius={[0, 4, 4, 0]} fillOpacity={0.22} isAnimationActive={false} />
            ) : (
              <Bar dataKey="projected" fill={p.terra} radius={[0, 4, 4, 0]} fillOpacity={0.45} isAnimationActive={false} />
            )}
          </BarChart>
        )}
      </ChartFrame>
      <ChartLegend
        items={
          closed
            ? [
                { color: p.sage, label: "Spent" },
                { color: p.ink, label: "Limit", faded: true },
              ]
            : [
                { color: p.sage, label: "Spent so far" },
                { color: p.terra, label: "On pace to close", faded: true },
              ]
        }
      />
    </div>
  );
}

export function MemberSpendBars({ rows }: { rows: MemberSpendRow[] }) {
  const p = useChartPalette();
  const data = rows.filter((row) => row.amount > 0 || rows.length <= 4);
  if (data.length === 0) {
    return <div className="grid h-40 place-items-center text-sm text-muted">No member spend in this month.</div>;
  }
  return (
    <div className="min-w-0">
      <ChartFrame height={Math.max(160, data.length * 44)}>
        {({ w, h }) => (
          <BarChart width={w} height={h} data={data} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
            <CartesianGrid horizontal={false} stroke={p.line} strokeDasharray="3 8" />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={92}
              tick={{ fill: p.muted, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const row = payload[0].payload as MemberSpendRow;
                return (
                  <Tip
                    title={row.name}
                    value={`${formatInr(row.amount)} · ${Math.round(row.share * 100)}%`}
                    ink={p.ink}
                  />
                );
              }}
            />
            <Bar dataKey="amount" fill={p.sageDeep} radius={[0, 4, 4, 0]} isAnimationActive={false} />
          </BarChart>
        )}
      </ChartFrame>
      <ul className="mt-2 flex flex-col gap-2">
        {data.map((row) => (
          <li key={row.userId} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{row.name}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {formatInr(row.amount)} · {Math.round(row.share * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChildrenTrend({
  expenses,
  months = lastNMonthKeys(LOOKBACK_MONTHS),
}: {
  expenses: Expense[];
  months?: string[];
}) {
  const p = useChartPalette();
  const data = useMemo(() => {
    return months.map((m) => {
      let amount = 0;
      for (const e of expenses) {
        if (!e.occurredOn.startsWith(m)) continue;
        amount += e.amount;
      }
      return { month: m, label: shortMonthLabel(m), amount };
    });
  }, [expenses, months]);
  const tickEvery = Math.max(1, Math.ceil(data.length / 6));
  const total = data.reduce((s, row) => s + row.amount, 0);
  if (total === 0) {
    return (
      <div className="grid h-40 place-items-center text-sm text-muted">
        Tag spends as For whom: Children to see this trend.
      </div>
    );
  }
  return (
    <ChartFrame height={180}>
      {({ w, h }) => (
        <AreaChart width={w} height={h} data={data} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="keepKids" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={p.plum} stopOpacity={0.4} />
              <stop offset="100%" stopColor={p.plum} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={p.line} strokeDasharray="3 8" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            interval={0}
            ticks={data.filter((_, i) => i % tickEvery === 0).map((d) => d.month)}
            tickFormatter={(value: string) => data.find((d) => d.month === value)?.label ?? value}
            tick={{ fill: p.muted, fontSize: 10 }}
          />
          <YAxis hide />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const row = payload[0].payload as { amount: number; label: string };
              return <Tip title={row.label} value={formatInr(row.amount)} ink={p.ink} />;
            }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke={p.plum}
            strokeWidth={2}
            fill="url(#keepKids)"
            isAnimationActive={false}
          />
        </AreaChart>
      )}
    </ChartFrame>
  );
}
