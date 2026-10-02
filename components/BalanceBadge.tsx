import { faHourglassHalf } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { formatDate, formatMoney } from "@/lib/money";
import type { Balance } from "@/lib/schedule";
import type { Currency } from "@/lib/types";

export type Tone = "debt" | "credit" | "settled" | "upcoming";

export function balanceTone(b: Balance): Tone {
  if (b.balanceCents < 0) return "debt";
  if (b.balanceCents > 0) return "credit";
  if (b.chargeCount === 0) return "upcoming";
  return "settled";
}

export const TONE_LABEL: Record<Tone, string> = {
  debt: "Owed",
  credit: "In credit",
  settled: "Settled",
  upcoming: "Upcoming",
};

/** "₪200 owed" / "₪50 credit" / "Settled" - direction is always spelled out, never color-only. */
export function describeBalance(cents: number, currency: Currency): string {
  if (cents === 0) return "Settled";
  return `${formatMoney(Math.abs(cents), currency)} ${cents < 0 ? "owed" : "credit"}`;
}

export function BalanceBadge({
  balance,
  currency,
  next,
}: {
  balance: Balance;
  currency: Currency;
  next: string | null;
}) {
  const tone = balanceTone(balance);

  if (tone === "upcoming" || tone === "settled") {
    return (
      <span className={`badge badge-${tone}`}>
        {tone === "upcoming" ? (
          <>
            <FontAwesomeIcon icon={faHourglassHalf} />
            <span className="badge-text">{next ? `Starts ${formatDate(next, { weekday: undefined })}` : "Upcoming"}</span>
          </>
        ) : (
          <span className="badge-text">Settled</span>
        )}
      </span>
    );
  }

  return (
    <span className={`badge badge-${tone} badge-stack`}>
      <span>{formatMoney(Math.abs(balance.balanceCents), currency)}</span>
      <small>{tone === "debt" ? "owed" : "credit"}</small>
    </span>
  );
}
