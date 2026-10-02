"use client";

import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";
import { PaymentForm } from "@/components/PaymentForm";
import { RequireAuth } from "@/components/RequireAuth";
import { useToast } from "@/components/Toast";
import { createPayment } from "@/lib/data";

function NewPayment() {
  const { user } = useApp();
  const router = useRouter();
  const toast = useToast();

  return (
    <>
      <header className="topbar">
        <Link href="/" className="icon-btn" aria-label="Back to payments">
          <FontAwesomeIcon icon={faArrowLeft} />
        </Link>
        <h1 className="title-sm">New payment</h1>
        <span className="icon-btn-spacer" />
      </header>
      <PaymentForm
        submitLabel="Create payment"
        onSubmit={(input) => {
          const write = createPayment(user!.uid, input);
          write.done.catch((e: Error) => toast({ tone: "error", message: `Couldn't save the payment: ${e.message}` }));
          router.replace(`/payments/${write.id}`);
          toast({ message: `Created ${input.name}` });
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
