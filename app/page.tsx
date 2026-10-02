"use client";

import {
  faArrowRightFromBracket,
  faCircleCheck,
  faClock,
  faChevronRight,
  faPlus,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/components/AppProvider";
import { BalanceBadge, balanceTone, type Tone } from "@/components/BalanceBadge";
import { RequireAuth } from "@/components/RequireAuth";
import { useToday } from "@/components/useToday";
import { formatDate, formatMoney } from "@/lib/money";
import { computeBalance, describeSchedule, nextChargeDate } from "@/lib/schedule";
import type { Currency } from "@/lib/types";

const TONE_ORDER: Record<Tone, number> = { debt: 0, credit: 1, upcoming: 2, settled: 3 };

function sumByCurrency(rows: { currency: Currency; cents: number }[]) {
  const totals = new Map<Currency, number>();
  for (const r of rows) totals.set(r.currency, (totals.get(r.currency) ?? 0) + r.cents);
  return [...totals.entries()];
}

function Home() {
  const { payments, transactions, signOut, user } = useApp();
  const today = useToday();

  const rows = useMemo(
    () =>
      payments
        .map((p) => {
          const balance = computeBalance(p, transactions, today);
          const next = nextChargeDate(p, today);
          return { payment: p, balance, next, tone: balanceTone(balance), ended: next === null };
        })
        // Owed first (largest debt first), then credit, upcoming, settled; ended schedules last.
        .sort(
          (a, b) =>
            Number(a.ended && a.tone === "settled") - Number(b.ended && b.tone === "settled") ||
            TONE_ORDER[a.tone] - TONE_ORDER[b.tone] ||
            a.balance.balanceCents - b.balance.balanceCents,
        ),
    [payments, transactions, today],
  );

  const owed = sumByCurrency(
    rows.filter((r) => r.tone === "debt").map((r) => ({ currency: r.payment.currency, cents: -r.balance.balanceCents })),
  );
  const credit = sumByCurrency(
    rows.filter((r) => r.tone === "credit").map((r) => ({ currency: r.payment.currency, cents: r.balance.balanceCents })),
  );
  const owingCount = rows.filter((r) => r.tone === "debt").length;
  const creditLine = credit.map(([cur, cents]) => formatMoney(cents, cur)).join(" + ");

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">{formatDate(today, { weekday: "long", month: "long" })}</p>
          <h1 className="title">Payments</h1>
        </div>
        <button className="icon-btn" onClick={signOut} aria-label="Sign out" title={`Sign out ${user?.email ?? ""}`}>
          <FontAwesomeIcon icon={faArrowRightFromBracket} />
        </button>
      </header>

      {payments.length === 0 ? (
        <div className="empty empty-home">
          <FontAwesomeIcon icon={faWallet} className="empty-icon" />
          <h2>No payments yet</h2>
          <p className="muted">Create a recurring payment and Tally will keep track of what&rsquo;s due.</p>
          <Link href="/payments/new" className="btn btn-primary">
            <FontAwesomeIcon icon={faPlus} /> New payment
          </Link>
        </div>
      ) : (
        <>
          <section className={`summary card ${owed.length ? "summary-debt" : "summary-clear"}`} aria-label="Summary">
            {owed.length ? (
              <>
                <p className="summary-label">You owe</p>
                <div className="summary-amounts">
                  {owed.map(([cur, cents]) => (
                    <span key={cur} className="summary-amount">
                      {formatMoney(cents, cur)}
                    </span>
                  ))}
                </div>
                <p className="summary-sub">
                  across {owingCount} payment{owingCount === 1 ? "" : "s"}
                  {creditLine && <> &middot; {creditLine} in credit</>}
                </p>
              </>
            ) : (
              <>
                <p className="summary-label">
                  <FontAwesomeIcon icon={faCircleCheck} /> All caught up
                </p>
                <p className="summary-sub">{creditLine ? `Nothing owed. ${creditLine} in credit.` : "Nothing owed right now."}</p>
              </>
            )}
          </section>

          <ul className="list" aria-label="Payments">
            {rows.map(({ payment: p, balance, next, tone, ended }) => (
              <li key={p.id}>
                <Link
                  href={`/payments/${p.id}`}
                  className={`payment-card card ${ended && tone === "settled" ? "payment-card-dim" : ""}`}
                >
                  <div className="grow min0">
                    <p className="payment-name">{p.name}</p>
                    <p className="payment-meta">
                      {formatMoney(p.priceCents, p.currency)} &middot; {describeSchedule(p.schedule)}
                    </p>
                    <p className="payment-next">
                      <FontAwesomeIcon icon={faClock} /> {next ? `Next ${formatDate(next)}` : "Schedule ended"}
                    </p>
                  </div>
                  <BalanceBadge balance={balance} currency={p.currency} next={next} />
                  <FontAwesomeIcon icon={faChevronRight} className="chev" />
                </Link>
              </li>
            ))}
          </ul>

          <Link href="/payments/new" className="fab" aria-label="New payment">
            <FontAwesomeIcon icon={faPlus} />
          </Link>
        </>
      )}
    </>
  );
}

export default function HomePage() {
  return (
    <RequireAuth>
      <Home />
    </RequireAuth>
  );
}
