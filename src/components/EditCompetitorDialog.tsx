"use client";

import { useState, useTransition } from "react";
import { Button } from "./Button";
import { updateCompetitor } from "@/features/competitors/actions";
import styles from "./EditCompetitorDialog.module.css";

type EditCompetitorDialogProps = {
  competitorId: string;
  initialName: string;
  initialDomain: string;
  onClose: () => void;
  onSaved: () => void;
};

export function EditCompetitorDialog({
  competitorId,
  initialName,
  initialDomain,
  onClose,
  onSaved,
}: EditCompetitorDialogProps) {
  const [name, setName] = useState(initialName);
  const [domain, setDomain] = useState(initialDomain);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateCompetitor(competitorId, name, domain);
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
      onClose();
    });
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>Edit competitor</div>

        <label className={styles.label} htmlFor="edit-competitor-name">
          Name
        </label>
        <input
          id="edit-competitor-name"
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label className={styles.label} htmlFor="edit-competitor-domain">
          Domain
        </label>
        <input
          id="edit-competitor-domain"
          className={styles.input}
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
        />
        <p className={styles.hint}>
          Every page you track for this competitor moves to the new domain — only the domain
          changes, each page keeps its own path.
        </p>

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
