"use client";

import { faRotateRight, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="center-screen">
      <div className="empty">
        <FontAwesomeIcon icon={faTriangleExclamation} className="empty-icon danger" />
        <h2>Something went wrong</h2>
        <p className="muted">{error.message || "An unexpected error occurred."}</p>
        <button className="btn btn-secondary" onClick={reset}>
          <FontAwesomeIcon icon={faRotateRight} /> Try again
        </button>
      </div>
    </div>
  );
}
