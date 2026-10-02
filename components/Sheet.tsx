"use client";

import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal bottom sheet (centered dialog on wide screens). Traps focus, restores
 * it to the opener on close, and stays above the on-screen keyboard.
 */
export function Sheet({
  title,
  onClose,
  footer,
  children,
}: {
  title: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Mount-only: parent re-renders (e.g. live Firestore updates) must not steal focus.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    // Keep the sheet inside the visible area when the on-screen keyboard opens (iOS).
    const vv = window.visualViewport;
    const fit = () => {
      if (!vv || !backdropRef.current) return;
      backdropRef.current.style.top = `${vv.offsetTop}px`;
      backdropRef.current.style.height = `${vv.height}px`;
    };
    fit();
    vv?.addEventListener("resize", fit);
    vv?.addEventListener("scroll", fit);

    return () => {
      document.removeEventListener("keydown", onKey);
      vv?.removeEventListener("resize", fit);
      vv?.removeEventListener("scroll", fit);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, []);

  return (
    <div className="sheet-backdrop" ref={backdropRef} onClick={() => onCloseRef.current()}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => {
          // Keep a focused field visible above the keyboard.
          if (e.target instanceof HTMLInputElement) {
            setTimeout(() => e.target.scrollIntoView({ block: "nearest" }), 250);
          }
        }}
      >
        <div className="sheet-body">
          <div className="sheet-header">
            <h2>{title}</h2>
            <button className="icon-btn" onClick={() => onCloseRef.current()} aria-label="Close">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
          {children}
        </div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmSheet({
  title,
  message,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        <div className="row gap">
          <button className="btn btn-secondary grow" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-danger grow" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p className="muted sheet-message">{message}</p>
    </Sheet>
  );
}
