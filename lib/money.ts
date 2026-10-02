import type { Currency } from "./types";

/** Upper bound for any single amount (100,000,000.00). */
export const MAX_CENTS = 10_000_000_000;

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: Currency, fractions: boolean) {
  const key = `${currency}-${fractions}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: fractions ? 2 : 0,
      maximumFractionDigits: fractions ? 2 : 0,
    });
    formatters.set(key, f);
  }
  return f;
}

/** Formats cents as currency; whole amounts drop the decimals. Negative uses a true minus sign. */
export function formatMoney(cents: number, currency: Currency): string {
  const abs = Math.abs(cents);
  const s = formatter(currency, abs % 100 !== 0).format(abs / 100);
  return cents < 0 ? `−${s}` : s;
}

export function currencySymbol(currency: Currency): string {
  return formatter(currency, false).formatToParts(0).find((p) => p.type === "currency")?.value ?? currency;
}

/**
 * Parses user input into cents, or null if invalid.
 * Accepts "12.5", "1,200", "1,200.50" and a decimal comma like "12,50".
 */
export function parseMoney(input: string): number | null {
  let s = input.trim().replace(/\s/g, "");
  if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(",", ".");
  else if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) s = s.replace(/,/g, "");
  if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(s)) return null;
  const cents = Math.round(parseFloat(s) * 100);
  return cents > MAX_CENTS ? null : cents;
}

export function centsToInput(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

/**
 * Formats a YYYY-MM-DD date like "Fri, Oct 2". Adds the year automatically
 * when it differs from the current year, unless `opts.year` is given.
 */
export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = {}): string {
  const [y, m, d] = iso.split("-").map(Number);
  const autoYear = y !== new Date().getFullYear() ? { year: "numeric" as const } : {};
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...autoYear,
    ...opts,
  });
}
