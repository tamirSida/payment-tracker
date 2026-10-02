"use client";

import {
  faArrowLeft,
  faCalendarDay,
  faClock,
  faCoins,
  faFileInvoiceDollar,
  faHandHoldingDollar,
  faPen,
  faRotate,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { balanceTone, describeBalance, TONE_LABEL } from "@/components/BalanceBadge";
import { NotFound } from "@/components/NotFound";
import { PaySheet } from "@/components/PaySheet";
import { RequireAuth } from "@/components/RequireAuth";
import { useToast } from "@/components/Toast";
import { useToday } from "@/components/useToday";
import { deleteTransaction, restoreTransaction } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/money";
import { chargeDates, computeBalance, describeSchedule, nextChargeDate } from "@/lib/schedule";
import type { Transaction } from "@/lib/types";

type Entry =
  | { kind: "charge"; key: string; date: string; amountCents: number; running: number }
  | { kind: "payment"; key: string; date: string; amountCents: number; running: number; tx: Transaction };

const PAGE = 30;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function PaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, payments, transactions } = useApp();
  const toast = useToast();
  const [paying, setPaying] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const today = useToday();
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
  const tone = balanceTone(balance);
  const fmt = (c: number) => formatMoney(c, payment.currency);
  const chargesLine = `${plural(balance.chargeCount, "charge")} of ${fmt(payment.priceCents)} · ${fmt(balance.paidCents)} paid`;
  const covers = Math.floor(balance.balanceCents / payment.priceCents);

  const heroAmount = tone === "upcoming" ? fmt(payment.priceCents) : fmt(Math.abs(balance.balanceCents));
  const heroSub =
    tone === "upcoming" ? (next ? `First charge ${formatDate(next)}` : "No charges scheduled")
    : tone === "credit" ? `${covers > 0 ? `Covers the next ${plural(covers, "charge")}` : "Covers part of the next charge"} · ${chargesLine}`
    : chargesLine;

  function removeRecord(tx: Transaction) {
    const uid = user!.uid;
    deleteTransaction(uid, tx.id).done.catch((e: Error) =>
      toast({ tone: "error", message: `Couldn't delete: ${e.message}` }),
    );
    toast({
      message: `Removed ${fmt(tx.amountCents)} payment`,
      action: { label: "Undo", onClick: () => restoreTransaction(uid, tx) },
    });
  }

  return (
    <>
      <header className="topbar">
        <Link href="/" className="icon-btn" aria-label="Back to payments">
          <FontAwesomeIcon icon={faArrowLeft} />
        </Link>
        <h1 className="title-sm truncate">{payment.name}</h1>
        <Link href={`/payments/${payment.id}/edit`} className="icon-btn" aria-label="Edit payment">
          <FontAwesomeIcon icon={faPen} />
        </Link>
      </header>

      <section className={`hero card hero-${tone}`} aria-live="polite">
        <p className="hero-label">{TONE_LABEL[tone]}</p>
        <p className="hero-amount" key={balance.balanceCents}>
          {heroAmount}
        </p>
        <p className="hero-sub">{heroSub}</p>
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
            {formatDate(payment.startDate, { weekday: undefined, year: "numeric" })} &ndash;{" "}
            {payment.endDate ? formatDate(payment.endDate, { weekday: undefined, year: "numeric" }) : "no end"}
          </span>
        </div>
        <div className="detail-row">
          <FontAwesomeIcon icon={faClock} className="detail-icon" />
          <span className="grow">Next charge</span>
          <span className="muted">{next ? formatDate(next) : "None, schedule ended"}</span>
        </div>
      </section>

      <h2 className="section-title">Activity</h2>
      {entries.length === 0 ? (
        <p className="muted center pad">No activity yet.{next ? ` The first charge is ${formatDate(next)}.` : ""}</p>
      ) : (
        <ul className="ledger card">
          {entries.slice(0, shown).map((e) => (
            <li key={e.key} className="ledger-row">
              <span className={`ledger-icon ${e.kind}`} aria-hidden>
                <FontAwesomeIcon icon={e.kind === "charge" ? faFileInvoiceDollar : faHandHoldingDollar} />
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
                  {e.kind === "charge" ? "−" : "+"}
                  {fmt(Math.abs(e.amountCents))}
                </span>
                <span className="ledger-running">{describeBalance(e.running, payment.currency)}</span>
              </span>
              {e.kind === "payment" ? (
                <button className="icon-btn icon-btn-ghost" aria-label={`Delete ${fmt(e.amountCents)} payment from ${formatDate(e.date)}`} onClick={() => removeRecord(e.tx)}>
                  <FontAwesomeIcon icon={faTrashCan} />
                </button>
              ) : (
                <span className="icon-btn-spacer" aria-hidden />
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
