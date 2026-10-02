"use client";

import {
  faArrowLeft,
  faArrowTrendDown,
  faCalendarDay,
  faCoins,
  faPen,
  faRotate,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { balanceLabel, balanceTone } from "@/components/BalanceBadge";
import { NotFound } from "@/components/NotFound";
import { PaySheet } from "@/components/PaySheet";
import { RequireAuth } from "@/components/RequireAuth";
import { ConfirmSheet } from "@/components/Sheet";
import { deleteTransaction } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/money";
import { chargeDates, computeBalance, describeSchedule, nextChargeDate, todayISO } from "@/lib/schedule";
import type { Transaction } from "@/lib/types";

type Entry =
  | { kind: "charge"; key: string; date: string; amountCents: number; running: number }
  | { kind: "payment"; key: string; date: string; amountCents: number; running: number; tx: Transaction };

const PAGE = 30;

function PaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, payments, transactions } = useApp();
  const [paying, setPaying] = useState(false);
  const [toDelete, setToDelete] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const today = todayISO();
  const payment = payments.find((p) => p.id === id);

  const data = useMemo(() => {
    if (!payment) return null;
    const txs = transactions.filter((t) => t.paymentId === payment.id);
    const balance = computeBalance(payment, txs, today);

    // Oldest first to compute a running balance; on the same day, charges come first.
    const raw = [
      ...chargeDates(payment, today).map((date) => ({ kind: "charge" as const, date, order: 0, createdAt: 0, amountCents: -payment.priceCents })),
      ...txs.map((tx) => ({ kind: "payment" as const, date: tx.date, order: 1, createdAt: tx.createdAt, amountCents: tx.amountCents, tx })),
    ].sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order || a.createdAt - b.createdAt);

    let running = 0;
    const entries: Entry[] = raw.map((e, i) => {
      running += e.amountCents;
      return e.kind === "charge"
        ? { kind: "charge", key: `c-${e.date}-${i}`, date: e.date, amountCents: e.amountCents, running }
        : { kind: "payment", key: e.tx.id, date: e.date, amountCents: e.amountCents, running, tx: e.tx };
    });

    return { balance, entries: entries.reverse(), next: nextChargeDate(payment, today) };
  }, [payment, transactions, today]);

  if (!payment || !data) return <NotFound />;

  const { balance, entries, next } = data;
  const tone = balanceTone(balance.balanceCents);
  const fmt = (c: number) => formatMoney(c, payment.currency);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteTransaction(user!.uid, toDelete.id);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <Link href="/" className="icon-btn" aria-label="Back">
          <FontAwesomeIcon icon={faArrowLeft} />
        </Link>
        <h1 className="title-sm truncate">{payment.name}</h1>
        <Link href={`/payments/${payment.id}/edit`} className="icon-btn" aria-label="Edit payment">
          <FontAwesomeIcon icon={faPen} />
        </Link>
      </header>

      <section className={`hero card hero-${tone}`}>
        <p className="hero-label">{balanceLabel(balance.balanceCents)}</p>
        <p className="hero-amount">{tone === "settled" ? fmt(0) : fmt(Math.abs(balance.balanceCents))}</p>
        <p className="hero-sub">
          {balance.chargeCount} charge{balance.chargeCount === 1 ? "" : "s"} of {fmt(payment.priceCents)} &middot; {fmt(balance.paidCents)} paid
        </p>
        <button className="btn btn-pay btn-block" onClick={() => setPaying(true)}>
          <FontAwesomeIcon icon={faCoins} /> Pay
        </button>
      </section>

      <section className="card details">
        <div className="detail-row">
          <FontAwesomeIcon icon={faRotate} className="detail-icon" />
          <span className="grow">{describeSchedule(payment.schedule)}</span>
          <span className="muted">{fmt(payment.priceCents)}</span>
        </div>
        <div className="detail-row">
          <FontAwesomeIcon icon={faCalendarDay} className="detail-icon" />
          <span className="grow">
            {formatDate(payment.startDate, { year: "numeric" })} &ndash;{" "}
            {payment.endDate ? formatDate(payment.endDate, { year: "numeric" }) : "no end"}
          </span>
        </div>
        <div className="detail-row">
          <FontAwesomeIcon icon={faArrowTrendDown} className="detail-icon" />
          <span className="grow">Next charge</span>
          <span className="muted">{next ? formatDate(next) : "None, schedule ended"}</span>
        </div>
      </section>

      <h2 className="section-title">Activity</h2>
      {entries.length === 0 ? (
        <p className="muted center pad">No charges yet. The first one is {next ? formatDate(next) : "not scheduled"}.</p>
      ) : (
        <ul className="ledger card">
          {entries.slice(0, shown).map((e) => (
            <li key={e.key} className="ledger-row">
              <span className={`ledger-icon ${e.kind}`} aria-hidden>
                <FontAwesomeIcon icon={e.kind === "charge" ? faArrowTrendDown : faCoins} />
              </span>
              <span className="grow min0">
                <span className="ledger-title">{e.kind === "charge" ? "Charge" : "Payment"}</span>
                <span className="ledger-sub truncate">
                  {formatDate(e.date)}
                  {e.kind === "payment" && e.tx.note ? ` · ${e.tx.note}` : ""}
                </span>
              </span>
              <span className="ledger-amounts">
                <span className={e.kind === "charge" ? "text-debt" : "text-credit"}>
                  {e.kind === "charge" ? "-" : "+"}
                  {fmt(Math.abs(e.amountCents))}
                </span>
                <span className="ledger-running">bal {fmt(e.running)}</span>
              </span>
              {e.kind === "payment" && (
                <button className="icon-btn icon-btn-sm" aria-label="Delete payment record" onClick={() => setToDelete(e.tx)}>
                  <FontAwesomeIcon icon={faTrashCan} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {entries.length > shown && (
        <button className="btn btn-secondary btn-block" onClick={() => setShown((s) => s + PAGE)}>
          Show more
        </button>
      )}

      {paying && (
        <PaySheet uid={user!.uid} payment={payment} balanceCents={balance.balanceCents} onClose={() => setPaying(false)} />
      )}
      {toDelete && (
        <ConfirmSheet
          title="Delete this payment record?"
          message={`${fmt(toDelete.amountCents)} on ${formatDate(toDelete.date)} will be removed and the balance recalculated.`}
          confirmLabel={deleting ? "Deleting..." : "Delete"}
          busy={deleting}
          onConfirm={confirmDelete}
          onClose={() => setToDelete(null)}
        />
      )}
    </>
  );
}

export default function PaymentDetailPage() {
  return (
    <RequireAuth>
      <PaymentDetail />
    </RequireAuth>
  );
}
