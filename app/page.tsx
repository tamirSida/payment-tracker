"use client";

import {
  faArrowRightFromBracket,
  faCalendarDay,
  faChevronRight,
  faCircleCheck,
  faPlus,
  faWallet,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/components/AppProvider";
import { BalanceBadge } from "@/components/BalanceBadge";
import { RequireAuth } from "@/components/RequireAuth";
import { formatDate, formatMoney } from "@/lib/money";
import { computeBalance, describeSchedule, nextChargeDate, todayISO } from "@/lib/schedule";
import type { Currency } from "@/lib/types";

function Home() {
  const { payments, transactions, signOut, user } = useApp();
  const today = todayISO();

  const rows = useMemo(
    () =>
      payments.map((p) => ({
        payment: p,
        balance: computeBalance(p, transactions, today),
        next: nextChargeDate(p, today),
      })),
    [payments, transactions, today],
  );

  const owedByCurrency = useMemo(() => {
    const totals = new Map<Currency, number>();
    for (const r of rows) {
      if (r.balance.balanceCents < 0) {
        totals.set(r.payment.currency, (totals.get(r.payment.currency) ?? 0) - r.balance.balanceCents);
      }
    }
    return [...totals.entries()];
  }, [rows]);

  const owingCount = rows.filter((r) => r.balance.balanceCents < 0).length;

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

      <section className={`summary card ${owedByCurrency.length ? "summary-debt" : "summary-clear"}`}>
        {owedByCurrency.length ? (
          <>
            <p className="summary-label">You owe</p>
            <div className="summary-amounts">
              {owedByCurrency.map(([cur, cents]) => (
                <span key={cur} className="summary-amount">
                  {formatMoney(cents, cur)}
                </span>
              ))}
            </div>
            <p className="summary-sub">
              across {owingCount} payment{owingCount === 1 ? "" : "s"}
            </p>
          </>
        ) : (
          <>
            <p className="summary-label">
              <FontAwesomeIcon icon={faCircleCheck} /> All caught up
            </p>
            <p className="summary-sub">
              {payments.length ? "Nothing owed right now." : "Add a payment to start tracking."}
            </p>
          </>
        )}
      </section>

      {payments.length === 0 ? (
        <div className="empty">
          <FontAwesomeIcon icon={faWallet} className="empty-icon" />
          <h2>No payments yet</h2>
          <p className="muted">Create a recurring payment and Tally will keep track of what&rsquo;s due.</p>
          <Link href="/payments/new" className="btn btn-primary">
            <FontAwesomeIcon icon={faPlus} /> New payment
          </Link>
        </div>
      ) : (
        <ul className="list" aria-label="Payments">
          {rows.map(({ payment: p, balance, next }) => (
            <li key={p.id}>
              <Link href={`/payments/${p.id}`} className="payment-card card">
                <div className="grow min0">
                  <p className="payment-name">{p.name}</p>
                  <p className="payment-meta">
                    {formatMoney(p.priceCents, p.currency)} &middot; {describeSchedule(p.schedule)}
                  </p>
                  <p className="payment-next">
                    <FontAwesomeIcon icon={faCalendarDay} />{" "}
                    {next ? `Next ${formatDate(next)}` : "Ended"}
                  </p>
                </div>
                <BalanceBadge cents={balance.balanceCents} currency={p.currency} />
                <FontAwesomeIcon icon={faChevronRight} className="chev" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {payments.length > 0 && (
        <Link href="/payments/new" className="fab" aria-label="New payment">
          <FontAwesomeIcon icon={faPlus} />
        </Link>
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
