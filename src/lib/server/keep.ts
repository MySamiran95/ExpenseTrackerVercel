import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, type Sql } from "@/lib/db";
import {
  analyzeSpending,
  buildCoachNarrative,
  buildMonthClose,
  buildSuggestions,
  CATEGORIES,
  formatInr,
  isValidIsoDate,
  lastNMonthKeys,
  LOOKBACK_MONTHS,
  monthEnd,
  monthKey,
  monthLabel,
  monthStart,
  parseAmount,
  shiftMonth,
  last4Digits,
  type AppNotification,
  type BackupCadence,
  type Budget,
  type DashboardPayload,
  type Expense,
  type Household,
  type InsightCadence,
  type Investment,
  type JoinRequest,
  type LedgerScope,
  type Member,
  type MonthlyReport,
  type PaymentCard,
  type IdentityDoc,
  type Trip,
  asInsightCadence,
} from "@/lib/keep";

function money(v: string | number | null | undefined): number {
  return parseAmount(v);
}

function asId(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function inviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function asDay(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value.length >= 10 ? value.slice(0, 10) : value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return isoDate(value);
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function unwrap<T>(schema: z.ZodType<T>) {
  return (input: unknown): T => {
    if (input && typeof input === "object" && "data" in input) {
      const inner = (input as { data: unknown }).data;
      const nested = schema.safeParse(inner);
      if (nested.success) return nested.data;
    }
    return schema.parse(input);
  };
}

async function insertRows(sql: Sql, table: string, columns: string[], rows: unknown[][]) {
  if (rows.length === 0) return;
  const width = columns.length;
  const placeholders = rows.map((_, i) => {
    const parts = columns.map((__, j) => `$${i * width + j + 1}`);
    return `(${parts.join(",")})`;
  });
  await sql.query(
    `insert into ${table} (${columns.join(", ")}) values ${placeholders.join(", ")}`,
    rows.flat(),
  );
}

function inMonth(key: string, day: number): string {
  const [y, m] = key.split("-").map(Number);
  const max = new Date(y, m, 0).getDate();
  return `${key}-${String(Math.min(Math.max(day, 1), max)).padStart(2, "0")}`;
}

type MemberRow = {
  household_id: number;
  role: string;
  display_name: string;
  name: string;
  invite_code: string;
  owner_user_id: string;
  monthly_limit: string | number;
  kind: string;
};

async function listMemberships(sql: Sql, userId: string): Promise<MemberRow[]> {
  return sql<MemberRow>`
    select m.household_id, m.role, m.display_name, h.name, h.invite_code,
           h.owner_user_id, h.monthly_limit, coalesce(h.kind, 'family') as kind
    from household_members m
    join households h on h.id = m.household_id
    where m.user_id = ${userId} and m.left_at is null
    order by case when coalesce(h.kind, 'family') = 'personal' then 0 else 1 end, m.created_at asc
  `;
}

function asScope(value: unknown): LedgerScope {
  return value === "family" ? "family" : "personal";
}

function asCadence(value: unknown): BackupCadence {
  if (value === "daily" || value === "weekly" || value === "monthly" || value === "off") return value;
  return "weekly";
}

async function membership(
  sql: Sql,
  userId: string,
  scope?: LedgerScope,
): Promise<MemberRow | null> {
  const rows = await listMemberships(sql, userId);
  let want = scope;
  if (!want) {
    const profile = await sql<{ last_scope: string | null }>`
      select last_scope from user_profiles where user_id = ${userId} limit 1
    `;
    want = asScope(profile[0]?.last_scope);
  }
  if (want === "family") return rows.find((r) => r.kind === "family") ?? rows.find((r) => r.kind === "personal") ?? null;
  return rows.find((r) => r.kind === "personal") ?? rows[0] ?? null;
}

async function ensurePersonalHousehold(
  sql: Sql,
  userId: string,
  displayName: string,
  seed: boolean,
): Promise<MemberRow> {
  const existing = await membership(sql, userId, "personal");
  if (existing) return existing;
  const code = await uniqueInvite(sql);
  const inserted = await sql<{ id: number }>`
    insert into households (name, invite_code, owner_user_id, kind)
    values ('Personal', ${code}, ${userId}, 'personal')
    returning id
  `;
  const id = inserted[0]!.id;
  await sql`
    insert into household_members (household_id, user_id, role, display_name)
    values (${id}, ${userId}, 'owner', ${displayName})
    on conflict (household_id, user_id) do update set display_name = excluded.display_name
  `;
  if (seed) {
    try {
      await seedHousehold(sql, id, userId);
    } catch (err) {
      console.error("seed personal household failed", err);
    }
  }
  const row = await membership(sql, userId, "personal");
  if (!row) throw new Error("Could not open your personal ledger");
  return row;
}

function toHousehold(row: MemberRow): Household {
  return {
    id: row.household_id,
    name: row.name,
    inviteCode: row.invite_code,
    ownerUserId: row.owner_user_id,
    monthlyLimit: money(row.monthly_limit),
    role: row.role === "owner" ? "owner" : "member",
    kind: row.kind === "personal" ? "personal" : "family",
  };
}

type ExpenseRow = {
  id: number;
  household_id: number;
  user_id: string;
  occurred_on: string;
  category: string;
  subcategory: string;
  subcategory_other: string | null;
  for_whom: string;
  for_whom_other: string | null;
  from_whom: string;
  from_whom_other: string | null;
  payment_mode: string;
  reason: string;
  amount: string | number;
  is_sample: boolean;
  recorder_name: string | null;
  trip_id: number | null;
  trip_name: string | null;
};

function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    householdId: row.household_id,
    userId: row.user_id,
    occurredOn: asDay(row.occurred_on),
    category: row.category,
    subcategory: row.subcategory,
    subcategoryOther: row.subcategory_other,
    forWhom: row.for_whom,
    forWhomOther: row.for_whom_other,
    fromWhom: row.from_whom,
    fromWhomOther: row.from_whom_other,
    paymentMode: row.payment_mode,
    reason: row.reason,
    amount: money(row.amount),
    isSample: Boolean(row.is_sample),
    recorderName: row.recorder_name ?? "Family",
    tripId: asId(row.trip_id),
    tripName: row.trip_name,
  };
}

type InvestRow = {
  id: number;
  household_id: number;
  user_id: string;
  invested_on: string;
  kind: string;
  subcategory: string;
  subcategory_other: string | null;
  name: string;
  institution: string;
  amount: string | number;
  notes: string;
  is_sample: boolean;
};

function toInvest(row: InvestRow): Investment {
  return {
    id: row.id,
    householdId: row.household_id,
    userId: row.user_id,
    investedOn: asDay(row.invested_on),
    kind: row.kind,
    subcategory: row.subcategory,
    subcategoryOther: row.subcategory_other,
    name: row.name,
    institution: row.institution,
    amount: money(row.amount),
    notes: row.notes,
    isSample: Boolean(row.is_sample),
  };
}

async function loadExpenses(sql: Sql, householdId: number, from: string, to: string): Promise<Expense[]> {
  const rows = await sql<ExpenseRow>`
    select e.*, coalesce(m.display_name, '') as recorder_name, t.name as trip_name
    from expenses e
    left join household_members m
      on m.household_id = e.household_id and m.user_id = e.user_id
    left join trips t on t.id = e.trip_id
    where e.household_id = ${householdId}
      and e.occurred_on >= ${from}
      and e.occurred_on <= ${to}
    order by e.occurred_on desc, e.id desc
  `;
  return rows.map(toExpense);
}

async function loadTrips(sql: Sql, householdId: number): Promise<Trip[]> {
  const rows = await sql<{
    id: number;
    name: string;
    started_on: string | null;
    ended_on: string | null;
    notes: string;
    budget_limit: string | number | null;
    total: string | number | null;
    count: number;
  }>`
    select t.id, t.name, t.started_on, t.ended_on, t.notes, t.budget_limit,
           coalesce((select sum(e.amount) from expenses e where e.trip_id = t.id and e.household_id = t.household_id), 0) as total,
           coalesce((select count(*)::int from expenses e where e.trip_id = t.id and e.household_id = t.household_id), 0) as count
    from trips t
    where t.household_id = ${householdId}
    order by t.created_at desc, t.id desc
  `;
  return rows.map((r) => ({
    id: Number(r.id),
    name: r.name,
    startedOn: r.started_on ? asDay(r.started_on) : null,
    endedOn: r.ended_on ? asDay(r.ended_on) : null,
    notes: r.notes,
    total: money(r.total),
    count: Number(r.count ?? 0),
    budgetLimit: money(r.budget_limit),
  }));
}

async function loadJoinRequests(sql: Sql, householdId: number): Promise<JoinRequest[]> {
  const rows = await sql<{
    id: number;
    user_id: string;
    display_name: string;
    status: string;
    created_at: string;
  }>`
    select id, user_id, display_name, status, created_at
    from household_join_requests
    where household_id = ${householdId} and status = 'pending'
    order by created_at desc
  `;
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    displayName: r.display_name || "Someone",
    status: "pending" as const,
    createdAt: typeof r.created_at === "string" ? r.created_at : String(r.created_at),
  }));
}

async function loadInvestments(sql: Sql, householdId: number): Promise<Investment[]> {
  const rows = await sql<InvestRow>`
    select * from investments
    where household_id = ${householdId}
    order by invested_on desc, id desc
  `;
  return rows.map(toInvest);
}

async function loadBudgets(sql: Sql, householdId: number): Promise<Budget[]> {
  const rows = await sql<{
    id: number;
    category: string;
    month: string;
    limit_amount: string | number;
  }>`select id, category, month, limit_amount from budgets where household_id = ${householdId}`;
  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    month: r.month,
    limitAmount: money(r.limit_amount),
  }));
}

async function loadNotifications(sql: Sql, householdId: number): Promise<AppNotification[]> {
  const rows = await sql<{
    id: number;
    kind: string;
    title: string;
    body: string;
    href: string | null;
    read: boolean;
    created_at: string;
  }>`
    select id, kind, title, body, href, read, created_at
    from notifications
    where household_id = ${householdId}
    order by created_at desc
    limit 40
  `;
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body,
    href: r.href,
    read: Boolean(r.read),
    createdAt: typeof r.created_at === "string" ? r.created_at : String(r.created_at),
  }));
}

async function loadMembers(sql: Sql, householdId: number, month: string): Promise<Member[]> {
  const from = monthStart(month);
  const to = monthEnd(month);
  const rows = await sql<{
    user_id: string;
    display_name: string;
    role: string;
    spent: string | number | null;
  }>`
    select m.user_id, m.display_name, m.role,
           coalesce((
             select sum(e.amount) from expenses e
             where e.household_id = m.household_id
               and e.user_id = m.user_id
               and e.occurred_on >= ${from}
               and e.occurred_on <= ${to}
           ), 0) as spent
    from household_members m
    where m.household_id = ${householdId} and m.left_at is null
    order by m.created_at asc
  `;
  return rows.map((r) => ({
    userId: r.user_id,
    displayName: r.display_name || "Member",
    role: r.role === "owner" ? "owner" : "member",
    spentThisMonth: money(r.spent),
  }));
}

function toReport(row: {
  id: number;
  month: string;
  total_spend: string | number;
  total_invest: string | number;
  top_category: string | null;
  vs_previous: string | number | null;
  summary: string;
  suggestions: unknown;
  breakdown: unknown;
}): MonthlyReport {
  const suggestions = Array.isArray(row.suggestions)
    ? (row.suggestions as unknown[]).map(String)
    : [];
  const breakdown = Array.isArray(row.breakdown)
    ? (row.breakdown as { category?: string; amount?: number }[]).map((b) => ({
        category: String(b.category ?? ""),
        amount: Number(b.amount ?? 0),
      }))
    : [];
  return {
    id: row.id,
    month: row.month,
    totalSpend: money(row.total_spend),
    totalInvest: money(row.total_invest),
    topCategory: row.top_category,
    vsPrevious: row.vs_previous == null ? null : Number(row.vs_previous),
    summary: row.summary,
    suggestions,
    breakdown,
  };
}

async function generateReport(sql: Sql, householdId: number, month: string): Promise<MonthlyReport> {
  const from = monthStart(shiftMonth(month, -LOOKBACK_MONTHS));
  const to = monthEnd(month);
  const expenses = await loadExpenses(sql, householdId, from, to);
  const invests = await loadInvestments(sql, householdId);
  const budgets = await loadBudgets(sql, householdId);
  const close = buildMonthClose({ expenses, investments: invests, month });
  const prev = shiftMonth(month, -1);
  const prevExp = expenses.filter((e) => e.occurredOn.startsWith(prev) && e.tripId == null);
  const prevTotal = prevExp.reduce((s, e) => s + e.amount, 0);
  const byCategory: Record<string, number> = {};
  for (const e of expenses.filter((e) => e.occurredOn.startsWith(month) && e.tripId == null)) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  }
  const breakdown = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
  const top = breakdown[0]?.category ?? close.topCategories[0]?.name ?? null;
  const vs = close.vsPrevious;
  const suggestions = [
    ...close.decisions,
    ...buildSuggestions({
      monthSpend: close.everyday,
      byCategory,
      budgets,
      investmentsMonth: close.invest,
      prevSpend: prevExp.length ? prevTotal : null,
    }).map((s) => `${s.title}: ${s.body}`),
  ];
  const summary = [close.summary, ...close.habits.slice(0, 3)].join(" ");

  const suggestionsJson = JSON.stringify(suggestions);
  const breakdownJson = JSON.stringify(breakdown);
  const vsValue = vs == null ? null : Number(vs.toFixed(2));

  await sql.query(
    `insert into monthly_reports (
      household_id, month, total_spend, total_invest, top_category, vs_previous, summary, suggestions, breakdown
    ) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb)
    on conflict (household_id, month) do update set
      total_spend = excluded.total_spend,
      total_invest = excluded.total_invest,
      top_category = excluded.top_category,
      vs_previous = excluded.vs_previous,
      summary = excluded.summary,
      suggestions = excluded.suggestions,
      breakdown = excluded.breakdown`,
    [householdId, month, close.everyday, close.invest, top, vsValue, summary, suggestionsJson, breakdownJson],
  );

  const rows = await sql<{
    id: number;
    month: string;
    total_spend: string | number;
    total_invest: string | number;
    top_category: string | null;
    vs_previous: string | number | null;
    summary: string;
    suggestions: unknown;
    breakdown: unknown;
  }>`
    select id, month, total_spend, total_invest, top_category, vs_previous, summary, suggestions, breakdown
    from monthly_reports
    where household_id = ${householdId} and month = ${month}
    limit 1
  `;
  return toReport(rows[0]!);
}

async function maybeCloseLastMonth(sql: Sql, householdId: number, currentMonth: string) {
  try {
    const prev = shiftMonth(currentMonth, -1);
    const existing = await sql<{ id: number }>`
      select id from monthly_reports
      where household_id = ${householdId} and month = ${prev}
      limit 1
    `;
    if (existing[0]) return;
    const count = await sql<{ n: number }>`
      select count(*)::int as n from expenses
      where household_id = ${householdId}
        and occurred_on >= ${monthStart(prev)}
        and occurred_on <= ${monthEnd(prev)}
    `;
    if (!count[0] || count[0].n === 0) return;
    const report = await generateReport(sql, householdId, prev);
    const title = `Monthly report · ${prev}`;
    const dup = await sql<{ id: number }>`
      select id from notifications
      where household_id = ${householdId} and kind = 'report' and title = ${title}
      limit 1
    `;
    if (!dup[0]) {
      await sql`
        insert into notifications (household_id, kind, title, body, href)
        values (
          ${householdId},
          'report',
          ${title},
          ${report.summary},
          '/reports'
        )
      `;
    }
  } catch (err) {
    console.error("maybeCloseLastMonth failed", err);
  }
}

async function seedHousehold(sql: Sql, householdId: number, userId: string) {
  const existing = await sql<{ n: number }>`
    select count(*)::int as n from expenses where household_id = ${householdId}
  `;
  if (existing[0] && existing[0].n > 0) return;

  const months = lastNMonthKeys(LOOKBACK_MONTHS);
  const samples: unknown[][] = [];
  const investRows: unknown[][] = [];

  for (let i = 0; i < months.length; i += 1) {
    const key = months[i]!;
    const season = Number(key.slice(5, 7));
    const drift = 1 + (i - 12) * 0.012;
    const festive = season === 10 || season === 11 ? 1.28 : season === 4 || season === 5 ? 1.12 : 1;

    samples.push(
      [householdId, userId, inMonth(key, 2), "House", "House Rent", "Household", "Self", "Net Banking", "Paid house rent", Math.round(18500 * drift), true],
      [householdId, userId, inMonth(key, 3), "Groceries", "Vegetables", "Family", "Self", "UPI", "Weekly vegetables and staples", Math.round(2200 * drift), true],
      [householdId, userId, inMonth(key, 5), "Vehicle", "Petrol / Charge", "Self", "Self", "Credit Card", "Petrol fill", Math.round(2400 * drift), true],
      [householdId, userId, inMonth(key, 6), "Subscriptions", "OTT", "Household", "Self", "Credit Card", "Netflix + iCloud", 649, true],
      [householdId, userId, inMonth(key, 8), "Entertainment", "Restaurants", "Family", "Self", "UPI", "Dinner from Swiggy", Math.round(780 * festive), true],
      [householdId, userId, inMonth(key, 12), "Groceries", "Dairy", "Family", "Spouse", "UPI", "BigBasket monthly", Math.round(4100 * drift), true],
      [householdId, userId, inMonth(key, 16), "House", "Electricity Bill", "Household", "Self", "UPI", "Electricity bill", Math.round(1800 + (season > 3 && season < 7 ? 900 : 200)), true],
      [householdId, userId, inMonth(key, 21), "Entertainment", "Food", "Self", "Self", "UPI", "Coffee catch-up", 280, true],
      [householdId, userId, inMonth(key, 23), "Wellbeing", "Physical Activities", "Self", "Self", "UPI", "Gym membership", 1500, true],
      [householdId, userId, inMonth(key, 26), "Subscriptions", "Mobile", "Self", "Self", "UPI", "Jio recharge", 299, true],
    );

    if (i % 5 === 0) {
      samples.push([householdId, userId, inMonth(key, 9), "Fashion", "Clothes", "Self", "Self", "Debit Card", "Weekend mall restock", Math.round(1800 * festive), true]);
    }
    if (i % 2 === 0) {
      samples.push([householdId, userId, inMonth(key, 14), "Travel", "Rickshaw", "Self", "Self", "Wallet", "Office auto", Math.round(320 + i * 8), true]);
    }
    if (i % 3 === 0) {
      samples.push([householdId, userId, inMonth(key, 18), "Entertainment", "Movies", "Spouse", "Self", "UPI", "Weekend film", Math.round(720 * festive), true]);
    }
    if (i % 4 === 1) {
      samples.push([householdId, userId, inMonth(key, 10), "Household", "Household Items", "Self", "Self", "Credit Card", "Amazon household restock", Math.round(1600 * festive), true]);
    }
    if (i % 4 === 2) {
      samples.push([householdId, userId, inMonth(key, 24), "Giving", "Parents", "Parents", "Self", "UPI", "UPI to mom", 3000, true]);
    }
    if (i % 6 === 0) {
      samples.push([householdId, userId, inMonth(key, 19), "Education", "School Fees", "Children", "Self", "Net Banking", "Term school fees", 8000, true]);
    }
    if (i % 3 === 1) {
      samples.push([householdId, userId, inMonth(key, 11), "Medical", "Physician", "Children", "Self", "UPI", "Paediatric visit", 900, true]);
    }
    if (i % 2 === 1) {
      samples.push([householdId, userId, inMonth(key, 7), "Groceries", "Dairy", "Children", "Self", "UPI", "Milk and fruit for the kids", Math.round(680 * drift), true]);
    }
    if (i % 5 === 2) {
      samples.push([householdId, userId, inMonth(key, 22), "Electronics", "Phone", "Self", "Self", "EMI", "Phone EMI", 4500, true]);
    }
    samples.push([householdId, userId, inMonth(key, 2), "House", "House Purchase", "Household", "Self", "EMI", "Home loan EMI", 18500, true]);
    if (season === 10) {
      samples.push([householdId, userId, inMonth(key, 15), "Fashion", "Clothes", "Spouse", "Self", "Credit Card", "Festive shopping", 5200, true]);
    }
    if (i === months.length - 2) {
      samples.push([householdId, userId, inMonth(key, 27), "Travel", "Food", "Family", "Self", "UPI", "Weekend trip fuel + food", 3600, true]);
    }

    investRows.push([
      householdId, userId, inMonth(key, 5), "MF", "Equity", "HDFC Flexi Cap SIP", "HDFC AMC", 5000, "Monthly SIP", true,
    ]);
    if (i % 3 === 0) {
      investRows.push([
        householdId, userId, inMonth(key, 1), "NPS", "Tier I", "NPS contribution", "Protean", 2000, "Retirement", true,
      ]);
    }
  }

  const latest = months[months.length - 1]!;
  const older = months[Math.max(months.length - 8, 0)]!;
  investRows.push(
    [householdId, userId, inMonth(latest, 8), "Gold", "Digital", "Digital gold", "MMTC-PAMP", 3000, "Gram by gram", true],
    [householdId, userId, inMonth(latest, 12), "FD", "Bank", "SBI tax saver FD", "SBI", 25000, "12 month", true],
    [householdId, userId, inMonth(older, 18), "LIC", "Term", "Term premium", "LIC", 5500, "Annual premium slice", true],
  );

  await insertRows(
    sql,
    "expenses",
    ["household_id", "user_id", "occurred_on", "category", "subcategory", "for_whom", "from_whom", "payment_mode", "reason", "amount", "is_sample"],
    samples,
  );

  await insertRows(
    sql,
    "investments",
    ["household_id", "user_id", "invested_on", "kind", "subcategory", "name", "institution", "amount", "notes", "is_sample"],
    investRows,
  );

  const budgetMap: Record<string, number> = {
    House: 25000,
    Groceries: 12000,
    Vehicle: 8000,
    Subscriptions: 2500,
    Fashion: 6000,
    Entertainment: 4000,
    Education: 10000,
    Medical: 4000,
    Wellbeing: 3000,
    Giving: 5000,
    Electronics: 5000,
  };
  await insertRows(
    sql,
    "budgets",
    ["household_id", "category", "month", "limit_amount"],
    Object.entries(budgetMap).map(([category, limit]) => [householdId, category, "recurring", limit]),
  );
}

function asTheme(value: unknown): "light" | "dark" {
  return value === "dark" ? "dark" : "light";
}

async function ensureProfile(
  sql: Sql,
  userId: string,
  displayName: string,
): Promise<{
  display_name: string;
  onboarding_done: boolean;
  theme: "light" | "dark";
  last_scope: LedgerScope;
  backup_cadence: BackupCadence;
  last_backup_at: string | null;
  insight_cadence: InsightCadence;
}> {
  const existing = await sql<{
    display_name: string;
    onboarding_done: boolean;
    theme: string | null;
    last_scope: string | null;
    backup_cadence: string | null;
    last_backup_at: string | null;
    insight_cadence: string | null;
  }>`
    select display_name, onboarding_done, theme, last_scope, backup_cadence, last_backup_at, insight_cadence
    from user_profiles where user_id = ${userId}
  `;
  if (existing[0]) {
    if (!existing[0].display_name && displayName) {
      await sql`update user_profiles set display_name = ${displayName} where user_id = ${userId}`;
      return {
        display_name: displayName,
        onboarding_done: existing[0].onboarding_done,
        theme: asTheme(existing[0].theme),
        last_scope: asScope(existing[0].last_scope),
        backup_cadence: asCadence(existing[0].backup_cadence),
        last_backup_at: existing[0].last_backup_at,
        insight_cadence: asInsightCadence(existing[0].insight_cadence),
      };
    }
    return {
      display_name: existing[0].display_name,
      onboarding_done: existing[0].onboarding_done,
      theme: asTheme(existing[0].theme),
      last_scope: asScope(existing[0].last_scope),
      backup_cadence: asCadence(existing[0].backup_cadence),
      last_backup_at: existing[0].last_backup_at,
      insight_cadence: asInsightCadence(existing[0].insight_cadence),
    };
  }
  await sql`
    insert into user_profiles (user_id, display_name)
    values (${userId}, ${displayName})
    on conflict (user_id) do nothing
  `;
  return {
    display_name: displayName,
    onboarding_done: false,
    theme: "light",
    last_scope: "personal",
    backup_cadence: "weekly",
    last_backup_at: null,
    insight_cadence: "weekly",
  };
}

async function uniqueInvite(sql: Sql): Promise<string> {
  for (let i = 0; i < 8; i += 1) {
    const code = inviteCode();
    const hit = await sql<{ id: number }>`select id from households where invite_code = ${code} limit 1`;
    if (!hit[0]) return code;
  }
  return inviteCode() + inviteCode().slice(0, 2);
}

const emptyDashboard = (
  displayName: string,
  email: string | null,
  month: string,
  theme: "light" | "dark" = "light",
  extras?: {
    backupCadence?: BackupCadence;
    lastBackupAt?: string | null;
    scope?: LedgerScope;
    insightCadence?: InsightCadence;
  },
): DashboardPayload => ({
  profile: {
    displayName,
    onboardingDone: false,
    email,
    theme,
    backupCadence: extras?.backupCadence ?? "weekly",
    lastBackupAt: extras?.lastBackupAt ?? null,
    insightCadence: extras?.insightCadence ?? "weekly",
  },
  household: null,
  scope: extras?.scope ?? "personal",
  hasFamily: false,
  members: [],
  expenses: [],
  investments: [],
  budgets: [],
  notifications: [],
  report: null,
  month,
  trips: [],
  joinRequests: [],
});

async function sessionName(fallback: string, bearerToken?: string): Promise<string> {
  try {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const u = await getSessionUser(bearerToken);
    const fromEmail = u?.email?.split("@")[0]?.replace(/[._]+/g, " ").trim();
    if (fromEmail && fromEmail.toLowerCase() !== "you") {
      return fromEmail.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  } catch {
    // ignore
  }
  return fallback;
}

async function loadDashboard(
  sql: Sql,
  userId: string,
  month: string,
  opts?: { closeLastMonth?: boolean; bearerToken?: string },
): Promise<DashboardPayload> {
  const guessed = await sessionName("You", opts?.bearerToken);
  const profile = await ensureProfile(sql, userId, guessed);
  const all = await listMemberships(sql, userId);
  const family = all.find((r) => r.kind === "family") ?? null;
  const othersHaveData = all.some((r) => r.kind !== "personal");
  const firstOpen = !profile.onboarding_done;
  if (firstOpen) {
    await sql`update user_profiles set onboarding_done = true where user_id = ${userId}`;
    profile.onboarding_done = true;
  }
  const personal = await ensurePersonalHousehold(
    sql,
    userId,
    profile.display_name || guessed,
    firstOpen && !othersHaveData,
  );
  let scope: LedgerScope = profile.last_scope;
  if (scope === "family" && !family) scope = "personal";
  const row = scope === "family" && family ? family : personal;
  if (opts?.closeLastMonth !== false) {
    await maybeCloseLastMonth(sql, row.household_id, monthKey());
  }
  try {
    await reconcileAlerts(sql, row.household_id);
  } catch (err) {
    console.error("reconcileAlerts failed", err);
  }
  const fromPrev = "2000-01-01";
  const to = monthEnd(monthKey() >= month ? monthKey() : month);
  let expenses: Expense[] = [];
  let investments: Investment[] = [];
  let budgets: Budget[] = [];
  let notifications: AppNotification[] = [];
  let members: Member[] = [];
  let trips: Trip[] = [];
  let joinRequests: JoinRequest[] = [];
  try {
    [expenses, investments, budgets, notifications, members, trips] = await Promise.all([
      loadExpenses(sql, row.household_id, fromPrev, to),
      loadInvestments(sql, row.household_id),
      loadBudgets(sql, row.household_id),
      loadNotifications(sql, row.household_id),
      loadMembers(sql, row.household_id, month),
      loadTrips(sql, row.household_id),
    ]);
    if (row.role === "owner" && row.kind === "family") {
      joinRequests = await loadJoinRequests(sql, row.household_id);
    }
  } catch (err) {
    console.error("loadDashboard lists failed", err);
  }
  let report: MonthlyReport | null = null;
  try {
    const prev = shiftMonth(monthKey(), -1);
    const reportRows = await sql<{
      id: number;
      month: string;
      total_spend: string | number;
      total_invest: string | number;
      top_category: string | null;
      vs_previous: string | number | null;
      summary: string;
      suggestions: unknown;
      breakdown: unknown;
    }>`
      select id, month, total_spend, total_invest, top_category, vs_previous, summary, suggestions, breakdown
      from monthly_reports
      where household_id = ${row.household_id} and month = ${prev}
      limit 1
    `;
    report = reportRows[0] ? toReport(reportRows[0]) : null;
  } catch (err) {
    console.error("loadDashboard report failed", err);
  }
  return {
    profile: {
      displayName: row.display_name || profile.display_name || guessed,
      onboardingDone: profile.onboarding_done,
      email: null,
      theme: profile.theme,
      backupCadence: profile.backup_cadence,
      lastBackupAt: profile.last_backup_at,
      insightCadence: profile.insight_cadence,
    },
    household: toHousehold(row),
    scope: row.kind === "personal" ? "personal" : "family",
    hasFamily: Boolean(family),
    members,
    expenses,
    investments,
    budgets,
    notifications,
    report,
    month,
    trips,
    joinRequests,
  };
}

function monthFromInput(input: unknown): string {
  const raw =
    input && typeof input === "object" && "month" in input
      ? (input as { month?: unknown }).month
      : input && typeof input === "object" && "data" in input
        ? (input as { data?: { month?: unknown } }).data?.month
        : undefined;
  return typeof raw === "string" && /^\d{4}-\d{2}$/.test(raw) ? raw : monthKey();
}

export const getDashboard = createServerFn({ method: "GET" })
  .validator((input: unknown) => input ?? {})
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<DashboardPayload> => {
    const sql = await getSql();
    const month = monthFromInput(data);
    try {
      return await loadDashboard(sql, context.userId, month, {
        bearerToken: (context as { bearerToken?: string }).bearerToken,
      });
    } catch (err) {
      console.error("getDashboard failed", err);
      try {
        const profile = await ensureProfile(sql, context.userId, "You");
        const row = await membership(sql, context.userId);
        if (!row) {
          return emptyDashboard(profile.display_name || "You", null, month, profile.theme, {
            backupCadence: profile.backup_cadence,
            lastBackupAt: profile.last_backup_at,
            scope: profile.last_scope,
            insightCadence: profile.insight_cadence,
          });
        }
        return {
          profile: {
            displayName: row.display_name || profile.display_name || "You",
            onboardingDone: profile.onboarding_done,
            email: null,
            theme: profile.theme,
            backupCadence: profile.backup_cadence,
            lastBackupAt: profile.last_backup_at,
            insightCadence: profile.insight_cadence,
          },
          household: toHousehold(row),
          scope: row.kind === "personal" ? "personal" : "family",
          hasFamily: row.kind === "family",
          members: [],
          expenses: [],
          investments: [],
          budgets: [],
          notifications: [],
          report: null,
          month,
          trips: [],
          joinRequests: [],
        };
      } catch {
        throw err;
      }
    }
  });

const householdInput = z.object({
  name: z.string().trim().min(1).max(80),
  displayName: z.string().trim().min(1).max(80),
});

export const createHousehold = createServerFn({ method: "POST" })
  .validator(unwrap(householdInput))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<DashboardPayload> => {
    const sql = await getSql();
    await ensureProfile(sql, context.userId, data.displayName);
    await ensurePersonalHousehold(sql, context.userId, data.displayName, false);
    const family = await membership(sql, context.userId, "family");
    if (!family) {
      const code = await uniqueInvite(sql);
      const inserted = await sql<{ id: number }>`
        insert into households (name, invite_code, owner_user_id, kind)
        values (${data.name}, ${code}, ${context.userId}, 'family')
        returning id
      `;
      const id = inserted[0]!.id;
      await sql`
        insert into household_members (household_id, user_id, role, display_name)
        values (${id}, ${context.userId}, 'owner', ${data.displayName})
      `;
    }
    await sql`
      insert into user_profiles (user_id, display_name, onboarding_done, last_scope)
      values (${context.userId}, ${data.displayName}, true, 'family')
      on conflict (user_id) do update set
        display_name = excluded.display_name,
        onboarding_done = true,
        last_scope = 'family'
    `;
    await sql`
      update household_members set display_name = ${data.displayName}
      where user_id = ${context.userId}
    `;
    return loadDashboard(sql, context.userId, monthKey(), { closeLastMonth: false });
  });

const joinInput = z.object({
  code: z.string().trim().min(4).max(12),
  displayName: z.string().trim().min(1).max(80),
});

export const joinHousehold = createServerFn({ method: "POST" })
  .validator(unwrap(joinInput))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<DashboardPayload> => {
    const sql = await getSql();
    const code = data.code.trim().toUpperCase();
    const house = await sql<{ id: number; kind: string; name: string; owner_user_id: string }>`
      select id, coalesce(kind, 'family') as kind, name, owner_user_id
      from households where invite_code = ${code} limit 1
    `;
    if (!house[0]) throw new Error("Invite code not found");
    if (house[0].kind === "personal") throw new Error("That ledger is personal and cannot be joined");
    if (house[0].owner_user_id === context.userId) throw new Error("You already own this household");
    const already = await membership(sql, context.userId, "family");
    if (already && already.household_id === house[0].id) {
      throw new Error("You are already in this household");
    }
    if (already && already.household_id !== house[0].id) {
      throw new Error("Leave your current family household before joining another.");
    }
    await sql`
      insert into household_join_requests (household_id, user_id, display_name, status)
      values (${house[0].id}, ${context.userId}, ${data.displayName}, 'pending')
      on conflict (household_id, user_id) do update set
        display_name = excluded.display_name,
        status = 'pending'
    `;
    await sql`
      insert into notifications (household_id, kind, title, body, href)
      values (
        ${house[0].id},
        'join_request',
        ${`${data.displayName} asked to join`},
        ${`${data.displayName} wants to share this family ledger. Accept them from Family.`},
        '/family'
      )
    `;
    await sql`
      insert into user_profiles (user_id, display_name, onboarding_done)
      values (${context.userId}, ${data.displayName}, true)
      on conflict (user_id) do update set display_name = excluded.display_name, onboarding_done = true
    `;
    return loadDashboard(sql, context.userId, monthKey(), { closeLastMonth: false });
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await sql`
      insert into user_profiles (user_id, onboarding_done)
      values (${context.userId}, true)
      on conflict (user_id) do update set onboarding_done = true
    `;
    return { ok: true as const };
  });

const themeInput = z.object({
  theme: z.enum(["light", "dark"]),
});

export const saveTheme = createServerFn({ method: "POST" })
  .validator(unwrap(themeInput))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into user_profiles (user_id, theme)
      values (${context.userId}, ${data.theme})
      on conflict (user_id) do update set theme = excluded.theme
    `;
    return { ok: true as const, theme: data.theme };
  });

const expenseInput = z.object({
  id: z.number().optional(),
  occurredOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a real calendar date")
    .refine(isValidIsoDate, "That day does not exist in this month (September ends on the 30th)."),
  category: z.string().min(1),
  subcategory: z.string().min(1),
  subcategoryOther: z.string().max(80).optional().nullable(),
  forWhom: z.string().min(1),
  forWhomOther: z.string().max(80).optional().nullable(),
  fromWhom: z.string().min(1),
  fromWhomOther: z.string().max(80).optional().nullable(),
  paymentMode: z.string().min(1),
  reason: z.string().trim().min(1, "Add a reason").max(240),
  amount: z.number().positive().max(1_000_000_000),
  spentByUserId: z.string().min(1).max(120).optional(),
  tripId: z.number().int().positive().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.subcategory === "Others" && !data.subcategoryOther?.trim()) {
    ctx.addIssue({ code: "custom", message: "Describe the other subcategory", path: ["subcategoryOther"] });
  }
  if (data.forWhom === "Others" && !data.forWhomOther?.trim()) {
    ctx.addIssue({ code: "custom", message: "Say who this was for", path: ["forWhomOther"] });
  }
  if (data.fromWhom === "Others" && !data.fromWhomOther?.trim()) {
    ctx.addIssue({ code: "custom", message: "Say who this came from", path: ["fromWhomOther"] });
  }
});

async function notifyBudget(
  sql: Sql,
  householdId: number,
  category: string,
  occurredOn: string,
  tripId: number | null,
) {
  if (tripId) return;
  const month = occurredOn.slice(0, 7);
  const budget = await sql<{ limit_amount: string | number }>`
    select limit_amount from budgets
    where household_id = ${householdId}
      and category = ${category}
      and (month = ${month} or month = 'recurring')
    order by case when month = ${month} then 0 else 1 end
    limit 1
  `;
  if (!budget[0]) return;
  const limit = money(budget[0].limit_amount);
  if (limit <= 0) return;
  const spentRows = await sql<{ s: string | number }>`
    select coalesce(sum(amount), 0) as s from expenses
    where household_id = ${householdId}
      and category = ${category}
      and occurred_on >= ${monthStart(month)}
      and occurred_on <= ${monthEnd(month)}
      and trip_id is null
  `;
  const spent = money(spentRows[0]?.s);
  const pct = spent / limit;
  if (pct < 0.8) return;
  const kind = pct >= 1 ? "overspend" : "warning";
  const title =
    pct >= 1 ? `Overspent · ${category}` : `Almost at the cap · ${category}`;
  const body =
    pct >= 1
      ? `${category} is ${Math.round(pct * 100)}% of its ${limit} rupee limit this month.`
      : `${category} has used ${Math.round(pct * 100)}% of its monthly limit.`;
  const dup = await sql<{ id: number }>`
    select id from notifications
    where household_id = ${householdId}
      and kind = ${kind}
      and title = ${title}
      and created_at > now() - interval '2 days'
    limit 1
  `;
  if (dup[0]) return;
  await sql`
    insert into notifications (household_id, kind, title, body, href)
    values (${householdId}, ${kind}, ${title}, ${body}, '/budgets')
  `;
}

async function notifyTripBudget(sql: Sql, householdId: number, tripId: number) {
  const trip = await sql<{ name: string; budget_limit: string | number }>`
    select name, budget_limit from trips
    where id = ${tripId} and household_id = ${householdId}
    limit 1
  `;
  if (!trip[0]) return;
  const limit = money(trip[0].budget_limit);
  if (limit <= 0) return;
  const spentRows = await sql<{ s: string | number }>`
    select coalesce(sum(amount), 0) as s from expenses
    where household_id = ${householdId} and trip_id = ${tripId}
  `;
  const spent = money(spentRows[0]?.s);
  const pct = spent / limit;
  if (pct < 0.8) return;
  const kind = pct >= 1 ? "trip_overspend" : "trip_warning";
  const title =
    pct >= 1 ? `Over trip budget · ${trip[0].name}` : `Trip budget almost gone · ${trip[0].name}`;
  const body =
    pct >= 1
      ? `${trip[0].name} is ${Math.round(pct * 100)}% of its ${limit} rupee trip budget.`
      : `${trip[0].name} has used ${Math.round(pct * 100)}% of its trip budget. Everyday category limits are unchanged.`;
  const dup = await sql<{ id: number }>`
    select id from notifications
    where household_id = ${householdId}
      and kind = ${kind}
      and title = ${title}
      and created_at > now() - interval '2 days'
    limit 1
  `;
  if (dup[0]) return;
  await sql`
    insert into notifications (household_id, kind, title, body, href)
    values (${householdId}, ${kind}, ${title}, ${body}, '/trips')
  `;
}

async function reconcileAlerts(sql: Sql, householdId: number) {
  const month = monthKey();
  const [trips, budgets, expenses, joinRequests, house] = await Promise.all([
    loadTrips(sql, householdId),
    loadBudgets(sql, householdId),
    loadExpenses(sql, householdId, monthStart(month), monthEnd(month)),
    loadJoinRequests(sql, householdId),
    sql<{ monthly_limit: string | number }>`select monthly_limit from households where id = ${householdId} limit 1`,
  ]);
  const desired: { kind: string; title: string; body: string; href: string }[] = [];

  for (const trip of trips) {
    if (trip.budgetLimit <= 0) continue;
    const pct = trip.total / trip.budgetLimit;
    if (pct >= 1) {
      desired.push({
        kind: "trip_overspend",
        title: `Over trip budget · ${trip.name}`,
        body: `${trip.name} is ${Math.round(pct * 100)}% of its ${trip.budgetLimit} rupee trip budget.`,
        href: "/trips",
      });
    } else if (pct >= 0.8) {
      desired.push({
        kind: "trip_warning",
        title: `Trip budget almost gone · ${trip.name}`,
        body: `${trip.name} has used ${Math.round(pct * 100)}% of its trip budget. Everyday category limits are unchanged.`,
        href: "/trips",
      });
    }
  }

  const byCat: Record<string, number> = {};
  let everyday = 0;
  for (const e of expenses) {
    if (e.tripId != null) continue;
    byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
    everyday += e.amount;
  }
  for (const b of budgets) {
    if (b.limitAmount <= 0) continue;
    if (b.category === "EMI & Loans") continue;
    const spent = byCat[b.category] ?? 0;
    const pct = spent / b.limitAmount;
    if (pct >= 1) {
      desired.push({
        kind: "overspend",
        title: `Overspent · ${b.category}`,
        body: `${b.category} is ${Math.round(pct * 100)}% of its ${b.limitAmount} rupee limit this month.`,
        href: "/budgets",
      });
    } else if (pct >= 0.8) {
      desired.push({
        kind: "warning",
        title: `Almost at the cap · ${b.category}`,
        body: `${b.category} has used ${Math.round(pct * 100)}% of its monthly limit.`,
        href: "/budgets",
      });
    }
  }

  const householdLimit = money(house[0]?.monthly_limit);
  if (householdLimit > 0) {
    const pct = everyday / householdLimit;
    if (pct >= 1) {
      desired.push({
        kind: "household_overspend",
        title: "Over household cap",
        body: `Everyday spend is ${formatInr(everyday)} against a ${formatInr(householdLimit)} household cap — ${formatInr(everyday - householdLimit)} over.`,
        href: "/budgets",
      });
    } else if (pct >= 0.8) {
      desired.push({
        kind: "household_warning",
        title: "Household cap almost gone",
        body: `Everyday spend is ${Math.round(pct * 100)}% of the ${formatInr(householdLimit)} household cap. ${formatInr(householdLimit - everyday)} left this month.`,
        href: "/budgets",
      });
    }
  }

  if (joinRequests.length > 0) {
    desired.push({
      kind: "join_request",
      title: `${joinRequests.length} join ${joinRequests.length === 1 ? "request" : "requests"}`,
      body: "Someone wants to share this family ledger. Review them on Family.",
      href: "/family",
    });
  }

  const keep = new Set(desired.map((d) => `${d.kind}|${d.title}`));
  const rows = await sql<{ id: number; kind: string; title: string }>`
    select id, kind, title from notifications
    where household_id = ${householdId}
      and kind in ('trip_overspend', 'trip_warning', 'overspend', 'warning', 'join_request', 'household_overspend', 'household_warning')
  `;
  const have = new Set<string>();
  for (const r of rows) {
    const key = `${r.kind}|${r.title}`;
    if (keep.has(key)) {
      have.add(key);
      continue;
    }
    await sql`delete from notifications where id = ${r.id} and household_id = ${householdId}`;
  }
  for (const d of desired) {
    if (have.has(`${d.kind}|${d.title}`)) continue;
    await sql`
      insert into notifications (household_id, kind, title, body, href)
      values (${householdId}, ${d.kind}, ${d.title}, ${d.body}, ${d.href})
    `;
  }
}

export const saveExpense = createServerFn({ method: "POST" })
  .validator(unwrap(expenseInput))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await membership(sql, context.userId);
    if (!row) throw new Error("Join or create a household first");
    const subOther = data.subcategory === "Others" ? data.subcategoryOther ?? null : null;
    const forOther = data.forWhom === "Others" ? data.forWhomOther ?? null : null;
    const fromOther = data.fromWhom === "Others" ? data.fromWhomOther ?? null : null;
    let spender = context.userId;
    if (data.spentByUserId && data.spentByUserId !== context.userId) {
      const member = await sql<{ user_id: string }>`
        select user_id from household_members
        where household_id = ${row.household_id}
          and user_id = ${data.spentByUserId}
          and left_at is null
        limit 1
      `;
      if (member[0]) {
        spender = member[0].user_id;
      } else if (data.id) {
        const existing = await sql<{ user_id: string }>`
          select user_id from expenses
          where id = ${data.id} and household_id = ${row.household_id}
          limit 1
        `;
        if (existing[0]?.user_id === data.spentByUserId) spender = data.spentByUserId;
        else throw new Error("That person is not in this household");
      } else {
        throw new Error("That person is not in this household");
      }
    } else if (data.spentByUserId) {
      spender = data.spentByUserId;
    }
    let tripId: number | null = asId(data.tripId);
    if (tripId) {
      const trip = await sql<{ id: number }>`
        select id from trips where id = ${tripId} and household_id = ${row.household_id} limit 1
      `;
      if (!trip[0]) throw new Error("That trip is not on this ledger");
      tripId = Number(trip[0].id);
    }
    if (data.id) {
      await sql`
        update expenses set
          occurred_on = ${data.occurredOn},
          category = ${data.category},
          subcategory = ${data.subcategory},
          subcategory_other = ${subOther},
          for_whom = ${data.forWhom},
          for_whom_other = ${forOther},
          from_whom = ${data.fromWhom},
          from_whom_other = ${fromOther},
          payment_mode = ${data.paymentMode},
          reason = ${data.reason},
          amount = ${data.amount},
          user_id = ${spender},
          is_sample = false,
          trip_id = ${tripId}
        where id = ${data.id} and household_id = ${row.household_id}
      `;
    } else {
      await sql`
        insert into expenses (
          household_id, user_id, occurred_on, category, subcategory, subcategory_other,
          for_whom, for_whom_other, from_whom, from_whom_other, payment_mode, reason, amount, trip_id
        ) values (
          ${row.household_id}, ${spender}, ${data.occurredOn}, ${data.category},
          ${data.subcategory}, ${subOther}, ${data.forWhom}, ${forOther}, ${data.fromWhom},
          ${fromOther}, ${data.paymentMode}, ${data.reason}, ${data.amount}, ${tripId}
        )
      `;
    }
    await notifyBudget(sql, row.household_id, data.category, data.occurredOn, tripId);
    if (tripId) await notifyTripBudget(sql, row.household_id, tripId);
    await reconcileAlerts(sql, row.household_id);
    return { ok: true as const };
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .validator(unwrap(z.object({ id: z.number() })))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await membership(sql, context.userId);
    if (!row) throw new Error("No household");
    await sql`delete from expenses where id = ${data.id} and household_id = ${row.household_id}`;
    await reconcileAlerts(sql, row.household_id);
    return { ok: true as const };
  });

const investInput = z.object({
  id: z.number().optional(),
  investedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a real calendar date")
    .refine(isValidIsoDate, "That day does not exist in this month (September ends on the 30th)."),
  kind: z.string().min(1),
  subcategory: z.string().min(1),
  subcategoryOther: z.string().max(80).optional().nullable(),
  name: z.string().max(120),
  institution: z.string().max(120),
  amount: z.number().positive().max(1_000_000_000),
  notes: z.string().max(240),
});

export const saveInvestment = createServerFn({ method: "POST" })
  .validator(unwrap(investInput))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await membership(sql, context.userId);
    if (!row) throw new Error("Join or create a household first");
    const subOther = data.subcategory === "Others" ? data.subcategoryOther ?? null : null;
    if (data.id) {
      await sql`
        update investments set
          invested_on = ${data.investedOn},
          kind = ${data.kind},
          subcategory = ${data.subcategory},
          subcategory_other = ${subOther},
          name = ${data.name},
          institution = ${data.institution},
          amount = ${data.amount},
          notes = ${data.notes},
          is_sample = false
        where id = ${data.id} and household_id = ${row.household_id}
      `;
    } else {
      await sql`
        insert into investments (
          household_id, user_id, invested_on, kind, subcategory, subcategory_other,
          name, institution, amount, notes
        ) values (
          ${row.household_id}, ${context.userId}, ${data.investedOn}, ${data.kind},
          ${data.subcategory}, ${subOther}, ${data.name}, ${data.institution}, ${data.amount}, ${data.notes}
        )
      `;
    }
    return { ok: true as const };
  });

export const deleteInvestment = createServerFn({ method: "POST" })
  .validator(unwrap(z.object({ id: z.number() })))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await membership(sql, context.userId);
    if (!row) throw new Error("No household");
    await sql`delete from investments where id = ${data.id} and household_id = ${row.household_id}`;
    return { ok: true as const };
  });

const budgetInput = z.object({
  category: z.string().min(1),
  limitAmount: z.number().min(0).max(1_000_000_000),
});

export const saveBudget = createServerFn({ method: "POST" })
  .validator(unwrap(budgetInput))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await membership(sql, context.userId);
    if (!row) throw new Error("No household");
    await sql`
      insert into budgets (household_id, category, month, limit_amount)
      values (${row.household_id}, ${data.category}, 'recurring', ${data.limitAmount})
      on conflict (household_id, category, month)
      do update set limit_amount = excluded.limit_amount
    `;
    await reconcileAlerts(sql, row.household_id);
    return { ok: true as const };
  });

export const saveMonthlyLimit = createServerFn({ method: "POST" })
  .validator(unwrap(z.object({ amount: z.number().min(0).max(1_000_000_000) })))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await membership(sql, context.userId);
    if (!row) throw new Error("No household");
    if (row.role !== "owner") throw new Error("Only the household owner can change the overall cap");
    await sql`update households set monthly_limit = ${data.amount} where id = ${row.household_id}`;
    await reconcileAlerts(sql, row.household_id);
    return { ok: true as const };
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const row = await membership(sql, context.userId);
    if (!row) return { ok: true as const };
    await sql`update notifications set read = true where household_id = ${row.household_id} and read = false`;
    return { ok: true as const };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .validator(unwrap(z.object({ id: z.number() })))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await membership(sql, context.userId);
    if (!row) return { ok: true as const };
    if (data.id <= 0) return { ok: true as const };
    await sql`
      update notifications set read = true
      where id = ${data.id} and household_id = ${row.household_id}
    `;
    return { ok: true as const };
  });

export const dismissNotification = createServerFn({ method: "POST" })
  .validator(unwrap(z.object({ id: z.number() })))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await membership(sql, context.userId);
    if (!row) return { ok: true as const };
    if (data.id <= 0) return { ok: true as const };
    await sql`delete from notifications where id = ${data.id} and household_id = ${row.household_id}`;
    return { ok: true as const };
  });

export const clearSampleData = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const row = await membership(sql, context.userId);
    if (!row) throw new Error("No household");
    await sql`delete from expenses where household_id = ${row.household_id} and is_sample = true`;
    await sql`delete from investments where household_id = ${row.household_id} and is_sample = true`;
    await reconcileAlerts(sql, row.household_id);
    return { ok: true as const };
  });

export const renameHousehold = createServerFn({ method: "POST" })
  .validator(unwrap(z.object({ name: z.string().trim().min(1).max(80) })))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await membership(sql, context.userId);
    if (!row) throw new Error("No household");
    if (row.role !== "owner") throw new Error("Only the owner can rename");
    await sql`update households set name = ${data.name} where id = ${row.household_id}`;
    return { ok: true as const };
  });

export const exportCsv = createServerFn({ method: "GET" })
  .validator((input: { month?: string } | undefined) => input ?? {})
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await membership(sql, context.userId);
    if (!row) throw new Error("No household");
    const month = data.month && /^\d{4}-\d{2}$/.test(data.month) ? data.month : monthKey();
    const expenses = await loadExpenses(sql, row.household_id, monthStart(month), monthEnd(month));
    const header = [
      "Date",
      "Category",
      "Subcategory",
      "For whom",
      "From whom",
      "Payment mode",
      "Reason",
      "Amount (INR)",
      "Recorded by",
    ];
    const lines = [header.join(",")];
    for (const e of expenses) {
      const cells = [
        e.occurredOn,
        e.category,
        e.subcategoryOther || e.subcategory,
        e.forWhomOther || e.forWhom,
        e.fromWhomOther || e.fromWhom,
        e.paymentMode,
        e.reason,
        e.amount.toFixed(2),
        e.recorderName,
      ].map((c) => `"${String(c).replaceAll('"', '""')}"`);
      lines.push(cells.join(","));
    }
    return { filename: `keep-expenses-${month}.csv`, csv: lines.join("\n") };
  });

export type CalendarHint = {
  id: string;
  title: string;
  start: string;
  suggestedAmount: number | null;
};

export const syncGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async () => {
    const { callTool } = await import("@/lib/app-data/client.server");
    const { ConnectorType, GoogleCalendarTools, classifyCallToolError } = await import(
      "@/lib/app-data"
    );
    const month = monthKey();
    const timeMin = `${month}-01T00:00:00+05:30`;
    const last = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
    const timeMax = `${month}-${String(last).padStart(2, "0")}T23:59:59+05:30`;
    const result = await callTool(
      GoogleCalendarTools.search,
      {
        query: "",
        timeMin,
        timeMax,
        maxResults: 25,
      },
      { connectorType: ConnectorType.GoogleCalendar },
    );
    if (!result.ok) {
      const classified = classifyCallToolError(result);
      return {
        ok: false as const,
        kind: classified?.kind ?? "error",
        message: classified?.message ?? result.errorMessage ?? "Could not reach Google Calendar",
        loginUrl: result.loginUrl ?? null,
        events: [] as CalendarHint[],
      };
    }
    const raw = result.data;
    const list: unknown[] = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown[] }).items)
        ? ((raw as { items: unknown[] }).items ?? [])
        : raw && typeof raw === "object" && Array.isArray((raw as { events?: unknown[] }).events)
          ? ((raw as { events: unknown[] }).events ?? [])
          : [];
    const events: CalendarHint[] = list.slice(0, 25).map((item, index) => {
      const rec = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const startRaw = rec.start ?? rec.startTime ?? rec.date;
      let start = "";
      if (typeof startRaw === "string") start = startRaw.slice(0, 10);
      else if (startRaw && typeof startRaw === "object") {
        const s = startRaw as { dateTime?: string; date?: string };
        start = (s.dateTime ?? s.date ?? "").slice(0, 10);
      }
      return {
        id: String(rec.id ?? rec.eventId ?? index),
        title: String(rec.summary ?? rec.title ?? rec.name ?? "Calendar event"),
        start: start || isoDate(new Date()),
        suggestedAmount: null,
      };
    });
    return { ok: true as const, kind: "ok" as const, message: null, loginUrl: null, events };
  });

export const leaveHousehold = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const row = await membership(sql, context.userId, "family");
    if (!row) return { ok: true as const };
    if (row.role === "owner") {
      throw new Error("The owner cannot leave. Remove members instead, or keep the household.");
    }
    await sql`
      update household_members
      set left_at = now()
      where user_id = ${context.userId} and household_id = ${row.household_id} and left_at is null
    `;
    await sql`update user_profiles set last_scope = 'personal' where user_id = ${context.userId}`;
    return { ok: true as const };
  });

export type CoachItem = {
  title: string;
  body: string;
  save: number | null;
  why?: string;
  steps?: string[];
  when?: SuggestionWhen;
};

type SuggestionWhen = "This week" | "This month" | "Ongoing";

export type CoachAdvice = {
  ok: boolean;
  cached: boolean;
  narrative: string;
  items: CoachItem[];
  error?: string;
};

function fingerprintLedger(expenses: Expense[], investments: Investment[]): string {
  const totals: Record<string, number> = {};
  for (const e of expenses) {
    const key = e.occurredOn.slice(0, 7);
    totals[key] = (totals[key] ?? 0) + Math.round(e.amount);
  }
  let invest = 0;
  for (const i of investments) invest += Math.round(i.amount);
  return `${Object.keys(totals).sort().map((k) => `${k}:${totals[k]}`).join("|")}|i:${invest}`;
}

export const getCoachAdvice = createServerFn({ method: "POST" })
  .validator(unwrap(z.object({ force: z.boolean().optional() })))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<CoachAdvice> => {
    const sql = await getSql();
    const row = await membership(sql, context.userId);
    if (!row) throw new Error("Join or create a household first");

    const months = lastNMonthKeys(LOOKBACK_MONTHS);
    const from = monthStart(months[0]!);
    const to = monthEnd(months[months.length - 1]!);
    const expenses = await loadExpenses(sql, row.household_id, from, to);
    const investments = await loadInvestments(sql, row.household_id);
    const budgets = await loadBudgets(sql, row.household_id);
    const print = fingerprintLedger(expenses, investments);

    if (!data.force) {
      try {
        const cached = await sql<{ fingerprint: string; narrative: string; items: unknown }>`
          select fingerprint, narrative, items from coach_advice where household_id = ${row.household_id} limit 1
        `;
        if (cached[0] && cached[0].fingerprint === print) {
          const items = Array.isArray(cached[0].items) ? (cached[0].items as CoachItem[]) : [];
          return { ok: true, cached: true, narrative: cached[0].narrative, items };
        }
      } catch (err) {
        console.error("coach cache read failed", err);
      }
    }

    const members = await loadMembers(sql, row.household_id, monthKey());
    const behavior = analyzeSpending(expenses, months);
    const byCat = behavior.topCategories
      .map((c) => `${c.name}: ${formatInr(c.amount)} (${Math.round(c.share * 100)}%)`)
      .join("; ");
    const series = behavior.series.map((s) => `${s.label} ${Math.round(s.amount)}`).join(", ");
    const budgetLines = budgets.map((b) => `${b.category} limit ${Math.round(b.limitAmount)}`).join("; ");
    const investTotal = investments.reduce((s, i) => s + i.amount, 0);
    const mixLine = behavior.paymentMix
      .map((p) => `${p.label} ${Math.round(p.share * 100)}% (${Math.round(p.amount)})`)
      .join("; ");
    const familyLine = members.map((m) => `${m.displayName} ${Math.round(m.spentThisMonth)}`).join("; ");
    const currentMonthSpend = behavior.series.at(-1)?.amount ?? 0;
    const ruleItems: CoachItem[] = buildSuggestions({
      monthSpend: currentMonthSpend,
      byCategory: behavior.series.at(-1)?.byCategory ?? {},
      budgets,
      investmentsMonth: investTotal / Math.max(behavior.monthsCovered, 1),
      prevSpend: behavior.series.at(-2)?.amount ?? null,
      behavior,
      members,
    }).map((s) => ({
      title: s.title,
      body: s.body,
      save: s.save ?? null,
      why: s.why,
      steps: s.steps,
      when: s.when,
    }));
    const localNarrative = buildCoachNarrative({
      monthSpend: currentMonthSpend,
      prevSpend: behavior.series.at(-2)?.amount ?? null,
      behavior,
      members,
    });

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return {
        ok: true,
        cached: false,
        narrative: localNarrative,
        items: ruleItems,
      };
    }

    const prompt = `You are Finance coach inside Keep, a calm Indian household money app. Currency is INR. Be specific, practical, and actionable. Never mention Grok.
Household monthly limit: ${row.monthly_limit}.
24-month spend total: ${Math.round(behavior.total)}. Average month: ${Math.round(behavior.avgMonthly)}. Median: ${Math.round(behavior.medianMonthly)}.
Trend last 3 vs prior 3 months: ${behavior.trendPct == null ? "n/a" : `${behavior.trendPct.toFixed(1)}%`}.
Weekend share of spend: ${Math.round(behavior.weekendShare * 100)}%.
Top categories: ${byCat || "n/a"}.
Payment mix: ${mixLine || "n/a"}.
Family spend this month: ${familyLine || "n/a"}.
Limits: ${budgetLines || "none"}.
Investments on books: ${Math.round(investTotal)}.
Monthly series (label amount): ${series}.
Current month: ${monthLabel(monthKey())}.

Return ONLY JSON:
{"narrative":"4-6 sentences diagnosing overspending (what, why, where the leak is)","weeklyFocus":"one sentence the household should do this week","actions":[{"title":"short verb-led title","why":"one sentence why this cut works","detail":"2-3 sentences of context","steps":["step 1","step 2","step 3"],"when":"This week|This month|Ongoing","monthlySave":number}]}
Give 5 to 7 actions ordered by impact. monthlySave is a realistic INR number or 0. Steps must be things a person can do in India this week (UPI, SIP, metro, Swiggy, card bill). No markdown.`;

    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          temperature: 0.3,
          max_tokens: 1600,
          messages: [
            {
              role: "system",
              content:
                "You are Finance coach. Write useful, detailed household finance advice for India. JSON only. Never say Grok.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!res.ok) {
        return {
          ok: true,
          cached: false,
          narrative: localNarrative,
          items: ruleItems,
          error: `Finance coach is busy — showing Keep's own plan.`,
        };
      }
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = body.choices?.[0]?.message?.content ?? "";
      const jsonText = raw.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
      const parsed = JSON.parse(jsonText) as {
        narrative?: string;
        weeklyFocus?: string;
        actions?: {
          title?: string;
          why?: string;
          detail?: string;
          steps?: unknown;
          when?: string;
          monthlySave?: number;
        }[];
      };
      const whenOf = (value: string | undefined): SuggestionWhen | undefined =>
        value === "This week" || value === "This month" || value === "Ongoing" ? value : "This week";
      const items: CoachItem[] = (parsed.actions ?? []).slice(0, 7).map((a) => ({
        title: String(a.title ?? "Action").slice(0, 90),
        body: String(a.detail ?? "").slice(0, 500),
        save: Number.isFinite(Number(a.monthlySave)) ? Number(a.monthlySave) : null,
        why: a.why ? String(a.why).slice(0, 180) : undefined,
        steps: Array.isArray(a.steps)
          ? a.steps.map((s) => String(s).slice(0, 180)).filter(Boolean).slice(0, 4)
          : undefined,
        when: whenOf(a.when),
      }));
      const narrative = [String(parsed.narrative ?? "").slice(0, 900), parsed.weeklyFocus]
        .filter(Boolean)
        .join(" ");
      try {
        await sql.query(
          `insert into coach_advice (household_id, fingerprint, narrative, items)
           values ($1, $2, $3, $4::jsonb)
           on conflict (household_id) do update set
             fingerprint = excluded.fingerprint,
             narrative = excluded.narrative,
             items = excluded.items,
             created_at = now()`,
          [row.household_id, print, narrative, JSON.stringify(items)],
        );
      } catch (err) {
        console.error("coach cache write failed", err);
      }
      return { ok: true, cached: false, narrative, items: items.length ? items : ruleItems };
    } catch (err) {
      console.error("getCoachAdvice failed", err);
      return {
        ok: true,
        cached: false,
        narrative: localNarrative,
        items: ruleItems,
        error: err instanceof Error ? err.message : "Could not reach Finance coach",
      };
    }
  });

function extraRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return out;
}

function toIdentity(row: {
  id: number;
  kind: string;
  label: string | null;
  holder_name: string;
  number_masked: string;
  number_full: string | null;
  extra: unknown;
}): IdentityDoc {
  const extra = extraRecord(row.extra);
  const full = (row.number_full || extra.full || row.number_masked || "").trim();
  return {
    id: row.id,
    kind: row.kind,
    label: (row.label || "").trim(),
    holderName: row.holder_name,
    number: full,
    extra,
  };
}

function toCard(row: {
  id: number;
  card_kind: string;
  nickname: string;
  bank: string;
  network: string;
  last4: string;
  number_full: string | null;
  pin: string | null;
  cvv: string | null;
  notes: string | null;
  expiry_month: number | null;
  expiry_year: number | null;
  credit_limit: string | number | null;
  holder_name: string;
}): PaymentCard {
  const numberFull = (row.number_full || "").replace(/\s+/g, "") || row.last4;
  return {
    id: row.id,
    cardKind: row.card_kind === "credit" ? "credit" : "debit",
    nickname: row.nickname,
    bank: row.bank,
    network: row.network,
    numberFull,
    last4: last4Digits(numberFull) || row.last4,
    pin: row.pin ?? "",
    cvv: row.cvv ?? "",
    notes: row.notes ?? "",
    expiryMonth: row.expiry_month,
    expiryYear: row.expiry_year,
    creditLimit: row.credit_limit == null ? null : money(row.credit_limit),
    holderName: row.holder_name,
  };
}

async function personalHouseId(sql: Sql, userId: string, displayName: string): Promise<number> {
  const personal = await ensurePersonalHousehold(sql, userId, displayName || "You", false);
  return personal.household_id;
}

export const getVault = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<{ docs: IdentityDoc[]; cards: PaymentCard[] }> => {
    const sql = await getSql();
    let docs: IdentityDoc[] = [];
    let cards: PaymentCard[] = [];
    try {
      const docRows = await sql<{
        id: number;
        kind: string;
        label: string | null;
        holder_name: string;
        number_masked: string;
        number_full: string | null;
        extra: unknown;
      }>`
        select id, kind, label, holder_name, number_masked, number_full, extra
        from identity_docs
        where user_id = ${context.userId}
        order by created_at desc, id desc
      `;
      docs = docRows.map(toIdentity);
    } catch (err) {
      console.error("getVault docs failed", err);
    }
    try {
      const cardRows = await sql<{
        id: number;
        card_kind: string;
        nickname: string;
        bank: string;
        network: string;
        last4: string;
        number_full: string | null;
        pin: string | null;
        cvv: string | null;
        notes: string | null;
        expiry_month: number | null;
        expiry_year: number | null;
        credit_limit: string | number | null;
        holder_name: string;
      }>`
        select id, card_kind, nickname, bank, network, last4, number_full, pin, cvv, notes,
               expiry_month, expiry_year, credit_limit, holder_name
        from payment_cards
        where user_id = ${context.userId}
        order by created_at desc
      `;
      cards = cardRows.map(toCard);
    } catch (err) {
      console.error("getVault cards failed", err);
    }
    return { docs, cards };
  });

const identityInput = z.object({
  id: z.number().int().positive().optional(),
  kind: z.string().trim().min(1).max(40),
  label: z.string().trim().max(80).optional(),
  holderName: z.string().trim().min(1).max(80),
  number: z.string().trim().min(1).max(80),
  extra: z.record(z.string(), z.string()).optional(),
});

export const saveIdentityDoc = createServerFn({ method: "POST" })
  .validator(unwrap(identityInput))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const houseId = await personalHouseId(sql, context.userId, data.holderName);
    const extra = extraRecord(data.extra ?? {});
    extra.full = data.number.trim();
    const label = (data.label ?? "").trim();
    const last4 = last4Digits(data.number) || data.number.slice(-4);
    if (data.id) {
      await sql`
        update identity_docs set
          kind = ${data.kind},
          label = ${label},
          holder_name = ${data.holderName},
          number_masked = ${last4},
          number_full = ${data.number.trim()},
          extra = ${JSON.stringify(extra)}::jsonb,
          updated_at = now()
        where id = ${data.id} and user_id = ${context.userId}
      `;
    } else {
      await sql.query(
        `insert into identity_docs (user_id, household_id, kind, label, holder_name, number_masked, number_full, extra, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, now())`,
        [context.userId, houseId, data.kind, label, data.holderName, last4, data.number.trim(), JSON.stringify(extra)],
      );
    }
    return { ok: true as const };
  });

export const deleteIdentityDoc = createServerFn({ method: "POST" })
  .validator(unwrap(z.object({ id: z.number() })))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from identity_docs where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

const cardInput = z.object({
  id: z.number().optional(),
  cardKind: z.enum(["debit", "credit"]),
  nickname: z.string().trim().max(40),
  bank: z.string().trim().min(1).max(60),
  network: z.string().trim().min(1).max(20),
  numberFull: z.string().trim().min(4).max(24),
  pin: z.string().trim().max(12).optional().default(""),
  cvv: z.string().trim().max(4).optional().default(""),
  notes: z.string().trim().max(240).optional().default(""),
  expiryMonth: z.number().int().min(1).max(12).nullable(),
  expiryYear: z.number().int().min(2020).max(2045).nullable(),
  creditLimit: z.number().min(0).max(1_000_000_000).nullable(),
  holderName: z.string().trim().max(80),
});

export const savePaymentCard = createServerFn({ method: "POST" })
  .validator(unwrap(cardInput))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const houseId = await personalHouseId(sql, context.userId, data.holderName || "You");
    const digits = data.numberFull.replace(/\D/g, "");
    if (digits.length < 4) throw new Error("Enter the full card number");
    const last4 = last4Digits(digits);
    const limit = data.cardKind === "credit" ? data.creditLimit : null;
    if (data.id) {
      await sql`
        update payment_cards set
          card_kind = ${data.cardKind},
          nickname = ${data.nickname},
          bank = ${data.bank},
          network = ${data.network},
          last4 = ${last4},
          number_full = ${digits},
          pin = ${data.pin ?? ""},
          cvv = ${data.cvv ?? ""},
          notes = ${data.notes ?? ""},
          expiry_month = ${data.expiryMonth},
          expiry_year = ${data.expiryYear},
          credit_limit = ${limit},
          holder_name = ${data.holderName}
        where id = ${data.id} and user_id = ${context.userId}
      `;
    } else {
      await sql`
        insert into payment_cards (
          user_id, household_id, card_kind, nickname, bank, network, last4, number_full, pin, cvv, notes,
          expiry_month, expiry_year, credit_limit, holder_name
        ) values (
          ${context.userId}, ${houseId}, ${data.cardKind}, ${data.nickname}, ${data.bank},
          ${data.network}, ${last4}, ${digits}, ${data.pin ?? ""}, ${data.cvv ?? ""}, ${data.notes ?? ""},
          ${data.expiryMonth}, ${data.expiryYear}, ${limit}, ${data.holderName}
        )
      `;
    }
    return { ok: true as const };
  });

export const deletePaymentCard = createServerFn({ method: "POST" })
  .validator(unwrap(z.object({ id: z.number() })))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`delete from payment_cards where id = ${data.id} and user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const setLedgerScope = createServerFn({ method: "POST" })
  .validator(unwrap(z.object({ scope: z.enum(["personal", "family"]) })))
  .middleware([authMiddleware])
  .handler(async ({ context, data }): Promise<DashboardPayload> => {
    const sql = await getSql();
    if (data.scope === "family") {
      const family = await membership(sql, context.userId, "family");
      if (!family) throw new Error("Start or join a family household first");
    }
    await sql`
      insert into user_profiles (user_id, last_scope, onboarding_done)
      values (${context.userId}, ${data.scope}, true)
      on conflict (user_id) do update set last_scope = excluded.last_scope, onboarding_done = true
    `;
    return loadDashboard(sql, context.userId, monthKey(), { closeLastMonth: false });
  });

export const acceptJoinRequest = createServerFn({ method: "POST" })
  .validator(unwrap(z.object({ id: z.number() })))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await membership(sql, context.userId, "family");
    if (!row || row.role !== "owner") throw new Error("Only the family owner can accept people");
    const req = await sql<{ id: number; user_id: string; display_name: string }>`
      select id, user_id, display_name from household_join_requests
      where id = ${data.id} and household_id = ${row.household_id} and status = 'pending'
      limit 1
    `;
    if (!req[0]) throw new Error("Request not found");
    const otherFamily = await sql<{ household_id: number }>`
      select m.household_id from household_members m
      join households h on h.id = m.household_id
      where m.user_id = ${req[0].user_id}
        and coalesce(h.kind, 'family') = 'family'
        and m.left_at is null
      limit 1
    `;
    if (otherFamily[0] && otherFamily[0].household_id !== row.household_id) {
      throw new Error("They already belong to another family household");
    }
    await sql`
      insert into household_members (household_id, user_id, role, display_name, left_at)
      values (${row.household_id}, ${req[0].user_id}, 'member', ${req[0].display_name}, null)
      on conflict (household_id, user_id) do update set
        display_name = excluded.display_name,
        role = 'member',
        left_at = null
    `;
    await sql`
      update household_join_requests set status = 'accepted'
      where id = ${req[0].id}
    `;
    await sql`
      insert into user_profiles (user_id, display_name, onboarding_done, last_scope)
      values (${req[0].user_id}, ${req[0].display_name}, true, 'family')
      on conflict (user_id) do update set last_scope = 'family', onboarding_done = true
    `;
    return { ok: true as const };
  });

export const declineJoinRequest = createServerFn({ method: "POST" })
  .validator(unwrap(z.object({ id: z.number() })))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await membership(sql, context.userId, "family");
    if (!row || row.role !== "owner") throw new Error("Only the family owner can decline people");
    await sql`
      update household_join_requests set status = 'declined'
      where id = ${data.id} and household_id = ${row.household_id}
    `;
    return { ok: true as const };
  });

export const removeMember = createServerFn({ method: "POST" })
  .validator(unwrap(z.object({ userId: z.string().min(1) })))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await membership(sql, context.userId, "family");
    if (!row || row.role !== "owner") throw new Error("Only the family owner can remove people");
    if (data.userId === context.userId) throw new Error("You cannot remove yourself");
    await sql`
      update household_members
      set left_at = now()
      where household_id = ${row.household_id} and user_id = ${data.userId} and left_at is null
    `;
    await sql`update user_profiles set last_scope = 'personal' where user_id = ${data.userId}`;
    return { ok: true as const };
  });

const tripInput = z.object({
  id: z.number().optional(),
  name: z.string().trim().min(1).max(80),
  startedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  endedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().max(240).optional().default(""),
  budgetLimit: z.number().min(0).max(1_000_000_000).optional().default(0),
});

export const saveTrip = createServerFn({ method: "POST" })
  .validator(unwrap(tripInput))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await membership(sql, context.userId);
    if (!row) throw new Error("Open a ledger first");
    const budgetLimit = data.budgetLimit ?? 0;
    if (data.id) {
      await sql`
        update trips set
          name = ${data.name},
          started_on = ${data.startedOn ?? null},
          ended_on = ${data.endedOn ?? null},
          notes = ${data.notes ?? ""},
          budget_limit = ${budgetLimit}
        where id = ${data.id} and household_id = ${row.household_id}
      `;
      return loadDashboard(sql, context.userId, monthKey());
    }
    await sql`
      insert into trips (household_id, user_id, name, started_on, ended_on, notes, budget_limit)
      values (${row.household_id}, ${context.userId}, ${data.name}, ${data.startedOn ?? null}, ${data.endedOn ?? null}, ${data.notes ?? ""}, ${budgetLimit})
    `;
    return loadDashboard(sql, context.userId, monthKey());
  });

export const deleteTrip = createServerFn({ method: "POST" })
  .validator(unwrap(z.object({ id: z.number() })))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await membership(sql, context.userId);
    if (!row) throw new Error("No household");
    const trip = await sql<{ name: string }>`
      select name from trips where id = ${data.id} and household_id = ${row.household_id} limit 1
    `;
    await sql`update expenses set trip_id = null where trip_id = ${data.id} and household_id = ${row.household_id}`;
    await sql`delete from trips where id = ${data.id} and household_id = ${row.household_id}`;
    if (trip[0]) {
      const over = `Over trip budget · ${trip[0].name}`;
      const warn = `Trip budget almost gone · ${trip[0].name}`;
      await sql`
        delete from notifications
        where household_id = ${row.household_id}
          and kind in ('trip_overspend', 'trip_warning')
          and (title = ${over} or title = ${warn})
      `;
    }
    await reconcileAlerts(sql, row.household_id);
    return { ok: true as const };
  });

export const setExpenseTrip = createServerFn({ method: "POST" })
  .validator(unwrap(z.object({ expenseId: z.number(), tripId: z.number().int().positive().nullable() })))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await membership(sql, context.userId);
    if (!row) throw new Error("No household");
    let tripId: number | null = data.tripId;
    if (tripId) {
      const trip = await sql<{ id: number }>`
        select id from trips where id = ${tripId} and household_id = ${row.household_id} limit 1
      `;
      if (!trip[0]) throw new Error("That trip is not on this ledger");
      tripId = Number(trip[0].id);
    }
    await sql`
      update expenses set trip_id = ${tripId}
      where id = ${data.expenseId} and household_id = ${row.household_id}
    `;
    await reconcileAlerts(sql, row.household_id);
    return { ok: true as const };
  });

export const clearTripExpenses = createServerFn({ method: "POST" })
  .validator(unwrap(z.object({ id: z.number() })))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await membership(sql, context.userId);
    if (!row) throw new Error("No household");
    await sql`
      update expenses set trip_id = null
      where trip_id = ${data.id} and household_id = ${row.household_id}
    `;
    await reconcileAlerts(sql, row.household_id);
    return { ok: true as const };
  });

export const saveDisplayName = createServerFn({ method: "POST" })
  .validator(unwrap(z.object({ name: z.string().trim().min(1).max(80) })))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into user_profiles (user_id, display_name, onboarding_done)
      values (${context.userId}, ${data.name}, true)
      on conflict (user_id) do update set display_name = excluded.display_name, onboarding_done = true
    `;
    await sql`update household_members set display_name = ${data.name} where user_id = ${context.userId}`;
    return { ok: true as const };
  });

export const saveBackupCadence = createServerFn({ method: "POST" })
  .validator(unwrap(z.object({ cadence: z.enum(["daily", "weekly", "monthly", "off"]) })))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into user_profiles (user_id, backup_cadence)
      values (${context.userId}, ${data.cadence})
      on conflict (user_id) do update set backup_cadence = excluded.backup_cadence
    `;
    return { ok: true as const };
  });

export const saveInsightCadence = createServerFn({ method: "POST" })
  .validator(unwrap(z.object({ cadence: z.enum(["daily", "weekly", "bimonthly", "monthly", "off"]) })))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await sql`
      insert into user_profiles (user_id, insight_cadence, onboarding_done)
      values (${context.userId}, ${data.cadence}, true)
      on conflict (user_id) do update set insight_cadence = excluded.insight_cadence, onboarding_done = true
    `;
    return loadDashboard(sql, context.userId, monthKey(), { closeLastMonth: false });
  });

export const exportBackup = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const houses = await listMemberships(sql, context.userId);
    const vault = await (async () => {
      const docs = await sql<Record<string, unknown>[]>`
        select kind, label, holder_name, number_full, extra from identity_docs where user_id = ${context.userId}
      `;
      const cards = await sql<Record<string, unknown>[]>`
        select card_kind, nickname, bank, network, number_full, pin, cvv, notes, expiry_month, expiry_year, credit_limit, holder_name
        from payment_cards where user_id = ${context.userId}
      `;
      return { docs, cards };
    })();
    const ledgers = [];
    for (const house of houses) {
      const expenses = await sql<Record<string, unknown>[]>`
        select occurred_on, category, subcategory, subcategory_other, for_whom, for_whom_other,
               from_whom, from_whom_other, payment_mode, reason, amount, trip_id, user_id
        from expenses where household_id = ${house.household_id}
        order by occurred_on, id
      `;
      const investments = await sql<Record<string, unknown>[]>`
        select invested_on, kind, subcategory, subcategory_other, name, institution, amount, notes
        from investments where household_id = ${house.household_id}
        order by invested_on, id
      `;
      const budgets = await sql<Record<string, unknown>[]>`
        select category, month, limit_amount from budgets where household_id = ${house.household_id}
      `;
      const trips = await sql<Record<string, unknown>[]>`
        select id, name, started_on, ended_on, notes, budget_limit from trips where household_id = ${house.household_id}
      `;
      const members = await sql<Record<string, unknown>[]>`
        select user_id, display_name, role from household_members where household_id = ${house.household_id}
      `;
      ledgers.push({
        kind: house.kind,
        name: house.name,
        inviteCode: house.invite_code,
        monthlyLimit: money(house.monthly_limit),
        members,
        expenses,
        investments,
        budgets,
        trips,
      });
    }
    await sql`update user_profiles set last_backup_at = now() where user_id = ${context.userId}`;
    const payload = {
      app: "Keep",
      version: 2,
      exportedAt: new Date().toISOString(),
      userId: context.userId,
      vault,
      ledgers,
    };
    const stamp = monthKey();
    return {
      filename: `keep-backup-${stamp}.json`,
      json: JSON.stringify(payload, null, 2),
    };
  });

export { CATEGORIES };
