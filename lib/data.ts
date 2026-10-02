import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Payment, PaymentInput, Transaction } from "./types";

const paymentsCol = (uid: string) => collection(db, "users", uid, "payments");
const txCol = (uid: string) => collection(db, "users", uid, "transactions");

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
      onData(snap.docs.map((d) => ({ ...(d.data() as Omit<Transaction, "id">), id: d.id }))),
    onError,
  );
}

export async function createPayment(uid: string, input: PaymentInput): Promise<string> {
  const ref = await addDoc(paymentsCol(uid), { ...input, createdAt: Date.now() });
  return ref.id;
}

export async function updatePayment(uid: string, id: string, input: PaymentInput) {
  await updateDoc(doc(paymentsCol(uid), id), { ...input });
}

/** Deletes the payment and every transaction recorded against it. */
export async function deletePayment(uid: string, id: string) {
  const txs = await getDocs(query(txCol(uid), where("paymentId", "==", id)));
  const batch = writeBatch(db);
  txs.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(paymentsCol(uid), id));
  await batch.commit();
}

export async function addTransaction(
  uid: string,
  tx: Omit<Transaction, "id" | "createdAt">,
) {
  await addDoc(txCol(uid), { ...tx, createdAt: Date.now() });
}

export async function deleteTransaction(uid: string, id: string) {
  await deleteDoc(doc(txCol(uid), id));
}
