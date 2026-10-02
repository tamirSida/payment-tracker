"use client";

import { faCircleNotch, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "./AppProvider";

export function FullScreenSpinner() {
  return (
    <div className="center-screen" role="status" aria-label="Loading">
      <FontAwesomeIcon icon={faCircleNotch} spin className="spinner" />
    </div>
  );
}

/** Renders children only for a signed-in user whose data has loaded. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, authLoading, dataLoading, dataError } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  if (authLoading || !user || dataLoading) return <FullScreenSpinner />;

  if (dataError) {
    return (
      <div className="center-screen">
        <div className="empty">
          <FontAwesomeIcon icon={faTriangleExclamation} className="empty-icon danger" />
          <h2>Could not load your data</h2>
          <p className="muted">{dataError}</p>
          <button className="btn btn-secondary" onClick={() => location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
