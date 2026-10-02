import { faArrowLeft, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="center-screen">
      <div className="empty">
        <FontAwesomeIcon icon={faMagnifyingGlass} className="empty-icon" />
        <h2>Page not found</h2>
        <p className="muted">This page doesn&rsquo;t exist.</p>
        <Link href="/" className="btn btn-secondary">
          <FontAwesomeIcon icon={faArrowLeft} /> Back to payments
        </Link>
      </div>
    </div>
  );
}
