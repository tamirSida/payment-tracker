import type { Payment, Schedule, Transaction } from "./types";

const DAY = 86_400_000;
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Parse YYYY-MM-DD to a UTC midnight timestamp (calendar-date arithmetic only). */
export function parseDate(s: string): number {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function formatISO(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

/** Today's date in the user's local timezone, as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function every(s: Schedule): number {
  return Math.max(1, Math.floor(s.every || 1));
}

/** Whether a charge falls on day `t`, for a schedule that started on `start`. */
export function occursOn(s: Schedule, start: number, t: number): boolean {
  if (t < start) return false;
  const n = every(s);
  const date = new Date(t);

  switch (s.type) {
    case "daily":
      return Math.round((t - start) / DAY) % n === 0;

    case "weekly": {
      const dow = date.getUTCDay();
      if (!s.weekdays.includes(dow)) return false;
      // Weeks start on Sunday. The cycle is anchored on the week of the first
      // selected weekday on/after the start date, so the first charge is never skipped.
      let first = start;
      while (!s.weekdays.includes(new Date(first).getUTCDay())) first += DAY;
      const anchorWeek = first - new Date(first).getUTCDay() * DAY;
      const thisWeek = t - dow * DAY;
      return Math.round((thisWeek - anchorWeek) / (7 * DAY)) % n === 0;
    }

    case "monthly": {
      // Anchor the cycle on the first month whose charge day is on/after the start date.
      const sd = new Date(start);
      const sy = sd.getUTCFullYear();
      const sm = sd.getUTCMonth();
      const firstDom = Math.min(s.dayOfMonth, daysInMonth(sy, sm));
      const anchor = sy * 12 + sm + (sd.getUTCDate() <= firstDom ? 0 : 1);
      const months = date.getUTCFullYear() * 12 + date.getUTCMonth() - anchor;
      if (months < 0 || months % n !== 0) return false;
      const dom = Math.min(
        s.dayOfMonth,
        daysInMonth(date.getUTCFullYear(), date.getUTCMonth()),
      );
      return date.getUTCDate() === dom;
    }
  }
}

type Schedulable = Pick<Payment, "startDate" | "endDate" | "schedule">;

/** All charge dates from start through `until` (inclusive), capped by the end date. */
export function chargeDates(p: Schedulable, until: string): string[] {
  const start = parseDate(p.startDate);
  let last = parseDate(until);
  if (p.endDate) last = Math.min(last, parseDate(p.endDate));

  const out: string[] = [];
  for (let t = start; t <= last; t += DAY) {
    if (occursOn(p.schedule, start, t)) out.push(formatISO(t));
  }
  return out;
}

/** First charge strictly after `after`, or null if the schedule has ended. */
export function nextChargeDate(p: Schedulable, after: string): string | null {
  const start = parseDate(p.startDate);
  let t = Math.max(parseDate(after) + DAY, start);
  const end = p.endDate ? parseDate(p.endDate) : Infinity;
  const horizon = t + (370 * every(p.schedule) + 40) * DAY;

  for (; t <= end && t <= horizon; t += DAY) {
    if (occursOn(p.schedule, start, t)) return formatISO(t);
  }
  return null;
}

export interface Balance {
  chargeCount: number;
  owedCents: number;
  paidCents: number;
  /** paid - owed. Negative = in debt, positive = credit toward future charges. */
  balanceCents: number;
}

export function computeBalance(
  p: Payment,
  txs: Transaction[],
  today: string,
): Balance {
  const chargeCount = chargeDates(p, today).length;
  const owedCents = chargeCount * p.priceCents;
  const paidCents = txs
    .filter((t) => t.paymentId === p.id)
    .reduce((sum, t) => sum + t.amountCents, 0);
  return {
    chargeCount,
    owedCents,
    paidCents,
    balanceCents: paidCents - owedCents,
  };
}

/** Human description, e.g. "Weekly on Fri, Sat" or "Every 2 months on the 15th". */
export function describeSchedule(s: Schedule): string {
  const n = every(s);
  switch (s.type) {
    case "daily":
      return n === 1 ? "Daily" : `Every ${n} days`;
    case "weekly": {
      const days = [...s.weekdays].sort().map((d) => WEEKDAY_SHORT[d]).join(", ");
      const base = n === 1 ? "Weekly" : `Every ${n} weeks`;
      return days ? `${base} on ${days}` : base;
    }
    case "monthly": {
      const base = n === 1 ? "Monthly" : `Every ${n} months`;
      return `${base} on the ${ordinal(s.dayOfMonth)}`;
    }
  }
}

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return n + (["th", "st", "nd", "rd"][n % 10] ?? "th");
}
