"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "./Button";
import styles from "./ConfirmDialog.module.css";

type ConfirmDialogProps = {
  title: string;
  body: ReactNode;
  cta: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
};

export function ConfirmDialog({ title, body, cta, onConfirm, onClose }: ConfirmDialogProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    startTransition(async () => {
      try {
        await onConfirm();
        onClose();
      } catch {
        setError("Something went wrong. Try again.");
      }
    });
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>{title}</div>
        <div className={styles.body}>{body}</div>
        {error ? <div className={styles.body} style={{ color: "var(--danger)" }}>{error}</div> : null}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Keep it
          </Button>
          <button type="button" className={styles.danger} onClick={confirm} disabled={pending}>
            {pending ? "One moment…" : cta}
          </button>
        </div>
      </div>
    </div>
  );
}
