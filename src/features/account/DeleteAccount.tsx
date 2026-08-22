"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/Button";
import { deleteAccount } from "./actions";
import styles from "@/app/(app)/settings/page.module.css";

export function DeleteAccount() {
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAccount();
      // Success redirects, so we only get here on failure.
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      <div className={styles.rowForm}>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Type DELETE to confirm"
          className={styles.input}
          aria-label="Type DELETE to confirm"
        />
        <Button
          variant="secondary"
          onClick={onDelete}
          disabled={confirm !== "DELETE" || pending}
        >
          {pending ? "Deleting…" : "Delete my account"}
        </Button>
      </div>
      {error ? <p className={styles.err}>{error}</p> : null}
    </div>
  );
}
