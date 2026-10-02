import { describe, expect, it } from "vitest";
import {
  chargeDates,
  computeBalance,
  describeSchedule,
  nextChargeDate,
  todayISO,
} from "./schedule";
import type { Payment, Schedule, Transaction } from "./types";

const weekly = (weekdays: number[], every = 1): Schedule => ({
  type: "weekly",
  every,
  weekdays,
  dayOfMonth: 1,
});

function payment(over: Partial<Payment> = {}): Payment {
  return {
    id: "p1",
    name: "rc",
    priceCents: 10000,
    currency: "ILS",
    startDate: "2026-09-27",
    endDate: null,
    schedule: weekly([5, 6]),
    multiN: 4,
    createdAt: 0,
    ...over,
  };
}

describe("chargeDates", () => {
  it("weekly Fri+Sat started last week -> 2 charges by Friday Oct 2 (Sat 26 is before start)", () => {
    // 2026-09-27 is a Sunday. Fri Oct 2 is today.
    expect(chargeDates(payment(), "2026-10-02")).toEqual(["2026-10-02"]);
    expect(chargeDates(payment({ startDate: "2026-09-25" }), "2026-10-02")).toEqual([
      "2026-09-25",
      "2026-09-26",
      "2026-10-02",
    ]);
  });

  it("charges on the start date itself and today", () => {
    const p = payment({ startDate: "2026-10-01", schedule: { type: "daily", every: 1, weekdays: [], dayOfMonth: 1 } });
    expect(chargeDates(p, "2026-10-02")).toEqual(["2026-10-01", "2026-10-02"]);
  });

  it("returns nothing when start is in the future", () => {
    expect(chargeDates(payment({ startDate: "2026-11-01" }), "2026-10-02")).toEqual([]);
  });

  it("daily every 2 days", () => {
    const p = payment({ startDate: "2026-01-01", schedule: { type: "daily", every: 2, weekdays: [], dayOfMonth: 1 } });
    expect(chargeDates(p, "2026-01-07")).toEqual(["2026-01-01", "2026-01-03", "2026-01-05", "2026-01-07"]);
  });

  it("biweekly respects week parity", () => {
    // 2026-01-04 is a Sunday.
    const p = payment({ startDate: "2026-01-04", schedule: weekly([1], 2) });
    expect(chargeDates(p, "2026-02-01")).toEqual(["2026-01-05", "2026-01-19"]);
  });

  it("biweekly starting late in a week charges on the first eligible day", () => {
    // Sat 2026-10-10 start, Sun+Wed every 2 weeks -> Oct 11, 14, then Oct 25, 28.
    const p = payment({ startDate: "2026-10-10", schedule: weekly([0, 3], 2) });
    expect(chargeDates(p, "2026-10-31")).toEqual(["2026-10-11", "2026-10-14", "2026-10-25", "2026-10-28"]);
    expect(nextChargeDate(p, "2026-10-02")).toBe("2026-10-11");
  });

  it("monthly clamps day 31 to month end", () => {
    const p = payment({ startDate: "2026-01-31", schedule: { type: "monthly", every: 1, weekdays: [], dayOfMonth: 31 } });
    expect(chargeDates(p, "2026-04-30")).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("monthly day before start day waits for next month", () => {
    const p = payment({ startDate: "2026-01-15", schedule: { type: "monthly", every: 1, weekdays: [], dayOfMonth: 1 } });
    expect(chargeDates(p, "2026-03-01")).toEqual(["2026-02-01", "2026-03-01"]);
  });

  it("monthly every N anchors on the first reachable month", () => {
    // Start Jun 20, every 2 months on the 15th -> Jul 15 is the first charge.
    const p = payment({ startDate: "2026-06-20", schedule: { type: "monthly", every: 2, weekdays: [], dayOfMonth: 15 } });
    expect(chargeDates(p, "2026-11-30")).toEqual(["2026-07-15", "2026-09-15", "2026-11-15"]);
  });

  it("stops at the end date", () => {
    const p = payment({ startDate: "2026-09-01", endDate: "2026-09-12", schedule: weekly([5, 6]) });
    expect(chargeDates(p, "2026-10-02")).toEqual(["2026-09-04", "2026-09-05", "2026-09-11", "2026-09-12"]);
  });
});

describe("nextChargeDate", () => {
  it("finds the next weekly charge after today", () => {
    expect(nextChargeDate(payment(), "2026-10-02")).toBe("2026-10-03");
  });
  it("is the start date when start is in the future", () => {
    expect(nextChargeDate(payment({ startDate: "2026-10-09" }), "2026-10-02")).toBe("2026-10-09");
  });
  it("is null after the end date", () => {
    expect(nextChargeDate(payment({ endDate: "2026-10-02" }), "2026-10-02")).toBeNull();
  });
});

describe("computeBalance", () => {
  const p = payment({ startDate: "2026-09-25" }); // 3 charges by Oct 2
  const tx = (amountCents: number, paymentId = "p1"): Transaction => ({
    id: String(Math.random()),
    paymentId,
    amountCents,
    note: "",
    date: "2026-10-02",
    createdAt: 0,
  });

  it("is negative when in debt", () => {
    expect(computeBalance(p, [], "2026-10-02").balanceCents).toBe(-30000);
  });
  it("can go positive (credit)", () => {
    const b = computeBalance(p, [tx(40000)], "2026-10-02");
    expect(b.balanceCents).toBe(10000);
    expect(b.chargeCount).toBe(3);
  });
  it("ignores other payments' transactions", () => {
    expect(computeBalance(p, [tx(50000, "other")], "2026-10-02").balanceCents).toBe(-30000);
  });
});

describe("describeSchedule / todayISO", () => {
  it("describes schedules", () => {
    expect(describeSchedule(weekly([6, 5]))).toBe("Weekly on Fri, Sat");
    expect(describeSchedule({ type: "monthly", every: 2, weekdays: [], dayOfMonth: 22 })).toBe("Every 2 months on the 22nd");
    expect(describeSchedule({ type: "daily", every: 1, weekdays: [], dayOfMonth: 1 })).toBe("Daily");
  });
  it("uses local date", () => {
    expect(todayISO(new Date(2026, 9, 2, 23, 59))).toBe("2026-10-02");
  });
});
