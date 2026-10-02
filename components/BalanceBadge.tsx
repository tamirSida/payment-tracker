import { formatMoney } from "@/lib/money";
import type { Currency } from "@/lib/types";

export function balanceTone(cents: number): "debt" | "credit" | "settled" {
  if (cents < 0) return "debt";
  if (cents > 0) return "credit";
  return "settled";
}

export function balanceLabel(cents: number): string {
  return { debt: "Owed", credit: "Credit", settled: "Settled" }[balanceTone(cents)];
}

/** Shows the absolute amount; the tone + label convey the direction. */
export function BalanceBadge({ cents, currency }: { cents: number; currency: Currency }) {
  const tone = balanceTone(cents);
  return (
    <span className={`badge badge-${tone}`}>
      {tone === "settled" ? "Settled" : formatMoney(Math.abs(cents), currency)}
    </span>
  );
}
