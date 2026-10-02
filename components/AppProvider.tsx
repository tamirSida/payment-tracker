"use client";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { subscribePayments, subscribeTransactions } from "@/lib/data";
import { auth } from "@/lib/firebase";
import type { Payment, Transaction } from "@/lib/types";

interface AppState {
  user: User | null;
  authLoading: boolean;
  payments: Payment[];
  transactions: Transaction[];
  dataLoading: boolean;
  dataError: string | null;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u);
        setAuthLoading(false);
      }),
    [],
  );

  useEffect(() => {
    setPayments(null);
    setTransactions(null);
    setDataError(null);
    if (!user) return;
    const onError = (e: Error) => setDataError(e.message);
    const unsubP = subscribePayments(user.uid, setPayments, onError);
    const unsubT = subscribeTransactions(user.uid, setTransactions, onError);
    return () => {
      unsubP();
      unsubT();
    };
  }, [user]);

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        payments: payments ?? [],
        transactions: transactions ?? [],
        dataLoading: !!user && (payments === null || transactions === null) && !dataError,
        dataError,
        signOut: () => signOut(auth),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
