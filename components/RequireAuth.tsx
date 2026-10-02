"use client";

import { faCircleNotch, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "./AppProvider";

export function FullScreenSpinner() {
  return (
    <div className="center-screen" role="status" aria-label="Loading">
      <FontAwesomeIcon icon={faCircleNotch} spin className="spinner" />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="skeleton-wrap" role="status" aria-label="Loading">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-hero" />
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-card" />
      <div className="skeleton skeleton-card" />
    </div>
  );
}

/** Renders children only for a signed-in user whose data has loaded. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, authLoading, dataLoading, dataError } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authLoading && !user) {
      const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
    }
  }, [authLoading, user, router, pathname]);

  if (authLoading || !user) return <FullScreenSpinner />;
  if (dataLoading) return <Skeleton />;

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
