import type { Currency } from "./types";

const formatters = new Map<Currency, Intl.NumberFormat>();

function formatter(currency: Currency) {
  let f = formatters.get(currency);
  if (!f) {
    f = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    formatters.set(currency, f);
  }
  return f;
}

/** Formats cents as currency; whole amounts drop the decimals. */
export function formatMoney(cents: number, currency: Currency): string {
  const abs = Math.abs(cents);
  const f = formatter(currency);
  const s =
    abs % 100 === 0
      ? f.format(abs / 100)
      : new Intl.NumberFormat("en-US", { style: "currency", currency }).format(abs / 100);
  return cents < 0 ? `-${s}` : s;
}

/** Parses user input like "12.5" or "1,200" into cents, or null if invalid. */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{0,2})?$|^\.\d{1,2}$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

export function centsToInput(cents: number): string {
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = {}): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...opts,
  });
}
