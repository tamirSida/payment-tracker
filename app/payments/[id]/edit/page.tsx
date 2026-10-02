"use client";

import { faArrowLeft, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { PaymentForm } from "@/components/PaymentForm";
import { RequireAuth } from "@/components/RequireAuth";
import { ConfirmSheet } from "@/components/Sheet";
import { deletePayment, updatePayment } from "@/lib/data";
import { NotFound } from "@/components/NotFound";

function EditPayment() {
  const { id } = useParams<{ id: string }>();
  const { user, payments } = useApp();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const payment = payments.find((p) => p.id === id);

  if (!payment) return deleting ? null : <NotFound />;

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deletePayment(user!.uid, id);
      router.replace("/");
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Could not delete.");
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <Link href={`/payments/${id}`} className="icon-btn" aria-label="Back">
          <FontAwesomeIcon icon={faArrowLeft} />
        </Link>
        <h1 className="title-sm">Edit payment</h1>
        <span className="icon-btn-spacer" />
      </header>

      <PaymentForm
        initial={payment}
        submitLabel="Save changes"
        onSubmit={async (input) => {
          await updatePayment(user!.uid, id, input);
          router.replace(`/payments/${id}`);
        }}
      />

      <div className="danger-zone">
        {deleteError && <p className="error" role="alert">{deleteError}</p>}
        <button className="btn btn-ghost-danger btn-block" onClick={() => setConfirming(true)}>
          <FontAwesomeIcon icon={faTrashCan} /> Delete payment
        </button>
      </div>

      {confirming && (
        <ConfirmSheet
          title={`Delete ${payment.name}?`}
          message="This removes the payment and its entire payment history. This can't be undone."
          confirmLabel={deleting ? "Deleting..." : "Delete"}
          busy={deleting}
          onConfirm={handleDelete}
          onClose={() => setConfirming(false)}
        />
      )}
    </>
  );
}

export default function EditPaymentPage() {
  return (
    <RequireAuth>
      <EditPayment />
    </RequireAuth>
  );
}
