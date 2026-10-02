"use client";

import { faCircleNotch, faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { centsToInput, parseMoney } from "@/lib/money";
import { describeSchedule, todayISO } from "@/lib/schedule";
import { CURRENCIES, type Currency, type IntervalType, type Payment, type PaymentInput } from "@/lib/types";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const INTERVALS: { type: IntervalType; label: string; unit: string }[] = [
  { type: "daily", label: "Daily", unit: "day" },
  { type: "weekly", label: "Weekly", unit: "week" },
  { type: "monthly", label: "Monthly", unit: "month" },
];

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="icon-btn" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
        <FontAwesomeIcon icon={faMinus} />
      </button>
      <span className="stepper-value" aria-live="polite">{value}</span>
      <button type="button" className="icon-btn" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
        <FontAwesomeIcon icon={faPlus} />
      </button>
    </div>
  );
}

export function PaymentForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Payment;
  submitLabel: string;
  onSubmit: (input: PaymentInput) => Promise<void>;
}) {
  const today = todayISO();
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial ? centsToInput(initial.priceCents) : "");
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "ILS");
  const [type, setType] = useState<IntervalType>(initial?.schedule.type ?? "weekly");
  const [every, setEvery] = useState(initial?.schedule.every ?? 1);
  const [weekdays, setWeekdays] = useState<number[]>(
    initial?.schedule.weekdays ?? [new Date().getDay()],
  );
  const [dayOfMonth, setDayOfMonth] = useState(initial?.schedule.dayOfMonth ?? new Date().getDate());
  const [startDate, setStartDate] = useState(initial?.startDate ?? today);
  const [noEnd, setNoEnd] = useState(initial ? initial.endDate === null : true);
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [multiN, setMultiN] = useState(initial?.multiN ?? 4);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const unit = INTERVALS.find((i) => i.type === type)!.unit;
  const schedule = { type, every, weekdays, dayOfMonth };

  function toggleDay(d: number) {
    setWeekdays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = parseMoney(price);
    if (!name.trim()) return setError("Give the payment a name.");
    if (priceCents === null || priceCents <= 0) return setError("Enter a valid price greater than 0.");
    if (!startDate) return setError("Pick a start date.");
    if (type === "weekly" && weekdays.length === 0) return setError("Pick at least one day of the week.");
    if (!noEnd && !endDate) return setError("Pick an end date, or choose \"No end\".");
    if (!noEnd && endDate < startDate) return setError("End date must be on or after the start date.");

    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        priceCents,
        currency,
        startDate,
        endDate: noEnd ? null : endDate,
        schedule,
        multiN,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span className="field-label">Name</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rent, Gym, rc" maxLength={60} autoFocus={!initial} />
      </label>

      <div className="field">
        <span className="field-label" id="price-label">Price per charge</span>
        <div className="price-row">
          <input
            className="input input-money"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            aria-labelledby="price-label"
          />
          <div className="segmented" role="radiogroup" aria-label="Currency">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                role="radio"
                aria-checked={currency === c.code}
                className={currency === c.code ? "active" : ""}
                onClick={() => setCurrency(c.code)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card form-card">
        <div className="field">
          <span className="field-label">Repeats</span>
          <div className="segmented full" role="radiogroup" aria-label="Interval">
            {INTERVALS.map((i) => (
              <button key={i.type} type="button" role="radio" aria-checked={type === i.type} className={type === i.type ? "active" : ""} onClick={() => setType(i.type)}>
                {i.label}
              </button>
            ))}
          </div>
        </div>

        <div className="field row between">
          <span className="field-label">
            Every {every} {unit}
            {every > 1 ? "s" : ""}
          </span>
          <Stepper value={every} onChange={setEvery} label="interval" max={52} />
        </div>

        {type === "weekly" && (
          <div className="field">
            <span className="field-label">On</span>
            <div className="weekdays">
              {WEEKDAYS.map((label, d) => (
                <button
                  key={d}
                  type="button"
                  className={`day ${weekdays.includes(d) ? "active" : ""}`}
                  aria-pressed={weekdays.includes(d)}
                  aria-label={WEEKDAY_NAMES[d]}
                  onClick={() => toggleDay(d)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {type === "monthly" && (
          <label className="field row between">
            <span className="field-label">Day of month</span>
            <select className="input input-small" value={dayOfMonth} onChange={(e) => setDayOfMonth(Number(e.target.value))}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        )}

        <p className="hint">{describeSchedule(schedule)}</p>
      </div>

      <div className="row gap">
        <label className="field grow">
          <span className="field-label">Starts</span>
          <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <div className="field grow">
          <span className="field-label">Ends</span>
          {noEnd ? (
            <button type="button" className="input input-button" onClick={() => { setNoEnd(false); setEndDate(endDate || startDate); }}>
              No end
            </button>
          ) : (
            <input className="input" type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} aria-label="End date" />
          )}
        </div>
      </div>
      <label className="switch-row">
        <input type="checkbox" checked={noEnd} onChange={(e) => setNoEnd(e.target.checked)} />
        <span className="switch" aria-hidden />
        <span>No end date</span>
      </label>

      <div className="field row between">
        <span>
          <span className="field-label">Quick multi-pay</span>
          <span className="hint block">Default count for the &ldquo;Pay N&times;&rdquo; button</span>
        </span>
        <Stepper value={multiN} onChange={setMultiN} min={2} label="multi-pay count" />
      </div>

      {error && <p className="error" role="alert">{error}</p>}

      <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
        {saving && <FontAwesomeIcon icon={faCircleNotch} spin />}
        {submitLabel}
      </button>
    </form>
  );
}
