"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./Button";
import { PlusIcon } from "./icons";
import { addPages, type FormState } from "@/features/competitors/actions";
import { originOf } from "@/features/competitors/domain";
import { domainMismatchError, formatUrlError } from "@/features/competitors/rowValidation";
import styles from "./AddPageDialog.module.css";

const LABEL_OPTIONS = [
  "Pricing",
  "Homepage",
  "Changelog",
  "Blog",
  "Docs",
  "Careers",
  "Features",
  "Integrations",
];

type Row = { key: string; url: string; label: string };

function SubmitButton({ canSubmit }: { canSubmit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || !canSubmit}>
      {pending ? "Capturing…" : "Add pages"}
    </Button>
  );
}

type AddPageDialogProps = {
  competitorId: string;
  competitorName: string;
  existingDomain: string;
  slotsLeft: number;
  pagesPerCompetitor: number;
  onClose: () => void;
};

export function AddPageDialog({
  competitorId,
  competitorName,
  existingDomain,
  slotsLeft,
  pagesPerCompetitor,
  onClose,
}: AddPageDialogProps) {
  const listId = useId();
  const [state, formAction] = useActionState<FormState, FormData>(addPages, null);
  const [rows, setRows] = useState<Row[]>([{ key: "0", url: "", label: "" }]);

  function addRow() {
    setRows((r) => (r.length >= slotsLeft ? r : [...r, { key: String(r.length + Date.now()), url: "", label: "" }]));
  }

  function removeRow(key: string) {
    setRows((r) => (r.length === 1 ? r : r.filter((row) => row.key !== key)));
  }

  function updateRow(key: string, field: "url" | "label", value: string) {
    setRows((r) => r.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  }

  function rowError(row: Row): string | null {
    return formatUrlError(row.url) ?? domainMismatchError(row.url, existingDomain || originOf(row.url));
  }

  const rowsMaxed = rows.length >= slotsLeft;
  const rowErrors = rows.map(rowError);
  const hasAnyValidUrl = rows.some((row, index) => row.url.trim() && !rowErrors[index]);
  const hasAnyInvalidUrl = rowErrors.some(Boolean);
  const canSubmit = hasAnyValidUrl && !hasAnyInvalidUrl;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>Add a page to {competitorName}</div>
        <p className={styles.slotsNote}>
          {slotsLeft} of {pagesPerCompetitor} page slots left for {competitorName}.
        </p>

        <form action={formAction}>
          <input type="hidden" name="competitorId" value={competitorId} />

          <datalist id={listId}>
            {LABEL_OPTIONS.map((opt) => (
              <option key={opt} value={opt} />
            ))}
          </datalist>

          <div className={styles.rowsHead}>
            <div className={styles.colLabelUrl}>Page URL</div>
            <div className={styles.colLabelName}>Page name</div>
          </div>

          <div className={styles.rows}>
            {rows.map((row, index) => {
              const error = rowErrors[index];
              return (
                <div key={row.key} className={styles.rowGroup}>
                  <div className={styles.rowLine}>
                    <input
                      name="url"
                      value={row.url}
                      onChange={(e) => updateRow(row.key, "url", e.target.value)}
                      placeholder="https://competitor.com/pricing"
                      className={error ? styles.urlInputError : styles.urlInput}
                      autoFocus={index === 0}
                    />
                    <input
                      name="label"
                      list={listId}
                      value={row.label}
                      onChange={(e) => updateRow(row.key, "label", e.target.value)}
                      placeholder="e.g. Pricing"
                      className={styles.labelInput}
                    />
                    <button
                      type="button"
                      className={styles.removeRow}
                      onClick={() => removeRow(row.key)}
                      disabled={rows.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                  {error ? <div className={styles.rowError}>{error}</div> : null}
                </div>
              );
            })}
          </div>

          {!rowsMaxed ? (
            <button type="button" className={styles.addRow} onClick={addRow}>
              <PlusIcon size={12} />
              Add another page
            </button>
          ) : (
            <div className={styles.rowsMaxedNote}>That&rsquo;s all {pagesPerCompetitor} pages on this plan.</div>
          )}

          {state?.error ? <div className={styles.error}>{state.error}</div> : null}

          <div className={styles.actions}>
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <SubmitButton canSubmit={canSubmit} />
          </div>
        </form>
      </div>
    </div>
  );
}
