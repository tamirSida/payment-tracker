"use client";

import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { PaymentForm } from "@/components/PaymentForm";
import { RequireAuth } from "@/components/RequireAuth";
import { createPayment } from "@/lib/data";

function NewPayment() {
  const { user } = useApp();
  const router = useRouter();

  return (
    <>
      <header className="topbar">
        <Link href="/" className="icon-btn" aria-label="Back">
          <FontAwesomeIcon icon={faArrowLeft} />
        </Link>
        <h1 className="title-sm">New payment</h1>
        <span className="icon-btn-spacer" />
      </header>
      <PaymentForm
        submitLabel="Create payment"
        onSubmit={async (input) => {
          const id = await createPayment(user!.uid, input);
          router.replace(`/payments/${id}`);
        }}
      />
    </>
  );
}

export default function NewPaymentPage() {
  return (
    <RequireAuth>
      <NewPayment />
    </RequireAuth>
  );
}
