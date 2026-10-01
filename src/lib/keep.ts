export const APP_NAME = "Keep";

export type CategoryDef = {
  id: string;
  label: string;
  subcategories: string[];
};

export const CATEGORIES: CategoryDef[] = [
  {
    id: "House",
    label: "House",
    subcategories: [
      "House Rent",
      "House Deposit",
      "Electricity Bill",
      "Home Maintenance",
      "Water Bill",
      "Gas Bill",
      "Maid",
      "House Purchase",
      "Others",
    ],
  },
  {
    id: "Groceries",
    label: "Groceries",
    subcategories: ["Vegetables", "Fruits", "Non-veg", "Dairy", "Others"],
  },
  {
    id: "Fashion",
    label: "Fashion",
    subcategories: ["Clothes", "Wearables", "Perfumes", "Metals", "Others"],
  },
  {
    id: "Education",
    label: "Education",
    subcategories: [
      "School Fees",
      "College Fees",
      "Degree Fees",
      "Tuition Fees",
      "Upskilling",
      "Books",
      "Stationery",
      "Others",
    ],
  },
  {
    id: "Travel",
    label: "Travel",
    subcategories: ["Food", "Train", "Bus", "Rickshaw", "Car", "Flight", "Boat", "Others"],
  },
  {
    id: "Wellbeing",
    label: "Wellbeing",
    subcategories: [
      "Physical Activities",
      "Personal Care / Grooming",
      "Cosmetics",
      "Nutrition & Supplements",
      "Others",
    ],
  },
  {
    id: "Entertainment",
    label: "Entertainment",
    subcategories: [
      "Movies",
      "Restaurants",
      "Food",
      "Games",
      "Bars / Clubs / Pubs",
      "Ticketed Events",
      "Sports",
      "Liquor",
      "Smoking",
      "Others",
    ],
  },
  {
    id: "Subscriptions",
    label: "Subscriptions",
    subcategories: ["Wi-Fi", "Mobile", "OTT", "Television", "Others"],
  },
  {
    id: "Household",
    label: "Household",
    subcategories: ["Household Items", "Stationery", "Home Renovation", "Office / Business Items", "Others"],
  },
  {
    id: "Electronics",
    label: "Electronics",
    subcategories: ["Phone", "Laptop", "Television", "Audio", "Wearables", "Others"],
  },
  {
    id: "Giving",
    label: "Giving",
    subcategories: ["Gifts", "Donation / Charity", "Parents", "Religious", "Tips", "Sponsorship", "Others"],
  },
  {
    id: "Medical",
    label: "Medical",
    subcategories: ["Hospital", "Physician", "Self", "Insurance", "Others"],
  },
  {
    id: "Vehicle",
    label: "Vehicle",
    subcategories: [
      "Purchase",
      "Petrol / Charge",
      "Maintenance",
      "Replacements",
      "Accessories",
      "Insurance",
      "Tolls",
      "Parking Fees",
      "Government Charges",
      "Others",
    ],
  },
  {
    id: "Care",
    label: "Care",
    subcategories: ["Old-age Care", "Hospital Care", "Daycare / Nanny", "Others"],
  },
  {
    id: "Events",
    label: "Events",
    subcategories: ["Marriage", "Birthday", "Religious", "Death", "Others"],
  },
  {
    id: "Pets",
    label: "Pets",
    subcategories: ["Food", "Vet", "Grooming", "Accessories", "Others"],
  },
  {
    id: "Others",
    label: "Others",
    subcategories: ["Others"],
  },
];

export const INVESTMENT_KINDS: CategoryDef[] = [
  { id: "Stock", label: "Stock", subcategories: ["Equity", "ETF", "IPO", "Others"] },
  { id: "MF", label: "Mutual Fund", subcategories: ["Equity", "Debt", "Hybrid", "ELSS", "Others"] },
  { id: "LIC", label: "LIC", subcategories: ["Term", "Endowment", "ULIP", "Others"] },
  { id: "FD", label: "Fixed Deposit", subcategories: ["Bank", "Post office", "Corporate", "Others"] },
  { id: "Gold", label: "Gold", subcategories: ["Physical", "Digital", "SGB", "Jewellery", "Others"] },
  { id: "Bonds", label: "Bonds", subcategories: ["Government", "Corporate", "Tax-free", "Others"] },
  { id: "Real Estate", label: "Real Estate", subcategories: ["Residential", "Commercial", "Land", "REIT", "Others"] },
  { id: "NPS", label: "NPS", subcategories: ["Tier I", "Tier II", "Others"] },
  { id: "PF", label: "Provident Fund", subcategories: ["EPF", "PPF", "VPF", "Others"] },
  { id: "Others", label: "Others", subcategories: ["Others"] },
];

export const PAYMENT_MODES = [
  "UPI",
  "Credit Card",
  "Debit Card",
  "EMI",
  "Net Banking",
  "Cash",
  "Wallet",
  "Cheque",
  "Bank transfer",
  "Others",
] as const;

export const PAYMENT_GROUPS = [
  { id: "UPI", label: "UPI", modes: ["UPI"] },
  { id: "Credit Card", label: "Credit Card", modes: ["Credit Card"] },
  { id: "Debit Card", label: "Debit Card", modes: ["Debit Card"] },
  { id: "EMI", label: "EMI", modes: ["EMI"] },
  { id: "Online", label: "Online", modes: ["Net Banking", "Wallet", "Bank transfer"] },
  { id: "Cash", label: "Cash", modes: ["Cash", "Cheque"] },
  { id: "Others", label: "Others", modes: ["Others"] },
] as const;

export type PaymentGroupId = (typeof PAYMENT_GROUPS)[number]["id"];

export function paymentGroupFor(mode: string): PaymentGroupId {
  for (const group of PAYMENT_GROUPS) {
    if ((group.modes as readonly string[]).includes(mode)) return group.id;
  }
  return "Others";
}

export type PaymentGroupSlice = {
  id: PaymentGroupId;
  label: string;
  amount: number;
  share: number;
};

export function tallyPaymentGroups(expenses: Expense[]): PaymentGroupSlice[] {
  const map = new Map<PaymentGroupId, number>();
  let total = 0;
  for (const e of expenses) {
    const id = paymentGroupFor(e.paymentMode);
    map.set(id, (map.get(id) ?? 0) + e.amount);
    total += e.amount;
  }
  return PAYMENT_GROUPS.map((g) => {
    const amount = map.get(g.id) ?? 0;
    return { id: g.id, label: g.label, amount, share: total > 0 ? amount / total : 0 };
  }).filter((row) => row.amount > 0);
}

export type EmiSlice = {
  name: string;
  amount: number;
  months: number;
};

export type EmiBehaviour = {
  monthAmount: number;
  monthCount: number;
  monthShare: number;
  usualMonthly: number;
  vsUsualPct: number | null;
  committed: EmiSlice[];
  newThisMonth: EmiSlice[];
  notes: string[];
  actions: Suggestion[];
};

function emiName(e: Pick<Expense, "reason" | "subcategory">): string {
  const reason = e.reason.trim();
  return reason || e.subcategory;
}

export function analyzeEmi(expenses: Expense[], month: string): EmiBehaviour {
  const regular = withoutTrips(expenses);
  const emiAll = regular.filter((e) => e.paymentMode === "EMI");
  const monthExp = regular.filter((e) => e.occurredOn.startsWith(month));
  const monthEmi = monthExp.filter((e) => e.paymentMode === "EMI");
  const monthAmount = monthEmi.reduce((s, e) => s + e.amount, 0);
  const monthSpend = monthExp.reduce((s, e) => s + e.amount, 0);
  const monthShare = monthSpend > 0 ? monthAmount / monthSpend : 0;
  const monthCount = monthEmi.length;

  const groups = new Map<string, { name: string; amount: number; months: Set<string> }>();
  for (const e of emiAll) {
    const name = emiName(e);
    const key = `${name.toLowerCase()}|${e.amount}`;
    const g = groups.get(key) ?? { name, amount: e.amount, months: new Set() };
    g.months.add(e.occurredOn.slice(0, 7));
    groups.set(key, g);
  }
  const committed = [...groups.values()]
    .filter((g) => g.months.size >= 3)
    .map((g) => ({ name: g.name, amount: g.amount, months: g.months.size }))
    .sort((a, b) => b.amount - a.amount);
  const committedKeys = new Set(
    [...groups.entries()].filter(([, g]) => g.months.size >= 3).map(([key]) => key),
  );
  const newMap = new Map<string, number>();
  for (const e of monthEmi) {
    const name = emiName(e);
    const key = `${name.toLowerCase()}|${e.amount}`;
    if (committedKeys.has(key)) continue;
    newMap.set(name, (newMap.get(name) ?? 0) + e.amount);
  }
  const newThisMonth = [...newMap.entries()]
    .map(([name, amount]) => ({ name, amount, months: 1 }))
    .sort((a, b) => b.amount - a.amount);

  const keys = lastNMonthKeys(LOOKBACK_MONTHS, month);
  const byMonth = keys.map((key) =>
    emiAll.filter((e) => e.occurredOn.startsWith(key)).reduce((s, e) => s + e.amount, 0),
  );
  const covered = byMonth.filter((n) => n > 0);
  const usualMonthly = covered.length > 0 ? covered.reduce((s, n) => s + n, 0) / covered.length : 0;
  const vsUsualPct =
    usualMonthly > 0 ? ((monthAmount - usualMonthly) / usualMonthly) * 100 : null;

  const notes: string[] = [];
  const actions: Suggestion[] = [];
  const committedTotal = committed.reduce((s, c) => s + c.amount, 0);
  const newTotal = newThisMonth.reduce((s, c) => s + c.amount, 0);

  if (monthAmount <= 0) {
    notes.push("No EMI payments this month. Keep purchases on UPI or debit so they cannot become a 6–24 month leak.");
  } else {
    notes.push(
      `EMI moved ${formatInr(monthAmount)} this month — ${Math.round(monthShare * 100)}% of everyday spend across ${monthCount} ${monthCount === 1 ? "payment" : "payments"}.`,
    );
    if (committed.length > 0) {
      notes.push(
        `Committed EMIs (seen for 3+ months): ${committed
          .slice(0, 3)
          .map((c) => `${c.name} ${formatInr(c.amount)}`)
          .join(" · ")}.`,
      );
    }
    if (newThisMonth.length > 0) {
      notes.push(
        `New EMI this month: ${newThisMonth
          .slice(0, 3)
          .map((c) => `${c.name} ${formatInr(c.amount)}`)
          .join(" · ")}. New EMIs are how lifestyle spend becomes next year's bill.`,
      );
    } else if (committed.length > 0) {
      notes.push("No new EMI this month — the load is only the loans you already carry.");
    }
    if (vsUsualPct != null && Math.abs(vsUsualPct) >= 8) {
      notes.push(
        vsUsualPct > 0
          ? `EMI is ${Math.round(vsUsualPct)}% above your usual ${formatInr(usualMonthly)} a month.`
          : `EMI is ${Math.round(Math.abs(vsUsualPct))}% below your usual ${formatInr(usualMonthly)} a month.`,
      );
    }
  }

  if (monthShare >= 0.35) {
    actions.push({
      title: "EMI is eating the month",
      why: `${Math.round(monthShare * 100)}% of everyday spend is already EMI.`,
      body: "Stop converting new buys into EMI. Pay the smallest extra principal you can, and move the next purchase to UPI or debit.",
      save: Math.round(newTotal || monthAmount * 0.08),
      when: "This month",
      steps: [
        "Do not add another EMI until the smallest one is closed.",
        committed[0]
          ? `Pay an extra ${formatInr(Math.max(500, Math.round(committed[0].amount * 0.1)))} toward ${committed[0].name} this month.`
          : "Pay an extra instalment on the smallest EMI.",
        "Anything you were about to split into EMI waits 7 days. If you still want it, pay once.",
      ],
    });
  } else if (newThisMonth.length > 0) {
    actions.push({
      title: "New EMI this month — close the tap",
      why: `${formatInr(newTotal)} of fresh EMI landed on top of committed loans.`,
      body: "One-off EMIs on phones, clothes, and gadgets are the leak. Committed home or vehicle EMIs stay; lifestyle EMIs should not.",
      save: Math.round(newTotal * 0.2),
      when: "This week",
      steps: [
        "Do not convert another swipe into EMI for 90 days.",
        "If a new EMI has a foreclosure option, close it this cycle even if a small fee applies.",
        "Pay the next similar buy in full on UPI or debit, or skip it.",
      ],
    });
  } else if (committedTotal > 0) {
    actions.push({
      title: "Keep committed EMI, refuse new ones",
      why: `${formatInr(committedTotal)} a month is already spoken for.`,
      body: "The way to spend less on EMI is to never open a new one. Prepay a little on the smallest loan so the count falls.",
      save: Math.round(committedTotal * 0.05),
      when: "This month",
      steps: [
        committed[committed.length - 1]
          ? `Add a small extra to ${committed[committed.length - 1]!.name} so it ends sooner.`
          : "Add a small extra to the smallest EMI.",
        "Before any checkout, if the screen offers EMI, pick UPI or debit instead.",
        "Review EMIs on the 1st of each month and ask: can one of these be closed this quarter?",
      ],
    });
  } else {
    actions.push({
      title: "Stay off EMI for everyday buys",
      body: "UPI and debit keep a purchase in this month. EMI spreads it into months you have not earned yet.",
      when: "Ongoing",
      steps: [
        "If it is not a house or a vehicle, do not put it on EMI.",
        "Wait 7 days on anything the checkout wants to split.",
        "Pay cards in full so a swipe never becomes an EMI.",
      ],
    });
  }

  return {
    monthAmount,
    monthCount,
    monthShare,
    usualMonthly,
    vsUsualPct,
    committed,
    newThisMonth,
    notes,
    actions,
  };
}

export function householdCapStatus(
  spent: number,
  limit: number,
): {
  spent: number;
  limit: number;
  remaining: number;
  pct: number;
  level: "off" | "ok" | "warn" | "over";
} | null {
  if (!Number.isFinite(limit) || limit <= 0) return null;
  const pct = spent / limit;
  const remaining = limit - spent;
  const level: "ok" | "warn" | "over" = pct >= 1 ? "over" : pct >= 0.8 ? "warn" : "ok";
  return { spent, limit, remaining, pct, level };
}

export function remapLegacyCategory(category: string, subcategory: string): { category: string; subcategory: string } {
  if (category !== "EMI & Loans") {
    if (CATEGORIES.some((c) => c.id === category)) return { category, subcategory };
    return { category: "Others", subcategory: "Others" };
  }
  if (subcategory === "Vehicle EMI") return { category: "Vehicle", subcategory: "Purchase" };
  if (subcategory === "Home EMI") return { category: "House", subcategory: "House Purchase" };
  return { category: "Others", subcategory: "Others" };
}

export const FOR_WHOM = [
  "Self",
  "Spouse",
  "Children",
  "Parents",
  "Family",
  "Household",
  "Others",
] as const;

export const FROM_WHOM = [
  "Self",
  "Spouse",
  "Family",
  "Others",
] as const;

export const ID_KINDS = [
  { id: "aadhaar", label: "Aadhaar" },
  { id: "pan", label: "PAN" },
  { id: "driving_licence", label: "Driving licence" },
  { id: "passport", label: "Passport" },
  { id: "voter_id", label: "Voter ID" },
  { id: "ration", label: "Ration card" },
  { id: "custom", label: "Custom" },
] as const;

export type IdentityKind = (typeof ID_KINDS)[number]["id"] | string;

export type IdentityDoc = {
  id: number;
  kind: string;
  label: string;
  holderName: string;
  number: string;
  extra: Record<string, string>;
};

export const CARD_NETWORKS = ["Visa", "Mastercard", "RuPay", "Amex", "Other"] as const;

export type PaymentCard = {
  id: number;
  cardKind: "debit" | "credit";
  nickname: string;
  bank: string;
  network: string;
  numberFull: string;
  last4: string;
  pin: string;
  cvv: string;
  notes: string;
  expiryMonth: number | null;
  expiryYear: number | null;
  creditLimit: number | null;
  holderName: string;
};

export type LedgerScope = "personal" | "family";
export type BackupCadence = "daily" | "weekly" | "monthly" | "off";
export type InsightCadence = "daily" | "weekly" | "bimonthly" | "monthly" | "off";

export type Trip = {
  id: number;
  name: string;
  startedOn: string | null;
  endedOn: string | null;
  notes: string;
  total: number;
  count: number;
  budgetLimit: number;
};

export type JoinRequest = {
  id: number;
  userId: string;
  displayName: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
};

export function identityLabel(kind: string, label?: string): string {
  const custom = (label ?? "").trim();
  if (custom) return custom;
  return ID_KINDS.find((k) => k.id === kind)?.label ?? kind;
}

export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

export function subsFor(category: string): string[] {
  const found = CATEGORIES.find((c) => c.id === category);
  const list = found?.subcategories ?? ["Others"];
  return list.includes("Others") ? list : [...list, "Others"];
}

export function investSubsFor(kind: string): string[] {
  const found = INVESTMENT_KINDS.find((c) => c.id === kind);
  const list = found?.subcategories ?? ["Others"];
  return list.includes("Others") ? list : [...list, "Others"];
}

export function formatInr(value: number, opts?: { compact?: boolean; sign?: boolean }): string {
  const abs = Math.abs(value);
  const sign = opts?.sign ? (value < 0 ? "−" : value > 0 ? "+" : "") : value < 0 ? "−" : "";
  if (opts?.compact && abs >= 10000000) {
    return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  }
  if (opts?.compact && abs >= 100000) {
    return `${sign}₹${(abs / 100000).toFixed(2)} L`;
  }
  const body = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: abs >= 1 && abs % 1 === 0 ? 0 : 2,
    minimumFractionDigits: abs >= 1 && abs % 1 === 0 ? 0 : 2,
  }).format(abs);
  return `${sign}₹${body}`;
}

export function monthKey(d: Date | string = new Date()): string {
  const date = typeof d === "string" ? new Date(d + (d.length === 10 ? "T00:00:00" : "")) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1 + delta, 1);
  return monthKey(d);
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return 0;
  return new Date(y, m, 0).getDate();
}

/** Last real calendar day of a YYYY-MM key — never 31 for September. */
export function monthEnd(key: string): string {
  const days = daysInMonth(key);
  return `${key}-${String(Math.max(days, 1)).padStart(2, "0")}`;
}

export function monthStart(key: string): string {
  return `${key}-01`;
}

export const LOOKBACK_MONTHS = 24;

export function lastNMonthKeys(n: number = LOOKBACK_MONTHS, from: string = monthKey()): string[] {
  return Array.from({ length: n }, (_, i) => shiftMonth(from, -(n - 1 - i)));
}

/** Inclusive YYYY-MM range, newest last. Caps at 240 months so a bad date cannot loop forever. */
export function monthKeysBetween(from: string, to: string = monthKey()): string[] {
  if (!/^\d{4}-\d{2}$/.test(from) || !/^\d{4}-\d{2}$/.test(to)) return lastNMonthKeys();
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;
  const keys: string[] = [];
  let cur = start;
  while (cur <= end && keys.length < 240) {
    keys.push(cur);
    cur = shiftMonth(cur, 1);
  }
  return keys;
}

export function earliestMonthKey(expenses: { occurredOn: string }[], fallback = monthKey()): string {
  let earliest = fallback;
  for (const e of expenses) {
    const key = e.occurredOn.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(key) && key < earliest) earliest = key;
  }
  return earliest;
}

/** Every month from the first logged spend through `to` (default: this month). */
export function historyMonthKeys(
  expenses: { occurredOn: string }[],
  to: string = monthKey(),
): string[] {
  return monthKeysBetween(earliestMonthKey(expenses, to), to);
}

/** Treat a past month as its last calendar day so scores and projections follow the picker. */
export function anchorDate(month: string, now = new Date()): Date {
  const current = monthKey(now);
  if (!/^\d{4}-\d{2}$/.test(month) || month >= current) return now;
  const [y, m] = month.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, daysInMonth(month), 12, 0, 0);
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, mo, d] = value.split("-").map(Number);
  if (!y || !mo || !d || mo < 1 || mo > 12 || d < 1) return false;
  return d <= daysInMonth(`${y}-${String(mo).padStart(2, "0")}`);
}

export function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function clampIsoDate(value: string, fallback = todayIso()): string {
  if (isValidIsoDate(value)) return value;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return fallback;
  const y = Number(match[1]);
  const mo = Number(match[2]);
  if (!y || mo < 1 || mo > 12) return fallback;
  const key = `${y}-${String(mo).padStart(2, "0")}`;
  const max = daysInMonth(key);
  const day = Math.min(Math.max(Number(match[3]) || 1, 1), max);
  return `${key}-${String(day).padStart(2, "0")}`;
}

export function formatDay(iso: string): string {
  const value = isValidIsoDate(iso) ? iso : clampIsoDate(iso, iso);
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function shortMonthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export function parseAmount(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function firstName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0] ?? "?").slice(0, 2).toUpperCase();
  const a = parts[0]?.[0] ?? "";
  const b = parts[parts.length - 1]?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}

export function daysLeftInMonth(now = new Date()): number {
  const key = monthKey(now);
  return Math.max(0, daysInMonth(key) - now.getDate());
}

export function isValidPan(value: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value.trim().toUpperCase());
}

export function last4Digits(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.slice(-4);
}

export function maskAadhaar(last4: string): string {
  const tail = last4.replace(/\D/g, "").slice(-4).padStart(4, "•");
  return `XXXX XXXX ${tail}`;
}

export function maskPan(pan: string): string {
  const v = pan.trim().toUpperCase();
  if (v.length < 6) return v;
  return `${v.slice(0, 2)}${"•".repeat(Math.max(v.length - 4, 4))}${v.slice(-2)}`;
}

export function maskCard(last4: string): string {
  return `•••• ${last4.replace(/\D/g, "").slice(-4).padStart(4, "•")}`;
}

export function formatCardExpiry(month: number | null, year: number | null): string {
  if (!month || !year) return "—";
  return `${String(month).padStart(2, "0")}/${String(year).slice(-2)}`;
}

export type Expense = {
  id: number;
  householdId: number;
  userId: string;
  occurredOn: string;
  category: string;
  subcategory: string;
  subcategoryOther: string | null;
  forWhom: string;
  forWhomOther: string | null;
  fromWhom: string;
  fromWhomOther: string | null;
  paymentMode: string;
  reason: string;
  amount: number;
  isSample: boolean;
  recorderName: string;
  tripId: number | null;
  tripName: string | null;
};

export type Investment = {
  id: number;
  householdId: number;
  userId: string;
  investedOn: string;
  kind: string;
  subcategory: string;
  subcategoryOther: string | null;
  name: string;
  institution: string;
  amount: number;
  notes: string;
  isSample: boolean;
};

export type Budget = {
  id: number;
  category: string;
  month: string;
  limitAmount: number;
};

export type Member = {
  userId: string;
  displayName: string;
  role: "owner" | "member";
  spentThisMonth: number;
};

export type AppNotification = {
  id: number;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
};

export type KeepPath =
  | "/"
  | "/add"
  | "/budgets"
  | "/expenses"
  | "/family"
  | "/insights"
  | "/investments"
  | "/reports"
  | "/settings"
  | "/trips"
  | "/vault";

const KEEP_PATHS = new Set<string>([
  "/",
  "/add",
  "/budgets",
  "/expenses",
  "/family",
  "/insights",
  "/investments",
  "/reports",
  "/settings",
  "/trips",
  "/vault",
]);

function asKeepPath(href: string | null | undefined, fallback: KeepPath): KeepPath {
  if (href && KEEP_PATHS.has(href)) return href as KeepPath;
  return fallback;
}

/** Where "Take action" should go — report alerts must leave Reports, otherwise the link is a no-op. */
export function notificationAction(n: AppNotification): { to: KeepPath; label: string; hash?: string } {
  switch (n.kind) {
    case "report":
      return { to: "/reports", label: "Read the close", hash: "month-close" };
    case "household_overspend":
    case "household_warning":
      return { to: "/budgets", label: "Open household cap" };
    case "overspend":
    case "warning":
      return { to: "/budgets", label: "Open limits" };
    case "trip_overspend":
    case "trip_warning":
      return { to: "/trips", label: "Open trip" };
    case "join_request":
      return { to: "/family", label: "Review request" };
    default:
      return { to: asKeepPath(n.href === "/insights" ? "/reports" : n.href, "/reports"), label: "Open" };
  }
}

export type MonthlyReport = {
  id: number;
  month: string;
  totalSpend: number;
  totalInvest: number;
  topCategory: string | null;
  vsPrevious: number | null;
  summary: string;
  suggestions: string[];
  breakdown: { category: string; amount: number }[];
};

export type Household = {
  id: number;
  name: string;
  inviteCode: string;
  ownerUserId: string;
  monthlyLimit: number;
  role: "owner" | "member";
  kind: LedgerScope;
};

export type DashboardPayload = {
  profile: {
    displayName: string;
    onboardingDone: boolean;
    email: string | null;
    theme: "light" | "dark";
    backupCadence: BackupCadence;
    lastBackupAt: string | null;
    insightCadence: InsightCadence;
  };
  household: Household | null;
  scope: LedgerScope;
  hasFamily: boolean;
  members: Member[];
  expenses: Expense[];
  investments: Investment[];
  budgets: Budget[];
  notifications: AppNotification[];
  report: MonthlyReport | null;
  month: string;
  trips: Trip[];
  joinRequests: JoinRequest[];
};

export function displaySub(categorySub: string, other: string | null | undefined): string {
  if (categorySub === "Others" && other?.trim()) return other.trim();
  return categorySub;
}

export function displayPerson(value: string, other: string | null | undefined): string {
  if (value === "Others" && other?.trim()) return other.trim();
  return value;
}

/** Active family names for For whom / From whom. Former members stay off this list. */
export function whomChoices(
  base: readonly string[],
  members: Member[],
  opts?: { currentUserId?: string; extra?: string | null },
): string[] {
  const seen = new Set(base.map((x) => x.trim().toLowerCase()).filter(Boolean));
  const injected: string[] = [];
  for (const member of members) {
    if (opts?.currentUserId && member.userId === opts.currentUserId) continue;
    const name = member.displayName.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    injected.push(name);
  }
  const extra = opts?.extra?.trim();
  if (extra && !seen.has(extra.toLowerCase())) {
    injected.push(extra);
    seen.add(extra.toLowerCase());
  }
  const hasOthers = base[base.length - 1] === "Others";
  const head = hasOthers ? base.slice(0, -1) : [...base];
  return hasOthers ? [...head, ...injected, "Others"] : [...head, ...injected];
}

export function isChildrenSpend(expense: Expense): boolean {
  return expense.forWhom === "Children";
}

export type MemberSpendRow = {
  userId: string;
  name: string;
  amount: number;
  share: number;
};

export function memberMonthSpend(
  expenses: Expense[],
  members: Member[],
  month: string,
): MemberSpendRow[] {
  const names = new Map(members.map((m) => [m.userId, m.displayName.trim() || "Member"]));
  const amounts = new Map<string, number>();
  for (const member of members) amounts.set(member.userId, 0);
  for (const expense of expenses) {
    if (!expense.occurredOn.startsWith(month)) continue;
    const current = amounts.get(expense.userId) ?? 0;
    amounts.set(expense.userId, current + expense.amount);
    if (!names.has(expense.userId)) {
      names.set(expense.userId, expense.recorderName?.trim() || "Former member");
    }
  }
  const total = [...amounts.values()].reduce((sum, n) => sum + n, 0);
  return [...amounts.entries()]
    .map(([userId, amount]) => ({
      userId,
      name: names.get(userId) || "Member",
      amount,
      share: total > 0 ? amount / total : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function spenderName(expense: Expense, members: Member[] = []): string {
  const named = expense.recorderName?.trim();
  if (named) return named;
  const member = members.find((m) => m.userId === expense.userId);
  return member?.displayName?.trim() || "Family";
}

export type Suggestion = {
  title: string;
  body: string;
  save?: number;
  why?: string;
  steps?: string[];
  when?: "This week" | "This month" | "Ongoing";
};

export type MonthBucket = {
  month: string;
  label: string;
  amount: number;
  byCategory: Record<string, number>;
};

export type SpendBehavior = {
  monthsCovered: number;
  total: number;
  avgMonthly: number;
  medianMonthly: number;
  trendPct: number | null;
  weekendShare: number;
  weekdayAvg: number;
  weekendAvg: number;
  topCategories: { name: string; amount: number; share: number }[];
  heaviest: { month: string; amount: number } | null;
  lightest: { month: string; amount: number } | null;
  series: MonthBucket[];
  paymentMix: PaymentGroupSlice[];
};

export function bucketExpenses(expenses: Expense[], months: string[]): MonthBucket[] {
  const map = new Map<string, MonthBucket>();
  for (const key of months) {
    map.set(key, { month: key, label: shortMonthLabel(key), amount: 0, byCategory: {} });
  }
  for (const e of expenses) {
    const key = e.occurredOn.slice(0, 7);
    const bucket = map.get(key);
    if (!bucket) continue;
    bucket.amount += e.amount;
    bucket.byCategory[e.category] = (bucket.byCategory[e.category] ?? 0) + e.amount;
  }
  return months.map((k) => map.get(k)!);
}

export function analyzeSpending(expenses: Expense[], months: string[] = lastNMonthKeys()): SpendBehavior {
  const series = bucketExpenses(expenses, months);
  const amounts = series.map((s) => s.amount);
  const total = amounts.reduce((s, n) => s + n, 0);
  const covered = series.filter((s) => s.amount > 0).length || series.length;
  const avgMonthly = covered > 0 ? total / Math.max(covered, 1) : 0;
  const sorted = [...amounts].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianMonthly =
    sorted.length === 0
      ? 0
      : sorted.length % 2
        ? (sorted[mid] ?? 0)
        : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;

  const last3 = amounts.slice(-3).reduce((s, n) => s + n, 0);
  const prev3 = amounts.slice(-6, -3).reduce((s, n) => s + n, 0);
  const trendPct = prev3 > 0 ? ((last3 - prev3) / prev3) * 100 : null;

  let weekend = 0;
  let weekday = 0;
  let weekendDays = 0;
  let weekdayDays = 0;
  const cat = new Map<string, number>();
  const inWindow: Expense[] = [];
  for (const e of expenses) {
    if (!months.includes(e.occurredOn.slice(0, 7))) continue;
    inWindow.push(e);
    cat.set(e.category, (cat.get(e.category) ?? 0) + e.amount);
    if (!isValidIsoDate(e.occurredOn)) continue;
    const [y, m, d] = e.occurredOn.split("-").map(Number);
    const dow = new Date(y, (m ?? 1) - 1, d ?? 1).getDay();
    if (dow === 0 || dow === 6) {
      weekend += e.amount;
      weekendDays += 1;
    } else {
      weekday += e.amount;
      weekdayDays += 1;
    }
  }

  const topCategories = [...cat.entries()]
    .map(([name, amount]) => ({ name, amount, share: total > 0 ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const withSpend = series.filter((s) => s.amount > 0);
  const heaviest = withSpend.reduce<(typeof withSpend)[0] | null>(
    (best, row) => (!best || row.amount > best.amount ? row : best),
    null,
  );
  const lightest = withSpend.reduce<(typeof withSpend)[0] | null>(
    (best, row) => (!best || row.amount < best.amount ? row : best),
    null,
  );

  return {
    monthsCovered: covered,
    total,
    avgMonthly,
    medianMonthly,
    trendPct,
    weekendShare: total > 0 ? weekend / total : 0,
    weekdayAvg: weekdayDays > 0 ? weekday / weekdayDays : 0,
    weekendAvg: weekendDays > 0 ? weekend / weekendDays : 0,
    topCategories,
    heaviest: heaviest ? { month: heaviest.month, amount: heaviest.amount } : null,
    lightest: lightest ? { month: lightest.month, amount: lightest.amount } : null,
    series,
    paymentMix: tallyPaymentGroups(inWindow),
  };
}

function pushUnique(out: Suggestion[], item: Suggestion) {
  if (out.some((s) => s.title === item.title)) return;
  out.push(item);
}

export function buildSuggestions(input: {
  monthSpend: number;
  byCategory: Record<string, number>;
  budgets: Budget[];
  investmentsMonth: number;
  prevSpend: number | null;
  behavior?: SpendBehavior | null;
  paymentMix?: PaymentGroupSlice[];
  members?: Member[];
}): Suggestion[] {
  const out: Suggestion[] = [];
  const { monthSpend, byCategory, budgets, investmentsMonth, prevSpend, behavior, members } = input;
  const paymentMix = input.paymentMix ?? behavior?.paymentMix ?? [];
  const daysLeft = daysLeftInMonth();
  const dailyPace = daysLeft > 0 ? monthSpend / Math.max(new Date().getDate(), 1) : 0;

  for (const b of budgets) {
    const spent = byCategory[b.category] ?? 0;
    if (b.limitAmount > 0 && spent > b.limitAmount) {
      const over = spent - b.limitAmount;
      pushUnique(out, {
        title: `Over the ${b.category} limit`,
        why: `${formatInr(over)} past the ${formatInr(b.limitAmount)} monthly limit.`,
        body: `Stop discretionary spends in ${b.category} until next month. Move remaining must-buys to a cheaper substitute.`,
        save: over,
        when: "This week",
        steps: [
          `Pause restaurant, delivery, and impulse buys tagged ${b.category} for ${daysLeft} days.`,
          "Switch one recurring item in this bucket to a cheaper brand or a homemade option.",
          `Write the leftover ${formatInr(over)} as a debt to next month's SIP or bill.`,
        ],
      });
    } else if (b.limitAmount > 0 && spent / b.limitAmount >= 0.8) {
      const left = b.limitAmount - spent;
      const daily = daysLeft > 0 ? left / daysLeft : left;
      pushUnique(out, {
        title: `${b.category} is at ${Math.round((spent / b.limitAmount) * 100)}% of its limit`,
        why: `Only ${formatInr(left)} remains for ${daysLeft} days.`,
        body: `Treat this like a daily allowance of ${formatInr(daily)}. Anything above that waits until next month.`,
        when: "This week",
        steps: [
          `Set a phone reminder: ${formatInr(daily)} a day left in ${b.category}.`,
          "Before every UPI in this category, check the remaining limit in Keep.",
          "If you must overspend, cut the same amount from Shopping or Entertainment the same day.",
        ],
      });
    }
  }

  const groceries = byCategory["Groceries"] ?? 0;
  const eatingOut = byCategory["Entertainment"] ?? 0;
  const food = groceries + eatingOut;
  if (food > 0 && food / Math.max(monthSpend, 1) > 0.28) {
    const trim = Math.round(food * 0.18);
    pushUnique(out, {
      title: "Cut two restaurant or takeaway days",
      why: `Food is ${Math.round((food / Math.max(monthSpend, 1)) * 100)}% of this month.`,
      body: `Groceries and eating out are taking more than a quarter of the month. Two homemade dinners replace the leak without changing the vegetable run.`,
      save: trim,
      when: "This week",
      steps: [
        "Pick two nights this week that are usually Swiggy / Zomato. Cook or eat leftovers.",
        "Keep a ₹200 UPI cap for chai and snacks on workdays.",
        `Move the ${formatInr(trim)} you don't spend into an SIP or digital gold on Sunday.`,
      ],
    });
  }

  const deliveryHint = eatingOut > 5000 || groceries > 8000;
  if (deliveryHint) {
    pushUnique(out, {
      title: "A 48-hour cart rule for food apps",
      why: "Food delivery is the easiest rupee to spend and the hardest to notice.",
      body: "Leave items in the cart overnight. Most cravings cool off, and groceries already in the house get used.",
      save: Math.round(food * 0.1),
      when: "Ongoing",
      steps: [
        "Turn off food-app notifications for seven days.",
        "Delete saved cards in the app so UPI takes an extra tap.",
        "Batch-cook one dal + rice tray on Sunday so weeknights have a default.",
      ],
    });
  }

  const vehicle = byCategory["Vehicle"] ?? 0;
  const travel = byCategory["Travel"] ?? 0;
  const transport = vehicle + travel;
  if (transport > 4000) {
    pushUnique(out, {
      title: "Swap three cab rides for transit",
      why: `Vehicle and travel are at ${formatInr(transport)} this month.`,
      body: "A metro/bus pass or one carpool week often cuts this line without changing your commute much.",
      save: Math.round(transport * 0.15),
      when: "This week",
      steps: [
        "For the next 5 workdays, take metro/bus or share one way.",
        "Park Ubers for trips under 3 km — walk or auto instead.",
        "If you drive, combine two errands into one fuel trip this weekend.",
      ],
    });
  }

  const bills = byCategory["Subscriptions"] ?? 0;
  const entertainment = byCategory["Entertainment"] ?? 0;
  if (bills + entertainment > 3000) {
    pushUnique(out, {
      title: "Cancel one unused subscription this week",
      why: "Small monthly hits hide until they add up to a grocery run.",
      body: "OTT, cloud, and mobile add-ons rarely get used daily. One unused plan is an easy win.",
      save: 499,
      when: "This week",
      steps: [
        "Open GPay / your bank app and list every auto-debit under ₹1,000.",
        "Cancel the one you have not opened in 14 days.",
        "Share one remaining OTT login across the household instead of two plans.",
      ],
    });
  }

  const shopping = (byCategory["Fashion"] ?? 0) + (byCategory["Household"] ?? 0) + (byCategory["Electronics"] ?? 0);
  if (shopping > 0 && monthSpend > 0 && shopping / monthSpend > 0.18) {
    pushUnique(out, {
      title: "Hold non-essential carts for 48 hours",
      why: `Shopping is ${Math.round((shopping / monthSpend) * 100)}% of the month.`,
      body: "Most impulse buys cool off. The money can go to an SIP instead of a cart you forget by next week.",
      save: Math.round(shopping * 0.2),
      when: "This week",
      steps: [
        "Move Amazon / Flipkart wishlists to a note titled Next month.",
        "Unsave cards in shopping apps so checkout needs an extra step.",
        `If you still want it after 48 hours, buy only if ${formatInr(Math.round(shopping * 0.2))} is already invested this month.`,
      ],
    });
  }

  if (monthSpend > 0 && investmentsMonth / monthSpend < 0.15) {
    const target = Math.round(monthSpend * 0.1);
    pushUnique(out, {
      title: "Pay yourself 10% on autopilot",
      why: "Spending without a matching investment means lifestyle is funded, future-you is not.",
      body: `Parking even 10% of this month's spend (${formatInr(target)}) into an SIP, NPS, or FD keeps the household compounding.`,
      save: target,
      when: "This month",
      steps: [
        `Start or raise an SIP by ${formatInr(target)} on the salary date.`,
        "If cash is tight, split it: half SIP, half digital gold.",
        "Turn on auto-debit the day after salary so the money never sits in UPI.",
      ],
    });
  }

  if (prevSpend != null && prevSpend > 0) {
    const delta = (monthSpend - prevSpend) / prevSpend;
    if (delta > 0.12) {
      pushUnique(out, {
        title: "Spending is up versus last month",
        why: `You are ${Math.round(delta * 100)}% higher than ${formatInr(prevSpend)}.`,
        body: "Look at the two heaviest categories first. Freeze them at last month's amount for the rest of this month.",
        when: "This week",
        steps: [
          "Open Spend and sort by amount. Circle the top two categories.",
          `Cap those two at last month's rupees for the next ${daysLeft} days.`,
          "Tell the household in one message so nobody books a surprise spend.",
        ],
      });
    } else if (delta < -0.1) {
      pushUnique(out, {
        title: "Nice pullback — lock it in",
        why: `You spent ${Math.round(Math.abs(delta) * 100)}% less than last month.`,
        body: "Move the difference into gold, FD, or NPS this week so the saving does not leak back into UPI.",
        when: "This week",
        steps: [
          `Invest the gap of ${formatInr(prevSpend - monthSpend)} before the month closes.`,
          "Keep the same grocery and cab pattern next week so the dip is a habit, not a fluke.",
        ],
      });
    }
  }

  const upi = paymentMix.find((p) => p.id === "UPI");
  if (upi && upi.share > 0.45) {
    pushUnique(out, {
      title: "Put friction back into UPI",
      why: `UPI is ${Math.round(upi.share * 100)}% of how you pay — almost no pause before money leaves.`,
      body: "UPI is convenient and that is the problem. A two-step confirm on spends over ₹500 cuts the leak without giving up UPI.",
      save: Math.round(upi.amount * 0.08),
      when: "This week",
      steps: [
        "Turn on UPI transaction alerts as SMS + app, and glance at the running total every night.",
        "For anything over ₹500 that is not rent, fuel, or groceries, wait until the next morning.",
        "Use a separate bank account for UPI with a weekly top-up equal to your food + transport limit.",
      ],
    });
  }

  const credit = paymentMix.find((p) => p.id === "Credit Card");
  if (credit && credit.share > 0.22) {
    pushUnique(out, {
      title: "Pay the card in full, then freeze extra swipes",
      why: `Credit card is ${Math.round(credit.share * 100)}% of this month's spend.`,
      body: "Revolving credit turns a month of lifestyle into next month's EMI. Treat the card as a 30-day UPI, not a loan.",
      save: Math.round(credit.amount * 0.04),
      when: "This month",
      steps: [
        "Schedule the full statement amount two days before the due date.",
        "Move one recurring swipe (OTT, groceries) back to UPI or debit so the card bill shrinks.",
        "If the bill is already over 30% of the card limit, pause new swipes until it is paid.",
      ],
    });
  }

  const emiPay = paymentMix.find((p) => p.id === "EMI");
  if (emiPay && emiPay.share > 0.12) {
    pushUnique(out, {
      title: "Cut new EMI so the load can shrink",
      why: `EMI is ${Math.round(emiPay.share * 100)}% of how you paid this month.`,
      body: "Keep house or vehicle EMIs. Refuse EMI on phones, clothes, and gadgets — those should be this month's money, not next year's.",
      save: Math.round(emiPay.amount * 0.1),
      when: "This month",
      steps: [
        "At checkout, if EMI is offered, pick UPI or debit instead.",
        "Do not open a new EMI until the smallest current one is closed.",
        "Pay a small extra on the smallest EMI this cycle so the count falls.",
      ],
    });
  }

  const online = paymentMix.find((p) => p.id === "Online");
  if (online && online.share > 0.18) {
    pushUnique(out, {
      title: "Audit online rails: net banking, wallet, transfer",
      why: `Online methods are ${Math.round(online.share * 100)}% of the mix.`,
      body: "Wallets and saved net-banking sessions hide small repeats. Empty the wallet weekly so leftover rupees stop auto-spending.",
      save: Math.round(online.amount * 0.1),
      when: "This week",
      steps: [
        "Zero out Paytm / Amazon Pay / other wallets every Sunday.",
        "Turn off auto-pay on one wallet bill and pay it manually once to see if you still need it.",
        "Keep net banking for rent and EMI only — daily spends stay on UPI with a cap.",
      ],
    });
  }

  if (behavior) {
    if (behavior.weekendShare > 0.42) {
      pushUnique(out, {
        title: "Set a weekend cash cap before Friday night",
        why: `${Math.round(behavior.weekendShare * 100)}% of spend lands on Sat–Sun.`,
        body: `Decide the weekend number now. A cap of ${formatInr(behavior.avgMonthly * 0.12)} covers plans without a Monday surprise.`,
        save: Math.round(behavior.total * Math.max(behavior.weekendShare - 0.3, 0.05) * 0.08),
        when: "This week",
        steps: [
          `Agree a household weekend cap of ${formatInr(behavior.avgMonthly * 0.12)} before Friday 6 pm.`,
          "One paid outing, not three: pick dinner or a film, not both.",
          "Pay weekend spends from one person's UPI so the running total is visible.",
        ],
      });
    }
    if (behavior.trendPct != null && behavior.trendPct > 10) {
      pushUnique(out, {
        title: "The two-year trend is climbing — freeze one category",
        why: `The last three months ran ${Math.round(behavior.trendPct)}% above the three before that.`,
        body: "Freeze the heaviest category at last quarter's average so the slope cannot keep rising.",
        when: "This month",
        steps: [
          `Take ${behavior.topCategories[0]?.name ?? "your top category"} and set its limit to last quarter's monthly average.`,
          "Review the freeze every Sunday for four weeks.",
          "Anything you still want after the freeze goes on a next-month list, not a tap.",
        ],
      });
    }
    const top = behavior.topCategories[0];
    if (top && top.share > 0.35) {
      pushUnique(out, {
        title: `Trim 10% from ${top.name}`,
        why: `${Math.round(top.share * 100)}% of 24-month spend sits here.`,
        body: `A 10% trim is ${formatInr(top.amount * 0.1)} back in the household. That is the highest-leverage cut you can make.`,
        save: Math.round(top.amount * 0.1),
        when: "This month",
        steps: [
          `List every ${top.name} line from this month and star the ones that were optional.`,
          "Cut or substitute the two largest optional lines.",
          `Redirect ${formatInr(top.amount * 0.1 / 12)} a month into SIP so the trim stays invested.`,
        ],
      });
    }
  }

  if (members && members.length > 1) {
    const ranked = [...members].sort((a, b) => b.spentThisMonth - a.spentThisMonth);
    const lead = ranked[0];
    const householdSpend = ranked.reduce((s, m) => s + m.spentThisMonth, 0);
    if (lead && householdSpend > 0 && lead.spentThisMonth / householdSpend > 0.6) {
      pushUnique(out, {
        title: `${lead.displayName} is carrying most of the month`,
        why: `${Math.round((lead.spentThisMonth / householdSpend) * 100)}% of recorded spend is theirs.`,
        body: "That can be rent or a one-off, or it can be an invisible load. A 10-minute Sunday review keeps it a choice.",
        when: "This week",
        steps: [
          "Open Family and read this month's split together.",
          "Move two repeating spends (groceries, fuel) onto a shared UPI so the load is visible.",
          "Agree one no-spend weekday for the whole household.",
        ],
      });
    }
  }

  if (dailyPace > 0 && daysLeft > 3) {
    const projected = dailyPace * daysInMonth(monthKey());
    if (monthSpend > 0 && projected > monthSpend * 1.15) {
      pushUnique(out, {
        title: "This month is on track to overshoot",
        why: `At today's pace you close near ${formatInr(projected)}.`,
        body: `Slow the daily average to ${formatInr((monthSpend * 0.9) / Math.max(new Date().getDate(), 1))} for the rest of the month.`,
        save: Math.round(projected - monthSpend),
        when: "This week",
        steps: [
          "No new shopping or entertainment until next week.",
          "Groceries once, in one trip, with a written list.",
          "Check Keep every night for 20 seconds — the act of looking cuts the next day's taps.",
        ],
      });
    }
  }

  if (out.length === 0) {
    pushUnique(out, {
      title: "On track — make the next cut optional",
      body: "No red flags this month. If you want Keep stricter, lower the limit on your heaviest category by 10% and invest the gap.",
      when: "This month",
      steps: [
        "Open Limits and shave 10% off the top category.",
        "Set an SIP for that 10% on the same day.",
      ],
    });
  }

  return out.slice(0, 8);
}

export function buildCoachNarrative(input: {
  monthSpend: number;
  prevSpend: number | null;
  behavior: SpendBehavior;
  members?: Member[];
}): string {
  const { monthSpend, prevSpend, behavior, members } = input;
  const trend =
    behavior.trendPct == null
      ? "Not enough history yet to call a trend."
      : `The last three months ran ${behavior.trendPct > 0 ? "up" : "down"} ${Math.abs(Math.round(behavior.trendPct))}% versus the three before that.`;
  const vs =
    prevSpend && prevSpend > 0
      ? `This month is ${monthSpend >= prevSpend ? "ahead of" : "under"} last month by ${formatInr(Math.abs(monthSpend - prevSpend))}.`
      : "Log a couple more weeks and month-on-month will show up here.";
  const top = behavior.topCategories[0];
  const mix = behavior.paymentMix[0];
  const family =
    members && members.length > 1
      ? ` ${members.length} people are on this ledger — use Spend to see who tapped what.`
      : "";
  return [
    `Across ${behavior.monthsCovered} months the household averaged ${formatInr(behavior.avgMonthly)} a month (median ${formatInr(behavior.medianMonthly)}).`,
    trend,
    vs,
    top
      ? `${top.name} is the long-run weight at ${Math.round(top.share * 100)}% of two-year spend.`
      : "",
    mix
      ? `This period's favourite rail is ${mix.label} (${Math.round(mix.share * 100)}% of rupees).`
      : "",
    behavior.weekendShare > 0.35
      ? `Weekends take ${Math.round(behavior.weekendShare * 100)}% of spend — that is the first place a cap works.`
      : "Weekday and weekend spend are reasonably even.",
    family,
  ]
    .filter(Boolean)
    .join(" ");
}

export function categoryColor(category: string): string {
  const map: Record<string, string> = {
    House: "var(--color-sage-deep)",
    Groceries: "var(--color-terra)",
    Fashion: "var(--color-plum)",
    Education: "var(--color-sage-deep)",
    Travel: "var(--color-mustard)",
    Wellbeing: "var(--color-sage)",
    Entertainment: "var(--color-mustard)",
    Subscriptions: "var(--color-plum)",
    Household: "var(--color-sage)",
    Electronics: "var(--color-ink)",
    Giving: "var(--color-sage-deep)",
    Medical: "var(--color-terra)",
    Vehicle: "var(--color-mustard)",
    Care: "var(--color-terra)",
    Events: "var(--color-plum)",
    Pets: "var(--color-sage)",
    "EMI & Loans": "var(--color-ink)",
    Others: "var(--color-muted)",
    Stock: "var(--color-sage-deep)",
    MF: "var(--color-sage)",
    LIC: "var(--color-plum)",
    FD: "var(--color-mustard)",
    Gold: "var(--color-mustard)",
    Bonds: "var(--color-sage)",
    "Real Estate": "var(--color-terra)",
    NPS: "var(--color-sage-deep)",
    PF: "var(--color-ink)",
    UPI: "var(--color-sage)",
    "Credit Card": "var(--color-terra)",
    "Debit Card": "var(--color-sage-deep)",
    EMI: "var(--color-ink)",
    Online: "var(--color-plum)",
    Cash: "var(--color-mustard)",
  };
  return map[category] ?? "var(--color-muted)";
}

export const PAYMENT_GROUP_HEX: Record<PaymentGroupId, string> = {
  UPI: "#6b8f71",
  "Credit Card": "#c17a4a",
  "Debit Card": "#4f7a59",
  EMI: "#1c1917",
  Online: "#6b5b7a",
  Cash: "#c4a35a",
  Others: "#7a7368",
};

export const GOAL_PRESETS = [
  { id: "Vehicle", icon: "car", label: "Vehicle" },
  { id: "Fashion", icon: "bag", label: "Fashion" },
  { id: "Entertainment", icon: "play", label: "Social" },
  { id: "House", icon: "home", label: "House" },
] as const;

export type CategoryProjection = {
  category: string;
  spent: number;
  projected: number;
  budget: number | null;
  dailyPace: number;
  remainingDays: number;
  guidance: string;
  save: number;
};

export function projectCategories(
  monthExpenses: Expense[],
  budgets: Budget[],
  month: string = monthKey(),
  now = new Date(),
): CategoryProjection[] {
  const key = /^\d{4}-\d{2}$/.test(month) ? month : monthKey(now);
  const isCurrent = key === monthKey(now);
  const day = isCurrent ? Math.max(now.getDate(), 1) : daysInMonth(key);
  const days = Math.max(daysInMonth(key), 1);
  const remainingDays = isCurrent ? Math.max(days - now.getDate(), 0) : 0;
  const closed = remainingDays <= 0;
  const byCat: Record<string, number> = {};
  for (const e of monthExpenses) {
    if (!e.occurredOn.startsWith(key)) continue;
    byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
  }
  const names = new Set([...Object.keys(byCat), ...budgets.map((b) => b.category)]);
  const out: CategoryProjection[] = [];
  for (const category of names) {
    const spent = byCat[category] ?? 0;
    if (spent <= 0 && !budgets.some((b) => b.category === category && b.limitAmount > 0)) continue;
    const budget = budgets.find((b) => b.category === category && b.limitAmount > 0)?.limitAmount ?? null;
    const dailyPace = day > 0 ? spent / day : spent;
    const projected = closed ? Math.round(spent) : Math.round(dailyPace * days);
    let guidance = closed
      ? `${monthLabel(key)} is closed. ${category} finished at ${formatInr(spent)}.`
      : "On a quiet pace. Keep logging so the month stays honest.";
    let save = 0;
    if (budget != null && projected > budget) {
      const room = Math.max(budget - spent, 0);
      const dailyCap = remainingDays > 0 ? room / remainingDays : 0;
      save = Math.max(projected - budget, 0);
      if (closed) {
        guidance = `${category} closed at ${formatInr(spent)} against a ${formatInr(budget)} limit${spent > budget ? ` · ${formatInr(spent - budget)} over` : ""}.`;
      } else {
        guidance = `On track for ${formatInr(projected)}. Cap ${category} at ${formatInr(dailyCap)} a day for the next ${remainingDays} days to stay inside ${formatInr(budget)}.`;
      }
    } else if (budget != null && spent / budget >= 0.8) {
      const left = budget - spent;
      if (closed) {
        guidance = `${category} used ${Math.round((spent / budget) * 100)}% of its ${formatInr(budget)} limit.`;
      } else {
        guidance = `${formatInr(left)} left in ${category}. Treat it as a daily allowance of ${formatInr(remainingDays > 0 ? left / remainingDays : left)}.`;
      }
    } else if (!closed && projected > spent * 1.2 && spent > 0) {
      save = Math.round(projected - spent);
      guidance = `This category is running hot. Holding the rest of the month at today's average still lands near ${formatInr(projected)}. Skip one optional spend this week.`;
    } else if (budget != null && closed) {
      const left = Math.max(budget - spent, 0);
      guidance =
        left > 0
          ? `${category} closed ${formatInr(left)} under its ${formatInr(budget)} limit.`
          : `${category} closed at ${formatInr(spent)} on a ${formatInr(budget)} limit.`;
    }
    out.push({ category, spent, projected, budget, dailyPace, remainingDays, guidance, save });
  }
  return out.sort((a, b) => b.projected - a.projected);
}

export function backupIsDue(
  cadence: BackupCadence,
  lastBackupAt: string | null,
  now = new Date(),
): boolean {
  if (cadence === "off") return false;
  if (!lastBackupAt) return true;
  const last = new Date(lastBackupAt).getTime();
  if (!Number.isFinite(last)) return true;
  const elapsed = now.getTime() - last;
  const day = 24 * 60 * 60 * 1000;
  if (cadence === "daily") return elapsed >= day;
  if (cadence === "weekly") return elapsed >= 7 * day;
  return elapsed >= 30 * day;
}

export function isTripExpense(expense: Expense): boolean {
  return expense.tripId != null && expense.tripId > 0;
}

export function withoutTrips(expenses: Expense[]): Expense[] {
  return expenses.filter((e) => !isTripExpense(e));
}

export function splitLedger(expenses: Expense[]): {
  regular: Expense[];
  trips: Expense[];
  tripTotal: number;
  regularTotal: number;
} {
  const regular: Expense[] = [];
  const trips: Expense[] = [];
  let tripTotal = 0;
  let regularTotal = 0;
  for (const e of expenses) {
    if (isTripExpense(e)) {
      trips.push(e);
      tripTotal += e.amount;
    } else {
      regular.push(e);
      regularTotal += e.amount;
    }
  }
  return { regular, trips, tripTotal, regularTotal };
}

export function isoWeekStart(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = d.getDay();
  const back = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - back);
  return todayIso(d);
}

export type ScorePeriod = "day" | "week" | "month" | "trend";

export type SpendScore = {
  period: ScorePeriod;
  score: number;
  spent: number;
  expected: number;
  remaining: number;
  label: string;
  headline: string;
};

export function scoreCompareLabels(period: ScorePeriod): { spent: string; usual: string } {
  if (period === "day") return { spent: "Spent today", usual: "Usual day" };
  if (period === "week") return { spent: "Spent this week", usual: "Usual week" };
  if (period === "trend") return { spent: "This month", usual: "Usual month" };
  return { spent: "Spent this month", usual: "Usual month" };
}

/** Plain-English gap versus a usual period. Everyday spend only. */
export function explainScore(s: SpendScore): string {
  if (s.expected <= 0) {
    return s.spent <= 0
      ? "No everyday spend in this window yet."
      : "A usual amount will appear after a few months of logs.";
  }
  const gap = formatInr(Math.abs(s.remaining));
  const usual = formatInr(s.expected);
  if (s.period === "day") {
    return s.remaining >= 0
      ? `${gap} under a usual day of ${usual}.`
      : `${gap} over a usual day of ${usual}.`;
  }
  if (s.period === "week") {
    return s.remaining >= 0
      ? `${gap} under a usual week of ${usual}.`
      : `${gap} over a usual week of ${usual}.`;
  }
  if (s.period === "trend") {
    const pct = Math.round(((s.spent - s.expected) / s.expected) * 100);
    if (pct === 0) return `In line with a usual month of ${usual}.`;
    return pct > 0
      ? `${Math.abs(pct)}% higher than a usual month of ${usual}.`
      : `${Math.abs(pct)}% lower than a usual month of ${usual}.`;
  }
  return s.remaining >= 0
    ? `${gap} still under a usual month of ${usual}.`
    : `${gap} over a usual month of ${usual}.`;
}

export function scoreFromSpend(spent: number, expected: number): { score: number; label: string } {
  const safeSpent = Number.isFinite(spent) ? Math.max(0, spent) : 0;
  const safeExpected = Number.isFinite(expected) ? Math.max(0, expected) : 0;
  if (safeExpected <= 0) {
    const score = safeSpent <= 0 ? 100 : 72;
    return { score, label: safeSpent <= 0 ? "Fresh start" : "Building a baseline" };
  }
  const ratio = safeSpent / safeExpected;
  let score: number;
  if (ratio <= 0.5) score = 100 - Math.round(ratio * 20);
  else if (ratio <= 1) score = 90 - Math.round((ratio - 0.5) * 36);
  else if (ratio <= 1.4) score = 72 - Math.round((ratio - 1) * 80);
  else if (ratio <= 2) score = 40 - Math.round((ratio - 1.4) * 50);
  else score = Math.max(5, 10 - Math.round((ratio - 2) * 5));
  const label =
    score >= 88 ? "On a roll" : score >= 72 ? "Steady" : score >= 55 ? "Watch it" : score >= 35 ? "Heavy" : "Over pace";
  return { score, label };
}

export function computeSpendScore(
  expenses: Expense[],
  period: ScorePeriod,
  now = new Date(),
): SpendScore {
  if (period === "trend") return computeTrendScore(expenses, monthKey(now));
  const regular = withoutTrips(expenses);
  const months = lastNMonthKeys(LOOKBACK_MONTHS, monthKey(now));
  const avgMonthly = analyzeSpending(regular, months).avgMonthly;
  const key = monthKey(now);
  const days = Math.max(daysInMonth(key), 1);
  const today = todayIso(now);
  const weekStart = isoWeekStart(now);

  let spent = 0;
  let expected = 0;
  let headline = "This month";

  if (period === "day") {
    spent = regular.filter((e) => e.occurredOn === today).reduce((s, e) => s + e.amount, 0);
    expected = avgMonthly / days;
    headline = key === monthKey() ? "Today" : formatDay(today);
  } else if (period === "week") {
    spent = regular
      .filter((e) => e.occurredOn >= weekStart && e.occurredOn <= today)
      .reduce((s, e) => s + e.amount, 0);
    expected = (avgMonthly * 7) / days;
    headline = key === monthKey() ? "This week" : `Week of ${formatDay(weekStart)}`;
  } else {
    spent = regular.filter((e) => e.occurredOn.startsWith(key)).reduce((s, e) => s + e.amount, 0);
    expected = avgMonthly;
    headline = monthLabel(key);
  }

  const { score, label } = scoreFromSpend(spent, expected);
  return {
    period,
    score,
    label,
    spent,
    expected,
    remaining: expected - spent,
    headline,
  };
}

export function computeTrendScore(expenses: Expense[], month: string): SpendScore {
  const key = /^\d{4}-\d{2}$/.test(month) ? month : monthKey();
  const regular = withoutTrips(expenses);
  const spent = regular.filter((e) => e.occurredOn.startsWith(key)).reduce((s, e) => s + e.amount, 0);
  const prior = lastNMonthKeys(LOOKBACK_MONTHS, shiftMonth(key, -1));
  const avgMonthly = analyzeSpending(regular, prior).avgMonthly;
  const { score, label } = scoreFromSpend(spent, avgMonthly);
  const delta = avgMonthly > 0 ? ((spent - avgMonthly) / avgMonthly) * 100 : null;
  const headline =
    delta == null
      ? `${monthLabel(key)} vs usual`
      : delta > 0
        ? `${Math.round(delta)}% higher than usual`
        : delta < 0
          ? `${Math.round(Math.abs(delta))}% lower than usual`
          : "In line with usual";
  return {
    period: "trend",
    score,
    label,
    spent,
    expected: avgMonthly,
    remaining: avgMonthly - spent,
    headline,
  };
}

export function spendScoresForMonth(
  expenses: Expense[],
  month: string,
  now = new Date(),
): Record<ScorePeriod, SpendScore> {
  const key = /^\d{4}-\d{2}$/.test(month) ? month : monthKey(now);
  const anchor = anchorDate(key, now);
  return {
    day: computeSpendScore(expenses, "day", anchor),
    week: computeSpendScore(expenses, "week", anchor),
    month: computeSpendScore(expenses, "month", anchor),
    trend: computeTrendScore(expenses, key),
  };
}

export const HOME_SCORE_PERIODS: ScorePeriod[] = ["day", "week", "month"];

export function periodWord(period: ScorePeriod): string {
  if (period === "day") return "day";
  if (period === "week") return "week";
  return "month";
}

export function periodExpenses(expenses: Expense[], period: ScorePeriod, now = new Date()): Expense[] {
  const regular = withoutTrips(expenses);
  const today = todayIso(now);
  if (period === "day") return regular.filter((e) => e.occurredOn === today);
  if (period === "week") {
    const start = isoWeekStart(now);
    return regular.filter((e) => e.occurredOn >= start && e.occurredOn <= today);
  }
  const key = monthKey(now);
  return regular.filter((e) => e.occurredOn.startsWith(key));
}

export type ScoreWhy = {
  period: ScorePeriod;
  score: number;
  label: string;
  headline: string;
  summary: string;
  points: string[];
  drivers: { name: string; amount: number; share: number }[];
  spent: number;
  expected: number;
  nextStep: string;
};

export function scoreWhy(s: SpendScore, expenses: Expense[], now = new Date()): ScoreWhy {
  const window = periodExpenses(expenses, s.period, now);
  const word = periodWord(s.period);
  const total = window.reduce((sum, e) => sum + e.amount, 0);
  const cat = new Map<string, number>();
  for (const e of window) cat.set(e.category, (cat.get(e.category) ?? 0) + e.amount);
  const drivers = [...cat.entries()]
    .map(([name, amount]) => ({ name, amount, share: total > 0 ? amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  const points: string[] = [];
  let summary: string;
  let nextStep: string;

  if (s.expected <= 0) {
    if (s.spent <= 0) {
      summary = `Score ${s.score} because there is no everyday spend in this ${word} yet. A clean window starts at 100.`;
      nextStep = "Log the next everyday spend. The score will move once a usual amount exists.";
    } else {
      summary = `Score ${s.score} because Keep does not have a usual ${word} yet. Until a few months of logs exist, the score sits at 72.`;
      nextStep = "Keep logging everyday spend. A usual amount appears after a few months, then the score tracks pace.";
    }
    points.push("Trips are left out of the score, so holiday money does not punish everyday pace.");
    if (drivers[0]) {
      points.push(`${drivers[0].name} is the only slice that matters so far at ${formatInr(drivers[0].amount)}.`);
    }
  } else {
    const pct = Math.round((s.spent / s.expected) * 100);
    const gap = formatInr(Math.abs(s.remaining));
    summary =
      s.remaining >= 0
        ? `Score ${s.score} because everyday spend is ${pct}% of a usual ${word} — ${formatInr(s.spent)} vs ${formatInr(s.expected)}.`
        : `Score ${s.score} because everyday spend is ${pct}% of a usual ${word} — ${formatInr(s.spent)} vs ${formatInr(s.expected)}.`;
    if (s.remaining >= 0) {
      points.push(`${gap} still under a usual ${word} of ${formatInr(s.expected)}.`);
    } else {
      points.push(`${gap} over a usual ${word} of ${formatInr(s.expected)}. That overage is what pulled the number down.`);
    }
    points.push("100 is well under usual. 72 is on pace. Lower means this window is running hot.");
    points.push("Only everyday spend counts. Tagged trip money is on the trip ledger.");
    if (drivers[0]) {
      points.push(
        `${drivers[0].name} is the heaviest slice at ${formatInr(drivers[0].amount)} (${Math.round(drivers[0].share * 100)}% of this ${word}).`,
      );
    }
    if (s.score >= 88) {
      nextStep = `Hold this pace. Stay near ${formatInr(s.expected)} for the ${word} to keep “On a roll”.`;
    } else if (s.score >= 72) {
      nextStep = `Stay at or under ${formatInr(s.expected)} this ${word} to keep Steady (72+).`;
    } else {
      nextStep = `Get everyday spend back under ${formatInr(s.expected)} this ${word} to reach Steady (72).`;
    }
  }

  return {
    period: s.period,
    score: s.score,
    label: s.label,
    headline: s.headline,
    summary,
    points,
    drivers,
    spent: s.spent,
    expected: s.expected,
    nextStep,
  };
}

export const INSIGHT_CADENCE_OPTIONS: {
  id: InsightCadence;
  label: string;
  hint: string;
}[] = [
  { id: "daily", label: "Daily", hint: "Today versus a usual day" },
  { id: "weekly", label: "Weekly", hint: "This week versus a usual week" },
  { id: "bimonthly", label: "Bi-monthly", hint: "The last 15 days" },
  { id: "monthly", label: "Monthly", hint: "This month versus a usual month" },
  { id: "off", label: "Off", hint: "Hide behaviour reports" },
];

export function asInsightCadence(value: unknown): InsightCadence {
  if (value === "daily" || value === "weekly" || value === "bimonthly" || value === "monthly" || value === "off") {
    return value;
  }
  return "weekly";
}

export function insightWindow(
  cadence: Exclude<InsightCadence, "off">,
  now = new Date(),
): { from: string; to: string; label: string } {
  const to = todayIso(now);
  if (cadence === "daily") return { from: to, to, label: "Today" };
  if (cadence === "weekly") return { from: isoWeekStart(now), to, label: "This week" };
  if (cadence === "bimonthly") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - 14);
    return { from: todayIso(start), to, label: "Last 15 days" };
  }
  const key = monthKey(now);
  return { from: `${key}-01`, to, label: monthLabel(key) };
}

export type PeriodDigest = {
  cadence: Exclude<InsightCadence, "off">;
  label: string;
  spent: number;
  usual: number;
  remaining: number;
  score: SpendScore;
  notes: string[];
  drivers: { name: string; amount: number; share: number }[];
  suggestions: Suggestion[];
};

export function buildPeriodDigest(input: {
  expenses: Expense[];
  budgets: Budget[];
  investments: Investment[];
  members: Member[];
  cadence: Exclude<InsightCadence, "off">;
  now?: Date;
}): PeriodDigest {
  const now = input.now ?? new Date();
  const window = insightWindow(input.cadence, now);
  const regular = withoutTrips(input.expenses);
  const slice = regular.filter((e) => e.occurredOn >= window.from && e.occurredOn <= window.to);
  const spent = slice.reduce((s, e) => s + e.amount, 0);
  const months = lastNMonthKeys(LOOKBACK_MONTHS, monthKey(now));
  const avgMonthly = analyzeSpending(regular, months).avgMonthly;
  const days = Math.max(daysInMonth(monthKey(now)), 1);
  const usual =
    input.cadence === "daily"
      ? avgMonthly / days
      : input.cadence === "weekly"
        ? (avgMonthly * 7) / days
        : input.cadence === "bimonthly"
          ? avgMonthly / 2
          : avgMonthly;
  const period: ScorePeriod =
    input.cadence === "daily" ? "day" : input.cadence === "weekly" ? "week" : "month";
  const score = computeSpendScore(regular, period, now);
  const cat = new Map<string, number>();
  for (const e of slice) cat.set(e.category, (cat.get(e.category) ?? 0) + e.amount);
  const drivers = [...cat.entries()]
    .map(([name, amount]) => ({ name, amount, share: spent > 0 ? amount / spent : 0 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);
  const byCategory: Record<string, number> = {};
  for (const e of slice) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  const prevSpend = (() => {
    if (input.cadence === "daily") {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      y.setDate(y.getDate() - 1);
      const key = todayIso(y);
      return regular.filter((e) => e.occurredOn === key).reduce((s, e) => s + e.amount, 0);
    }
    if (input.cadence === "weekly") {
      const start = new Date(window.from);
      start.setDate(start.getDate() - 7);
      const from = todayIso(start);
      const to = window.from;
      return regular.filter((e) => e.occurredOn >= from && e.occurredOn < to).reduce((s, e) => s + e.amount, 0);
    }
    if (input.cadence === "bimonthly") {
      const start = new Date(window.from);
      start.setDate(start.getDate() - 15);
      const from = todayIso(start);
      return regular.filter((e) => e.occurredOn >= from && e.occurredOn < window.from).reduce((s, e) => s + e.amount, 0);
    }
    const prevKey = shiftMonth(monthKey(now), -1);
    return regular.filter((e) => e.occurredOn.startsWith(prevKey)).reduce((s, e) => s + e.amount, 0);
  })();
  const investMonth = input.investments
    .filter((i) => i.investedOn >= window.from && i.investedOn <= window.to)
    .reduce((s, i) => s + i.amount, 0);
  const suggestions = buildSuggestions({
    monthSpend: spent,
    byCategory,
    budgets: input.budgets,
    investmentsMonth: investMonth,
    prevSpend: prevSpend > 0 ? prevSpend : null,
    behavior: analyzeSpending(slice, months),
    members: input.members,
  }).slice(0, 3);

  const notes: string[] = [];
  const gap = Math.abs(usual - spent);
  if (usual <= 0) {
    notes.push("A usual amount appears after a few months of logs. Until then, watch the mix — not the score.");
  } else if (spent > usual) {
    notes.push(`${formatInr(gap)} over a usual ${window.label.toLowerCase()} of ${formatInr(usual)}.`);
  } else {
    notes.push(`${formatInr(gap)} still under a usual ${window.label.toLowerCase()} of ${formatInr(usual)}.`);
  }
  if (drivers[0] && spent > 0) {
    notes.push(
      `${drivers[0].name} led this window at ${formatInr(drivers[0].amount)} (${Math.round(drivers[0].share * 100)}%).`,
    );
  }
  const weekend = slice.filter((e) => {
    const [y, m, d] = e.occurredOn.split("-").map(Number);
    const day = new Date(y!, (m ?? 1) - 1, d).getDay();
    return day === 0 || day === 6;
  }).reduce((s, e) => s + e.amount, 0);
  if (spent > 0 && input.cadence !== "daily") {
    notes.push(`Weekend share ${Math.round((weekend / spent) * 100)}% of this window.`);
  }
  notes.push("Trip money stays on the trip ledger, so holiday spend does not punish this report.");

  return {
    cadence: input.cadence,
    label: window.label,
    spent,
    usual,
    remaining: usual - spent,
    score,
    notes,
    drivers,
    suggestions,
  };
}

export function typicalMonthAverage(expenses: Expense[], from = monthKey()): number {
  return analyzeSpending(withoutTrips(expenses), lastNMonthKeys(LOOKBACK_MONTHS, from)).avgMonthly;
}

export type MonthClose = {
  month: string;
  everyday: number;
  tripTotal: number;
  invest: number;
  count: number;
  avgTicket: number;
  vsPrevious: number | null;
  vsUsual: number | null;
  weekendShare: number;
  weekdayAvg: number;
  weekendAvg: number;
  topCategories: { name: string; amount: number; share: number }[];
  paymentMix: PaymentGroupSlice[];
  heaviestDay: { date: string; amount: number } | null;
  summary: string;
  habits: string[];
  decisions: string[];
};

export function buildMonthClose(input: {
  expenses: Expense[];
  investments: Investment[];
  month: string;
}): MonthClose {
  const key = /^\d{4}-\d{2}$/.test(input.month) ? input.month : monthKey();
  const monthExp = input.expenses.filter((e) => e.occurredOn.startsWith(key));
  const split = splitLedger(monthExp);
  const prevKey = shiftMonth(key, -1);
  const prevEveryday = withoutTrips(input.expenses.filter((e) => e.occurredOn.startsWith(prevKey)));
  const prevTotal = prevEveryday.reduce((s, e) => s + e.amount, 0);
  const usualMonths = lastNMonthKeys(LOOKBACK_MONTHS, shiftMonth(key, -1));
  const usual = analyzeSpending(withoutTrips(input.expenses), usualMonths).avgMonthly;
  const behavior = analyzeSpending(split.regular, [key]);
  const invest = input.investments
    .filter((i) => i.investedOn.startsWith(key))
    .reduce((s, i) => s + i.amount, 0);
  const count = split.regular.length;
  const avgTicket = count > 0 ? split.regularTotal / count : 0;
  const vsPrevious = prevTotal > 0 ? ((split.regularTotal - prevTotal) / prevTotal) * 100 : null;
  const vsUsual = usual > 0 ? ((split.regularTotal - usual) / usual) * 100 : null;

  const byDay = new Map<string, number>();
  for (const e of split.regular) {
    byDay.set(e.occurredOn, (byDay.get(e.occurredOn) ?? 0) + e.amount);
  }
  let heaviestDay: { date: string; amount: number } | null = null;
  for (const [date, amount] of byDay) {
    if (!heaviestDay || amount > heaviestDay.amount) heaviestDay = { date, amount };
  }

  const habits: string[] = [];
  const weekendPct = Math.round(behavior.weekendShare * 100);
  if (count === 0) {
    habits.push("No everyday spend was logged this month, so there is no behaviour to score.");
  } else {
    if (weekendPct >= 35) {
      habits.push(
        `Weekends took ${weekendPct}% of everyday spend. Saturday and Sunday are doing more work than the workweek.`,
      );
    } else if (weekendPct > 0) {
      habits.push(`Weekends were ${weekendPct}% of everyday spend — the workweek still carries most of the month.`);
    }
    if (behavior.weekendAvg > 0 && behavior.weekdayAvg > 0 && behavior.weekendAvg > behavior.weekdayAvg * 1.25) {
      habits.push(
        `A weekend day averaged ${formatInr(behavior.weekendAvg)} vs ${formatInr(behavior.weekdayAvg)} on a weekday.`,
      );
    }
    const top = behavior.topCategories[0];
    if (top && top.share >= 0.28) {
      habits.push(`${top.name} alone was ${Math.round(top.share * 100)}% of everyday spend (${formatInr(top.amount)}).`);
    } else if (behavior.topCategories.length >= 3) {
      const share = behavior.topCategories.slice(0, 3).reduce((s, c) => s + c.share, 0);
      habits.push(
        `${behavior.topCategories
          .slice(0, 3)
          .map((c) => c.name)
          .join(", ")} together made ${Math.round(share * 100)}% of the month.`,
      );
    }
    const pay = behavior.paymentMix[0];
    if (pay && pay.share >= 0.5) {
      habits.push(`${pay.label} was ${Math.round(pay.share * 100)}% of everyday payments.`);
    }
    if (heaviestDay && split.regularTotal > 0 && heaviestDay.amount / split.regularTotal >= 0.12) {
      habits.push(
        `${formatDay(heaviestDay.date)} was the heaviest day at ${formatInr(heaviestDay.amount)} — ${Math.round((heaviestDay.amount / split.regularTotal) * 100)}% of the month in one date.`,
      );
    }
    if (split.tripTotal > 0) {
      habits.push(
        `Trips added ${formatInr(split.tripTotal)} on their own ledger, kept out of everyday limits.`,
      );
    }
    if (vsPrevious != null) {
      habits.push(
        vsPrevious >= 0
          ? `Everyday spend was ${Math.abs(Math.round(vsPrevious))}% higher than ${monthLabel(prevKey)}.`
          : `Everyday spend was ${Math.abs(Math.round(vsPrevious))}% lower than ${monthLabel(prevKey)}.`,
      );
    }
  }

  const decisions: string[] = [];
  if (weekendPct >= 35) {
    const cap = Math.round(behavior.weekendAvg * 0.8);
    decisions.push(
      `Set a Saturday cap near ${formatInr(cap)} before the first UPI that day. Weekends are where the month slips.`,
    );
  }
  const food = (behavior.topCategories.find((c) => c.name === "Entertainment")?.amount ?? 0)
    + (behavior.topCategories.find((c) => c.name === "Groceries")?.amount ?? 0);
  if (split.regularTotal > 0 && food / split.regularTotal > 0.22) {
    decisions.push("Pick two nights that are usually delivery and cook. Food is the easiest rupee to take back.");
  }
  if (vsUsual != null && vsUsual > 8) {
    decisions.push(
      `Start this month at last month’s daily pace minus 10%. Usual is ${formatInr(usual)}; last month ran hot.`,
    );
  } else if (vsUsual != null && vsUsual < -8) {
    decisions.push(`Keep last month’s daily pace. You came in under usual — lock it in before lifestyle creeps back.`);
  }
  const heavy = behavior.topCategories[0];
  if (heavy && heavy.share >= 0.22) {
    decisions.push(`Open ${heavy.name} first on day 1 and put a hard cap on it before anything else is logged.`);
  }
  if (invest <= 0 && split.regularTotal > 0) {
    decisions.push("Park one transfer to SIP or gold in the first week, before the month fills up.");
  }
  if (decisions.length === 0) {
    decisions.push("Review the top three categories on day 1 and write one cap you will not break this month.");
  }

  let summary = `Everyday spend was ${formatInr(split.regularTotal)} across ${count} ${count === 1 ? "entry" : "entries"} in ${monthLabel(key)}.`;
  if (split.tripTotal > 0) {
    summary += ` Trips added ${formatInr(split.tripTotal)} on a separate ledger.`;
  }
  if (heavy) summary += ` Heaviest category: ${heavy.name}.`;
  if (vsPrevious != null) {
    summary +=
      vsPrevious >= 0
        ? ` That is ${Math.abs(Math.round(vsPrevious))}% more than the month before.`
        : ` That is ${Math.abs(Math.round(vsPrevious))}% less than the month before.`;
  }
  if (weekendPct >= 30) summary += ` Weekends carried ${weekendPct}% of everyday spend.`;

  return {
    month: key,
    everyday: split.regularTotal,
    tripTotal: split.tripTotal,
    invest,
    count,
    avgTicket,
    vsPrevious,
    vsUsual,
    weekendShare: behavior.weekendShare,
    weekdayAvg: behavior.weekdayAvg,
    weekendAvg: behavior.weekendAvg,
    topCategories: behavior.topCategories,
    paymentMix: behavior.paymentMix,
    heaviestDay,
    summary,
    habits,
    decisions,
  };
}

export function monthCloseIsFresh(now = new Date()): boolean {
  return now.getDate() <= 12;
}

export function alertsForNow(
  notifications: AppNotification[],
  ctx: {
    trips: Trip[];
    expenses: Expense[];
    budgets: Budget[];
    joinRequests: JoinRequest[];
    month: string;
    monthlyLimit?: number;
  },
): AppNotification[] {
  const monthExp = withoutTrips(ctx.expenses.filter((e) => e.occurredOn.startsWith(ctx.month)));
  const byCat: Record<string, number> = {};
  let everyday = 0;
  for (const e of monthExp) {
    byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
    everyday += e.amount;
  }

  const live = notifications.filter((n) => {
    if (n.kind === "trip_overspend" || n.kind === "trip_warning") {
      const name = n.title.includes(" · ") ? n.title.slice(n.title.indexOf(" · ") + 3) : "";
      const trip = ctx.trips.find((t) => t.name === name);
      if (!trip || trip.budgetLimit <= 0) return false;
      const pct = trip.total / trip.budgetLimit;
      if (n.kind === "trip_overspend") return pct >= 1;
      return pct >= 0.8 && pct < 1;
    }
    if (n.kind === "overspend" || n.kind === "warning") {
      const cat = n.title.includes(" · ") ? n.title.slice(n.title.indexOf(" · ") + 3) : "";
      const b = ctx.budgets.find((x) => x.category === cat && x.limitAmount > 0);
      if (!b) return false;
      const spent = byCat[cat] ?? 0;
      const pct = spent / b.limitAmount;
      if (n.kind === "overspend") return pct >= 1;
      return pct >= 0.8 && pct < 1;
    }
    if (n.kind === "household_overspend" || n.kind === "household_warning") {
      const cap = householdCapStatus(everyday, ctx.monthlyLimit ?? 0);
      if (!cap) return false;
      if (n.kind === "household_overspend") return cap.level === "over";
      return cap.level === "warn";
    }
    if (n.kind === "join_request") return ctx.joinRequests.length > 0;
    return true;
  });

  const cap = householdCapStatus(everyday, ctx.monthlyLimit ?? 0);
  if (cap?.level === "over" && !live.some((n) => n.kind === "household_overspend")) {
    live.unshift({
      id: -101,
      kind: "household_overspend",
      title: "Over household cap",
      body: `Everyday spend is ${formatInr(cap.spent)} against a ${formatInr(cap.limit)} household cap — ${formatInr(-cap.remaining)} over.`,
      href: "/budgets",
      read: false,
      createdAt: new Date().toISOString(),
    });
  } else if (cap?.level === "warn" && !live.some((n) => n.kind === "household_warning")) {
    live.unshift({
      id: -102,
      kind: "household_warning",
      title: "Household cap almost gone",
      body: `Everyday spend is ${Math.round(cap.pct * 100)}% of the ${formatInr(cap.limit)} household cap. ${formatInr(cap.remaining)} left this month.`,
      href: "/budgets",
      read: false,
      createdAt: new Date().toISOString(),
    });
  }
  return live;
}

export function tripPending(trip: Pick<Trip, "total" | "budgetLimit">): number | null {
  if (!trip.budgetLimit || trip.budgetLimit <= 0) return null;
  return trip.budgetLimit - trip.total;
}

export type ActionInsight = {
  id: string;
  tone: "danger" | "warn" | "good" | "info";
  title: string;
  body: string;
  metric?: string;
  href: string;
  hrefLabel: string;
};

export function buildActionInsights(input: {
  monthSpend: number;
  tripTotal: number;
  byCategory: Record<string, number>;
  budgets: Budget[];
  trips: Trip[];
  prevSpend: number | null;
  behavior: SpendBehavior;
  investmentsMonth: number;
  householdLimit?: number;
}): ActionInsight[] {
  const out: ActionInsight[] = [];
  const daysLeft = daysLeftInMonth();
  const day = Math.max(new Date().getDate(), 1);

  const cap = householdCapStatus(input.monthSpend, input.householdLimit ?? 0);
  if (cap?.level === "over") {
    out.push({
      id: "household-over",
      tone: "danger",
      title: "Household monthly cap is breached",
      body: `Everyday spend is ${formatInr(cap.spent)} against a ${formatInr(cap.limit)} household cap. Pause optional spends for ${daysLeft} days. Must-buys only.`,
      metric: `${formatInr(-cap.remaining)} over`,
      href: "/budgets",
      hrefLabel: "Open household cap",
    });
  } else if (cap?.level === "warn") {
    out.push({
      id: "household-warn",
      tone: "warn",
      title: "Household cap is nearly gone",
      body: `${formatInr(cap.remaining)} left of the ${formatInr(cap.limit)} household cap for ${daysLeft} days — about ${formatInr(daysLeft > 0 ? cap.remaining / daysLeft : cap.remaining)} a day.`,
      metric: `${Math.round(cap.pct * 100)}% used`,
      href: "/budgets",
      hrefLabel: "Open household cap",
    });
  }

  for (const b of input.budgets) {
    if (b.limitAmount <= 0) continue;
    const spent = input.byCategory[b.category] ?? 0;
    if (spent > b.limitAmount) {
      const over = spent - b.limitAmount;
      out.push({
        id: `over-${b.category}`,
        tone: "danger",
        title: `${b.category} is over its limit`,
        body: `Pause optional ${b.category} spends for the next ${daysLeft} days. Move must-buys to a cheaper substitute so this does not keep compounding.`,
        metric: `${formatInr(over)} over`,
        href: "/budgets",
        hrefLabel: "Adjust limit",
      });
    } else if (spent / b.limitAmount >= 0.8) {
      const left = b.limitAmount - spent;
      const daily = daysLeft > 0 ? left / daysLeft : left;
      out.push({
        id: `risk-${b.category}`,
        tone: "warn",
        title: `${b.category} has ${formatInr(left)} left`,
        body: `Treat it as ${formatInr(daily)} a day. Before the next UPI in this category, check Keep.`,
        metric: `${Math.round((spent / b.limitAmount) * 100)}% used`,
        href: "/add",
        hrefLabel: "Log a cheaper option",
      });
    }
  }

  for (const trip of input.trips) {
    if (trip.budgetLimit <= 0) continue;
    const pending = trip.budgetLimit - trip.total;
    if (pending < 0) {
      out.push({
        id: `trip-over-${trip.id}`,
        tone: "danger",
        title: `${trip.name} is over its trip budget`,
        body: `Trip money does not count against category limits, but this trip itself is ${formatInr(-pending)} past ${formatInr(trip.budgetLimit)}. Freeze optional trip spends.`,
        metric: formatInr(trip.total),
        href: "/trips",
        hrefLabel: "Open trip",
      });
    } else if (trip.budgetLimit > 0 && trip.total / trip.budgetLimit >= 0.8) {
      out.push({
        id: `trip-risk-${trip.id}`,
        tone: "warn",
        title: `${trip.name} has ${formatInr(pending)} pending`,
        body: `Keep remaining trip spends inside ${formatInr(pending)}. Everyday category caps are untouched.`,
        metric: `${Math.round((trip.total / trip.budgetLimit) * 100)}% of trip budget`,
        href: "/trips",
        hrefLabel: "Review trip",
      });
    }
  }

  if (input.monthSpend > 0 && daysLeft > 3) {
    const projected = (input.monthSpend / day) * daysInMonth(monthKey());
    if (projected > input.monthSpend * 1.12) {
      out.push({
        id: "pace",
        tone: "warn",
        title: "Everyday pace will overshoot the month",
        body: `At today's clip you close near ${formatInr(projected)}. Cut shopping and delivery until next week, then log tonight so the number is honest.`,
        metric: formatInr(projected),
        href: "/add",
        hrefLabel: "Log today",
      });
    }
  }

  if (input.prevSpend != null && input.prevSpend > 0) {
    const delta = (input.monthSpend - input.prevSpend) / input.prevSpend;
    if (delta > 0.12) {
      out.push({
        id: "vs-prev",
        tone: "danger",
        title: `Everyday spend is ${Math.round(delta * 100)}% above last month`,
        body: `Freeze the two heaviest categories at last month's rupees for ${daysLeft} days. Tell the household so nobody books a surprise.`,
        metric: formatInr(input.monthSpend - input.prevSpend),
        href: "/expenses",
        hrefLabel: "See the leak",
      });
    } else if (delta < -0.1) {
      out.push({
        id: "vs-prev-good",
        tone: "good",
        title: "Nice pullback — lock it in",
        body: `You spent ${Math.round(Math.abs(delta) * 100)}% less everyday than last month. Invest the gap this week so it does not leak back into UPI.`,
        metric: formatInr(input.prevSpend - input.monthSpend),
        href: "/investments",
        hrefLabel: "Park the gap",
      });
    }
  }

  if (input.behavior.weekendShare > 0.4) {
    out.push({
      id: "weekend",
      tone: "info",
      title: "Weekends are carrying the month",
      body: `${Math.round(input.behavior.weekendShare * 100)}% of everyday spend lands Sat–Sun. Agree a weekend cap before Friday 6 pm: one paid outing, not three.`,
      metric: `${Math.round(input.behavior.weekendShare * 100)}% weekend`,
      href: "/budgets",
      hrefLabel: "Set a cap",
    });
  }

  const food = (input.byCategory["Groceries"] ?? 0) + (input.byCategory["Entertainment"] ?? 0);
  if (food > 0 && food / Math.max(input.monthSpend, 1) > 0.28) {
    out.push({
      id: "food",
      tone: "warn",
      title: "Food is taking more than a quarter",
      body: "Cut two delivery nights this week. Cook or eat leftovers. Move what you don't spend into an SIP on Sunday.",
      metric: formatInr(Math.round(food * 0.18)),
      href: "/add",
      hrefLabel: "Log a homemade meal",
    });
  }

  if (input.monthSpend > 0 && input.investmentsMonth / input.monthSpend < 0.12) {
    const target = Math.round(input.monthSpend * 0.1);
    out.push({
      id: "invest",
      tone: "info",
      title: "Pay yourself 10% this month",
      body: `Everyday spend is funded; future-you is not. Park ${formatInr(target)} in an SIP, NPS, or FD on the salary date.`,
      metric: formatInr(target),
      href: "/investments",
      hrefLabel: "Log an investment",
    });
  }

  if (input.budgets.every((b) => b.limitAmount <= 0) && input.monthSpend > 0) {
    out.push({
      id: "no-limits",
      tone: "info",
      title: "No category limits are set",
      body: "Caps only appear on Home once you set them. Start with Groceries and Fashion — Keep will warn at 80% and 100%. Trip budgets live on each trip.",
      href: "/budgets",
      hrefLabel: "Set a limit",
    });
  }

  if (out.length === 0) {
    out.push({
      id: "steady",
      tone: "good",
      title: "On track — keep the next cut optional",
      body: "No red flags on everyday spend. If you want Keep stricter, shave 10% off the heaviest category and invest the gap.",
      href: "/budgets",
      hrefLabel: "Tighten a limit",
    });
  }

  return out.slice(0, 6);
}

export function shiftIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y!, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + days);
  return todayIso(dt);
}

export type KeepBadge = {
  id: string;
  title: string;
  hint: string;
  earned: boolean;
};

export type KeepQuest = {
  title: string;
  body: string;
  progress: number;
  goal: number;
  done: boolean;
};

export type KeepPlay = {
  logStreak: number;
  scoreStreak: number;
  loggedToday: boolean;
  rank: string;
  rankHint: string;
  xp: number;
  nextRankAt: number | null;
  badges: KeepBadge[];
  earnedCount: number;
  quest: KeepQuest;
};

const PLAY_RANKS: { at: number; name: string; hint: string }[] = [
  { at: 0, name: "New leaf", hint: "Log a few days to start a streak." },
  { at: 40, name: "Steady hand", hint: "You’re logging. Keep the pace." },
  { at: 120, name: "On a roll", hint: "Streaks and calm scores stack." },
  { at: 280, name: "Keeper", hint: "Everyday spend is a habit now." },
  { at: 520, name: "Crystal", hint: "Clear money, long streak." },
];

function everydayByDay(expenses: Expense[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of withoutTrips(expenses)) {
    map.set(e.occurredOn, (map.get(e.occurredOn) ?? 0) + e.amount);
  }
  return map;
}

export function computeKeepPlay(
  expenses: Expense[],
  scores: Record<ScorePeriod, SpendScore>,
  now = new Date(),
): KeepPlay {
  const today = todayIso(now);
  const regular = withoutTrips(expenses);
  const byDay = everydayByDay(regular);
  const loggedDays = new Set(byDay.keys());
  const months = lastNMonthKeys(LOOKBACK_MONTHS, monthKey(now));
  const avgMonthly = analyzeSpending(regular, months).avgMonthly;

  const streakStart = loggedDays.has(today) ? today : shiftIso(today, -1);
  let logStreak = 0;
  if (loggedDays.has(streakStart)) {
    let cursor = streakStart;
    while (loggedDays.has(cursor) && logStreak < 365) {
      logStreak += 1;
      cursor = shiftIso(cursor, -1);
    }
  }

  let scoreStreak = 0;
  {
    let cursor = loggedDays.has(today) ? today : shiftIso(today, -1);
    while (loggedDays.has(cursor) && scoreStreak < 90) {
      const spent = byDay.get(cursor) ?? 0;
      const key = cursor.slice(0, 7);
      const expected = avgMonthly / Math.max(daysInMonth(key), 1);
      if (scoreFromSpend(spent, expected).score < 72) break;
      scoreStreak += 1;
      cursor = shiftIso(cursor, -1);
    }
  }

  let xp = Math.min(logStreak, 30) * 2;
  const uniqueDays = [...loggedDays];
  for (const day of uniqueDays) {
    xp += 8;
    const spent = byDay.get(day) ?? 0;
    const expected = avgMonthly / Math.max(daysInMonth(day.slice(0, 7)), 1);
    const { score } = scoreFromSpend(spent, expected);
    if (score >= 88) xp += 12;
    else if (score >= 72) xp += 6;
  }

  let rank = PLAY_RANKS[0]!;
  let nextRankAt: number | null = PLAY_RANKS[1]?.at ?? null;
  for (let i = 0; i < PLAY_RANKS.length; i++) {
    const step = PLAY_RANKS[i]!;
    if (xp >= step.at) {
      rank = step;
      nextRankAt = PLAY_RANKS[i + 1]?.at ?? null;
    }
  }

  const weekStart = isoWeekStart(now);
  let weekLogged = 0;
  for (let i = 0; i < 7; i++) {
    const day = shiftIso(weekStart, i);
    if (day <= today && loggedDays.has(day)) weekLogged += 1;
  }

  const week = scores.week;
  const quest: KeepQuest =
    week.expected > 0 && week.remaining < 0
      ? {
          title: "Get the week back under usual",
          body: `Everyday this week is ${formatInr(week.spent)} vs ${formatInr(week.expected)} usual.`,
          progress: Math.min(week.spent, week.expected),
          goal: week.expected,
          done: false,
        }
      : {
          title: "Log 5 days this week",
          body: "A short streak is the whole game — one everyday entry a day is enough.",
          progress: weekLogged,
          goal: 5,
          done: weekLogged >= 5,
        };

  const badges: KeepBadge[] = [
    { id: "first", title: "First log", hint: "One everyday entry.", earned: uniqueDays.length >= 1 },
    { id: "streak3", title: "3-day streak", hint: "Log three days in a row.", earned: logStreak >= 3 },
    { id: "streak7", title: "Week logger", hint: "Seven days in a row.", earned: logStreak >= 7 },
    { id: "roll", title: "On a roll", hint: "Today’s score 88 or more.", earned: scores.day.score >= 88 },
    { id: "steady-week", title: "Steady week", hint: "This week’s score 72 or more.", earned: scores.week.score >= 72 },
    {
      id: "triple",
      title: "Triple calm",
      hint: "Day, week, and month all 72+.",
      earned: scores.day.score >= 72 && scores.week.score >= 72 && scores.month.score >= 72,
    },
    {
      id: "under",
      title: "Under usual",
      hint: "This month still under a usual month.",
      earned: scores.month.expected > 0 && scores.month.remaining >= 0,
    },
    { id: "month-roll", title: "Month on a roll", hint: "Month score 88 or more.", earned: scores.month.score >= 88 },
  ];

  return {
    logStreak,
    scoreStreak,
    loggedToday: loggedDays.has(today),
    rank: rank.name,
    rankHint: rank.hint,
    xp,
    nextRankAt,
    badges,
    earnedCount: badges.filter((b) => b.earned).length,
    quest,
  };
}

