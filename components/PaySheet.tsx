"use client";

import { faCircleNotch, faCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { addTransaction } from "@/lib/data";
import { formatMoney, parseMoney } from "@/lib/money";
import { todayISO } from "@/lib/schedule";
import type { Payment } from "@/lib/types";
import { Stepper } from "./PaymentForm";
import { Sheet } from "./Sheet";

type Mode = "one" | "multi" | "settle" | "custom";

export function PaySheet({
  uid,
  payment,
  balanceCents,
  onClose,
}: {
  uid: string;
  payment: Payment;
  balanceCents: number;
  onClose: () => void;
}) {
  const debt = balanceCents < 0 ? -balanceCents : 0;
  const [mode, setMode] = useState<Mode>(debt > 0 && debt !== payment.priceCents ? "settle" : "one");
  const [n, setN] = useState(Math.max(2, payment.multiN));
  const [custom, setCustom] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fmt = (c: number) => formatMoney(c, payment.currency);
  const amountCents =
    mode === "one" ? payment.priceCents
    : mode === "multi" ? payment.priceCents * n
    : mode === "settle" ? debt
    : parseMoney(custom);

  const valid = amountCents !== null && amountCents > 0 && !!date;
  const after = valid ? balanceCents + amountCents : balanceCents;

  async function submit() {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await addTransaction(uid, { paymentId: payment.id, amountCents: amountCents!, note: note.trim(), date });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the payment.");
      setSaving(false);
    }
  }

  const option = (m: Mode, title: string, amount: React.ReactNode, extra?: React.ReactNode) => (
    <div
      className={`pay-option ${mode === m ? "active" : ""}`}
      role="radio"
      aria-checked={mode === m}
      tabIndex={0}
      onClick={() => setMode(m)}
      onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), setMode(m))}
    >
      <span className="radio" aria-hidden>{mode === m && <FontAwesomeIcon icon={faCheck} />}</span>
      <span className="grow">
        <span className="pay-option-title">{title}</span>
        {extra}
      </span>
      <span className="pay-option-amount">{amount}</span>
    </div>
  );

  return (
    <Sheet title={`Pay ${payment.name}`} onClose={onClose}>
      <div className="pay-options" role="radiogroup" aria-label="Payment amount">
        {option("one", "One payment", fmt(payment.priceCents))}
        {option(
          "multi",
          `${n} payments`,
          fmt(payment.priceCents * n),
          <span onClick={(e) => { e.stopPropagation(); setMode("multi"); }} className="pay-option-extra">
            <Stepper value={n} onChange={setN} min={2} label="number of payments" />
          </span>,
        )}
        {debt > 0 && option("settle", "Pay off balance", fmt(debt))}
        {option(
          "custom",
          "Custom amount",
          mode === "custom" ? null : <span className="muted">Any</span>,
          mode === "custom" && (
            <input
              className="input pay-custom"
              inputMode="decimal"
              placeholder="0"
              autoFocus
              value={custom}
              aria-label="Custom amount"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onChange={(e) => setCustom(e.target.value)}
            />
          ),
        )}
      </div>

      <div className="row gap">
        <label className="field grow">
          <span className="field-label">Note (optional)</span>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Bank transfer" maxLength={120} />
        </label>
        <label className="field">
          <span className="field-label">Date</span>
          <input className="input" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </label>
      </div>

      <p className="pay-preview">
        Balance after:{" "}
        <strong className={after < 0 ? "text-debt" : after > 0 ? "text-credit" : ""}>
          {after === 0 ? "Settled" : `${fmt(Math.abs(after))} ${after < 0 ? "owed" : "credit"}`}
        </strong>
      </p>

      {error && <p className="error" role="alert">{error}</p>}

      <button className="btn btn-primary btn-block" disabled={!valid || saving} onClick={submit}>
        {saving && <FontAwesomeIcon icon={faCircleNotch} spin />}
        {valid ? `Record ${fmt(amountCents!)}` : "Enter an amount"}
      </button>
    </Sheet>
  );
}
