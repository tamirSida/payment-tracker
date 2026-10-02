import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Payment, PaymentInput, Transaction } from "./types";

// Namespaced root so this app never collides with other apps in the same Firebase project.
const ROOT = "tally_users";
const paymentsCol = (uid: string) => collection(db, ROOT, uid, "payments");
const txCol = (uid: string) => collection(db, ROOT, uid, "transactions");

/**
 * Writes return immediately with the new id. `done` resolves when the server
 * acknowledges, so the UI never hangs while offline (Firestore applies writes
 * locally and syncs later).
 */
export interface PendingWrite {
  id: string;
  done: Promise<void>;
}

export function subscribePayments(
  uid: string,
  onData: (p: Payment[]) => void,
  onError: (e: Error) => void,
) {
  return onSnapshot(
    paymentsCol(uid),
    (snap) =>
      onData(
        snap.docs
          .map((d) => ({ ...(d.data() as Omit<Payment, "id">), id: d.id }))
          .filter(isValidPayment)
          .sort((a, b) => a.createdAt - b.createdAt),
      ),
    onError,
  );
}

export function subscribeTransactions(
  uid: string,
  onData: (t: Transaction[]) => void,
  onError: (e: Error) => void,
) {
  return onSnapshot(
    txCol(uid),
    (snap) =>
      onData(
        snap.docs
          .map((d) => ({ ...(d.data() as Omit<Transaction, "id">), id: d.id }))
          .filter((t) => typeof t.amountCents === "number" && typeof t.date === "string"),
      ),
    onError,
  );
}

/** Guards against malformed documents crashing the UI. */
function isValidPayment(p: Payment): boolean {
  return (
    typeof p.name === "string" &&
    typeof p.priceCents === "number" &&
    typeof p.startDate === "string" &&
    !!p.schedule &&
    Array.isArray(p.schedule.weekdays)
  );
}

export function createPayment(uid: string, input: PaymentInput): PendingWrite {
  const ref = doc(paymentsCol(uid));
  return { id: ref.id, done: setDoc(ref, { ...input, createdAt: Date.now() }) };
}

export function updatePayment(uid: string, id: string, input: PaymentInput): PendingWrite {
  return { id, done: updateDoc(doc(paymentsCol(uid), id), { ...input }) };
}

/** Deletes the payment and every transaction recorded against it. */
export async function deletePayment(uid: string, id: string) {
  const txs = await getDocs(query(txCol(uid), where("paymentId", "==", id)));
  // Firestore batches are capped at 500 operations.
  for (let i = 0; i < txs.docs.length; i += 450) {
    const batch = writeBatch(db);
    txs.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  const batch = writeBatch(db);
  batch.delete(doc(paymentsCol(uid), id));
  await batch.commit();
}

export function addTransaction(
  uid: string,
  tx: Omit<Transaction, "id" | "createdAt">,
): PendingWrite {
  const ref = doc(txCol(uid));
  return { id: ref.id, done: setDoc(ref, { ...tx, createdAt: Date.now() }) };
}

/** Re-creates a transaction with its original id and fields (used by undo). */
export function restoreTransaction(uid: string, tx: Transaction): PendingWrite {
  const { id, ...data } = tx;
  return { id, done: setDoc(doc(txCol(uid), id), data) };
}

export function deleteTransaction(uid: string, id: string): PendingWrite {
  const batch = writeBatch(db);
  batch.delete(doc(txCol(uid), id));
  return { id, done: batch.commit() };
}
