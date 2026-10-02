"use client";

import { faCircleCheck, faTriangleExclamation, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

interface ToastOptions {
  message: string;
  tone?: "success" | "error";
  action?: { label: string; onClick: () => void };
}

interface ToastState extends ToastOptions {
  id: number;
}

const ToastContext = createContext<(t: ToastOptions) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);

  const show = useCallback((t: ToastOptions) => setToast({ ...t, id: ++nextId.current }), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.tone === "error" ? 7000 : 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div key={toast.id} className={`toast toast-${toast.tone ?? "success"}`}>
            <FontAwesomeIcon icon={toast.tone === "error" ? faTriangleExclamation : faCircleCheck} className="toast-icon" />
            <span className="grow">{toast.message}</span>
            {toast.action && (
              <button
                className="toast-action"
                onClick={() => {
                  toast.action!.onClick();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
            <button className="toast-close" aria-label="Dismiss" onClick={() => setToast(null)}>
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
