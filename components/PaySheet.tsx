"use client";

import { faCheck, faPen } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useRef, useState } from "react";
import { addTransaction, deleteTransaction } from "@/lib/data";
import { currencySymbol, formatDate, formatMoney, parseMoney } from "@/lib/money";
import { todayISO } from "@/lib/schedule";
import type { Payment } from "@/lib/types";
import { describeBalance } from "./BalanceBadge";
import { Stepper } from "./PaymentForm";
import { Sheet } from "./Sheet";
import { useToast } from "./Toast";

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
  const toast = useToast();
  const today = todayISO();
  const debt = balanceCents < 0 ? -balanceCents : 0;
  const [chosen, setMode] = useState<Mode>(debt > 0 && debt !== payment.priceCents ? "settle" : "one");
  // If the debt disappears while the sheet is open (live update), fall back to one payment.
  const mode: Mode = chosen === "settle" && debt === 0 ? "one" : chosen;
  const [n, setN] = useState(Math.max(2, payment.multiN));
  const [custom, setCustom] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today);
  const [showDetails, setShowDetails] = useState(false);
  const radioRefs = useRef<Partial<Record<Mode, HTMLDivElement | null>>>({});

  const fmt = (c: number) => formatMoney(c, payment.currency);
  const amountCents =
    mode === "one" ? payment.priceCents
    : mode === "multi" ? payment.priceCents * n
    : mode === "settle" ? debt
    : parseMoney(custom);

  const validAmount = amountCents !== null && amountCents > 0;
  const validDate = !!date && date <= today;
  const valid = validAmount && validDate;
  const after = validAmount ? balanceCents + amountCents : balanceCents;
  const modes: Mode[] = debt > 0 ? ["one", "multi", "settle", "custom"] : ["one", "multi", "custom"];

  function submit() {
    if (!valid) return;
    const amount = amountCents!;
    const write = addTransaction(uid, { paymentId: payment.id, amountCents: amount, note: note.trim(), date });
    // Close immediately: Firestore applies the write locally (works offline) and syncs in the background.
    onClose();
    toast({
      message: `Recorded ${fmt(amount)} for ${payment.name}`,
      action: { label: "Undo", onClick: () => deleteTransaction(uid, write.id) },
    });
    write.done.catch((e: Error) =>
      toast({ tone: "error", message: `Couldn't save the payment: ${e.message}` }),
    );
  }

  function onRadioKey(e: React.KeyboardEvent, m: Mode) {
    if (e.target !== e.currentTarget) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      setMode(m);
      return;
    }
    const delta = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = modes[(modes.indexOf(m) + delta + modes.length) % modes.length];
    setMode(next);
    radioRefs.current[next]?.focus();
  }

  const option = (m: Mode, title: string, amount: React.ReactNode, extra?: React.ReactNode) => (
    <div className={`pay-option ${mode === m ? "active" : ""}`} onClick={() => setMode(m)}>
      <div
        ref={(el) => {
          radioRefs.current[m] = el;
        }}
        className="pay-option-main"
        role="radio"
        aria-checked={mode === m}
        tabIndex={mode === m ? 0 : -1}
        onKeyDown={(e) => onRadioKey(e, m)}
      >
        <span className="radio" aria-hidden>
          {mode === m && <FontAwesomeIcon icon={faCheck} />}
        </span>
        <span className="pay-option-title grow">{title}</span>
        <span className="pay-option-amount">{amount}</span>
      </div>
      {extra && <div className="pay-option-extra">{extra}</div>}
    </div>
  );

  return (
    <Sheet
      title={`Pay ${payment.name}`}
      onClose={onClose}
      footer={
        <>
          <p className="pay-preview">
            Balance after:{" "}
            <strong className={after < 0 ? "text-debt" : after > 0 ? "text-credit" : ""}>
              {describeBalance(after, payment.currency)}
            </strong>
          </p>
          <button className="btn btn-primary btn-block" disabled={!valid} onClick={submit}>
            {!validAmount ? "Enter an amount" : !validDate ? "Pick a date up to today" : `Record ${fmt(amountCents!)}`}
          </button>
        </>
      }
    >
      <div className="pay-options" role="radiogroup" aria-label="How much to pay">
        {option("one", "One charge", fmt(payment.priceCents))}
        {option(
          "multi",
          `${n} charges`,
          fmt(payment.priceCents * n),
          mode === "multi" && (
            <div className="row between">
              <span className="muted">
                {n} &times; {fmt(payment.priceCents)}
              </span>
              <Stepper value={n} onChange={setN} min={2} label="number of charges" />
            </div>
          ),
        )}
        {debt > 0 && option("settle", "Full balance", fmt(debt))}
        {option(
          "custom",
          "Custom amount",
          mode === "custom" && validAmount ? fmt(amountCents!) : "",
          mode === "custom" && (
            <div className="money-input">
              <span className="money-prefix" aria-hidden>
                {currencySymbol(payment.currency)}
              </span>
              <input
                className="input input-money"
                inputMode="decimal"
                placeholder="Enter amount"
                autoFocus
                value={custom}
                aria-label="Custom amount"
                onChange={(e) => setCustom(e.target.value)}
              />
            </div>
          ),
        )}
      </div>

      {showDetails || mode === "custom" || note || date !== today ? (
        <div className="pay-details">
          <label className="field">
            <span className="field-label">Note (optional)</span>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Bank transfer" maxLength={120} />
          </label>
          <label className="field">
            <span className="field-label">Date paid</span>
            <input className="input" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
      ) : (
        <button type="button" className="link-btn" onClick={() => setShowDetails(true)}>
          <FontAwesomeIcon icon={faPen} /> Add a note or change date
          <span className="muted"> &middot; {formatDate(today)}</span>
        </button>
      )}
    </Sheet>
  );
}
