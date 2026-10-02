export type Currency = "USD" | "EUR" | "ILS";

export const CURRENCIES: { code: Currency; label: string }[] = [
  { code: "USD", label: "USD" },
  { code: "EUR", label: "EUR" },
  { code: "ILS", label: "NIS" },
];

export type IntervalType = "daily" | "weekly" | "monthly";

export interface Schedule {
  type: IntervalType;
  /** Repeat every N days / weeks / months. */
  every: number;
  /** Weekly only: days of week, 0 = Sunday ... 6 = Saturday. */
  weekdays: number[];
  /** Monthly only: 1-31, clamped to the month's last day. */
  dayOfMonth: number;
}

export interface Payment {
  id: string;
  name: string;
  priceCents: number;
  currency: Currency;
  /** YYYY-MM-DD, local calendar date. */
  startDate: string;
  /** YYYY-MM-DD or null for "no end". */
  endDate: string | null;
  schedule: Schedule;
  /** Default count for the "pay N x" quick action. */
  multiN: number;
  createdAt: number;
}

export interface Transaction {
  id: string;
  paymentId: string;
  amountCents: number;
  note: string;
  /** YYYY-MM-DD */
  date: string;
  createdAt: number;
}

export type PaymentInput = Omit<Payment, "id" | "createdAt">;
