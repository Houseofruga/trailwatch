"use client";

import { useState, useTransition } from "react";
import { openBillingPortal } from "./actions";
import styles from "./ManageBillingButton.module.css";

// Opens the Paddle customer portal (invoices, payment method) in a new tab. The
// portal URL is minted per-click by the server action since it's short-lived.
export function ManageBillingButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const result = await openBillingPortal();
      if (result.ok) {
        window.open(result.url, "_blank", "noopener,noreferrer");
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <span>
      <button type="button" className={styles.link} onClick={onClick} disabled={pending}>
        {pending ? "Opening…" : "View & download ↗"}
      </button>
      {error ? <span className={styles.error}>{error}</span> : null}
    </span>
  );
}
