"use client";

import { faCircleNotch, faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useRef, useState } from "react";
import { centsToInput, currencySymbol, parseMoney } from "@/lib/money";
import { describeSchedule, todayISO } from "@/lib/schedule";
import { CURRENCIES, type Currency, type IntervalType, type Payment, type PaymentInput } from "@/lib/types";
import { Segmented } from "./Segmented";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const INTERVALS: { value: IntervalType; label: string; unit: string }[] = [
  { value: "daily", label: "Daily", unit: "day" },
  { value: "weekly", label: "Weekly", unit: "week" },
  { value: "monthly", label: "Monthly", unit: "month" },
];

type Field = "name" | "price" | "weekdays" | "startDate" | "endDate";

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

function dayOf(iso: string) {
  return Number(iso.split("-")[2]) || 1;
}

export function PaymentForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Payment;
  submitLabel: string;
  onSubmit: (input: PaymentInput) => Promise<void> | void;
}) {
  const today = todayISO();
  const [name, setName] = useState(initial?.name ?? "");
  const [price, setPrice] = useState(initial ? centsToInput(initial.priceCents) : "");
  const [currency, setCurrency] = useState<Currency>(initial?.currency ?? "ILS");
  const [type, setType] = useState<IntervalType>(initial?.schedule.type ?? "weekly");
  const [every, setEvery] = useState(initial?.schedule.every ?? 1);
  const [weekdays, setWeekdays] = useState<number[]>(initial?.schedule.weekdays ?? [new Date().getDay()]);
  const [dayOfMonth, setDayOfMonth] = useState(initial?.schedule.dayOfMonth ?? dayOf(today));
  // Day of month follows the start date until the user picks one explicitly.
  const [dayTouched, setDayTouched] = useState(!!initial);
  const [startDate, setStartDate] = useState(initial?.startDate ?? today);
  const [hasEnd, setHasEnd] = useState(!!initial?.endDate);
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [multiN, setMultiN] = useState(initial?.multiN ?? 4);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const refs = useRef<Partial<Record<Field, HTMLElement | null>>>({});

  const unit = INTERVALS.find((i) => i.value === type)!.unit;
  const schedule = { type, every, weekdays, dayOfMonth };
  const priceCents = parseMoney(price);
  const priceChanged = !!initial && priceCents !== null && priceCents !== initial.priceCents;

  function toggleDay(d: number) {
    setWeekdays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));
    setErrors((e) => ({ ...e, weekdays: undefined }));
  }

  function validate(): Partial<Record<Field, string>> {
    const e: Partial<Record<Field, string>> = {};
    if (!name.trim()) e.name = "Give the payment a name.";
    if (priceCents === null || priceCents <= 0) e.price = "Enter a price greater than 0, like 120 or 49.90.";
    if (type === "weekly" && weekdays.length === 0) e.weekdays = "Pick at least one day.";
    if (!startDate) e.startDate = "Pick a start date.";
    if (hasEnd && !endDate) e.endDate = "Pick an end date.";
    else if (hasEnd && endDate < startDate) e.endDate = "End date must be on or after the start date.";
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    const first = (["name", "price", "weekdays", "startDate", "endDate"] as Field[]).find((f) => e[f]);
    if (first) {
      refs.current[first]?.focus();
      refs.current[first]?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }

    setFormError(null);
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        priceCents: priceCents!,
        currency,
        startDate,
        endDate: hasEnd ? endDate : null,
        schedule,
        multiN,
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  const fieldError = (f: Field) =>
    errors[f] ? (
      <span className="field-error" id={`${f}-error`}>
        {errors[f]}
      </span>
    ) : null;
  const invalidProps = (f: Field) => ({
    "aria-invalid": !!errors[f] || undefined,
    "aria-describedby": errors[f] ? `${f}-error` : undefined,
  });

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span className="field-label">Name</span>
        <input
          ref={(el) => {
            refs.current.name = el;
          }}
          className="input"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((x) => ({ ...x, name: undefined }));
          }}
          placeholder="e.g. Rent, Gym, Phone plan"
          maxLength={60}
          autoFocus={!initial}
          {...invalidProps("name")}
        />
        {fieldError("name")}
      </label>

      <div className="field">
        <label className="field-label" htmlFor="price">
          Price per charge
        </label>
        <div className="price-row">
          <div className="money-input grow">
            <span className="money-prefix" aria-hidden>
              {currencySymbol(currency)}
            </span>
            <input
              id="price"
              ref={(el) => {
                refs.current.price = el;
              }}
              className="input input-money"
              inputMode="decimal"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setErrors((x) => ({ ...x, price: undefined }));
              }}
              placeholder="0"
              {...invalidProps("price")}
            />
          </div>
          <Segmented
            label="Currency"
            value={currency}
            onChange={setCurrency}
            options={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
          />
        </div>
        {fieldError("price")}
        {priceChanged && <span className="hint">Changing the price re-prices all past charges too.</span>}
      </div>

      <div className="card form-card">
        <div className="field">
          <span className="field-label">Repeats</span>
          <Segmented full label="Interval" value={type} onChange={setType} options={INTERVALS} />
        </div>

        <div className="field row between">
          <span className="field-label">{every === 1 ? `Every ${unit}` : `Every ${every} ${unit}s`}</span>
          <Stepper value={every} onChange={setEvery} label="interval" max={52} />
        </div>

        {type === "weekly" && (
          <div className="field">
            <span className="field-label" id="weekdays-label">
              On
            </span>
            <div className="weekdays" role="group" aria-labelledby="weekdays-label" {...invalidProps("weekdays")}>
              {WEEKDAYS.map((label, d) => (
                <button
                  key={d}
                  ref={
                    d === 0
                      ? (el) => {
                          refs.current.weekdays = el;
                        }
                      : undefined
                  }
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
            {fieldError("weekdays")}
          </div>
        )}

        {type === "monthly" && (
          <label className="field row between">
            <span className="field-label">Day of month</span>
            <select
              className="input input-small"
              value={dayOfMonth}
              onChange={(e) => {
                setDayOfMonth(Number(e.target.value));
                setDayTouched(true);
              }}
            >
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

      <label className="field">
        <span className="field-label">Starts</span>
        <input
          ref={(el) => {
            refs.current.startDate = el;
          }}
          className="input"
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            if (!dayTouched && e.target.value) setDayOfMonth(dayOf(e.target.value));
          }}
          {...invalidProps("startDate")}
        />
        {fieldError("startDate")}
      </label>

      <div className="field">
        <label className="switch-row">
          <input
            type="checkbox"
            role="switch"
            checked={hasEnd}
            onChange={(e) => {
              setHasEnd(e.target.checked);
              if (e.target.checked && !endDate) setEndDate(startDate);
              setErrors((x) => ({ ...x, endDate: undefined }));
            }}
          />
          <span className="switch" aria-hidden />
          <span>Has an end date</span>
        </label>
        {hasEnd ? (
          <>
            <input
              ref={(el) => {
                refs.current.endDate = el;
              }}
              className="input"
              type="date"
              value={endDate}
              min={startDate}
              aria-label="End date"
              onChange={(e) => {
                setEndDate(e.target.value);
                setErrors((x) => ({ ...x, endDate: undefined }));
              }}
              {...invalidProps("endDate")}
            />
            {fieldError("endDate")}
          </>
        ) : (
          <span className="hint">Repeats with no end.</span>
        )}
      </div>

      <div className="field row between">
        <span>
          <span className="field-label">Quick multi-pay</span>
          <span className="hint block">Default count for paying several charges at once</span>
        </span>
        <Stepper value={multiN} onChange={setMultiN} min={2} label="multi-pay count" />
      </div>

      {formError && (
        <p className="error" role="alert">
          {formError}
        </p>
      )}

      <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
        {saving && <FontAwesomeIcon icon={faCircleNotch} spin />}
        {submitLabel}
      </button>
    </form>
  );
}
