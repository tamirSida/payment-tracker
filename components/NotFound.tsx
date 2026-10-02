"use client";

import { faArrowLeft, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";

export function NotFound() {
  return (
    <div className="empty">
      <FontAwesomeIcon icon={faMagnifyingGlass} className="empty-icon" />
      <h2>Payment not found</h2>
      <p className="muted">It may have been deleted.</p>
      <Link href="/" className="btn btn-secondary">
        <FontAwesomeIcon icon={faArrowLeft} /> Back to payments
      </Link>
    </div>
  );
}
