"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/Button";
import { createCompetitor, type FormState } from "@/features/competitors/actions";
import { originOf } from "@/features/competitors/domain";
import { PlusIcon } from "@/components/icons";
import { domainMismatchError, formatUrlError } from "@/features/competitors/rowValidation";
import styles from "./page.module.css";

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

function SubmitButton({ label, canSubmit }: { label: string; canSubmit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || !canSubmit}>
      {pending ? "One moment…" : label}
    </Button>
  );
}

type AddFormProps = { slotsLeft: number; totalCompetitorSlots: number; pagesPerCompetitor: number };

export function AddForm({ slotsLeft, totalCompetitorSlots, pagesPerCompetitor }: AddFormProps) {
  const listId = useId();
  const [state, formAction] = useActionState<FormState, FormData>(createCompetitor, null);
  const [rows, setRows] = useState<Row[]>([{ key: "0", url: "", label: "Pricing" }]);

  // Row 0 sets the domain every later row must share.
  const establishedOrigin = originOf(rows[0]?.url ?? "");

  function addRow() {
    setRows((r) => (r.length >= pagesPerCompetitor ? r : [...r, { key: String(r.length + Date.now()), url: "", label: "" }]));
  }

  function removeRow(key: string) {
    setRows((r) => (r.length === 1 ? r : r.filter((row) => row.key !== key)));
  }

  function updateRow(key: string, field: "url" | "label", value: string) {
    setRows((r) => r.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  }

  function rowError(row: Row, index: number): string | null {
    return formatUrlError(row.url) ?? (index === 0 ? null : domainMismatchError(row.url, establishedOrigin));
  }

  const rowsMaxed = rows.length >= pagesPerCompetitor;
  const rowErrors = rows.map((row, index) => rowError(row, index));
  const hasAnyValidUrl = rows.some((row, index) => row.url.trim() && !rowErrors[index]);
  const hasAnyInvalidUrl = rowErrors.some(Boolean);
  const canSubmit = hasAnyValidUrl && !hasAnyInvalidUrl;

  return (
    <div>
      <h1 className={styles.title}>Add a competitor</h1>
      <p className={styles.slotsNote}>{slotsLeft} of {totalCompetitorSlots} competitor slots left.</p>

      <form action={formAction}>
        <label className={styles.fieldLabel} htmlFor="name">
          Competitor name
        </label>
        <input id="name" name="name" placeholder="Linear" className={styles.nameInput} />

        <div className={styles.rowsHead}>
          <span className={styles.rowsHeadLabel}>Pages to watch</span>
          <span className={styles.rowsHeadNote}>Up to {pagesPerCompetitor} on this plan</span>
        </div>

        <datalist id={listId}>
          {LABEL_OPTIONS.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>

        <div className={styles.colLabels}>
          <div className={styles.colLabelUrl}>Page URL</div>
          <div className={styles.colLabelName}>Page name</div>
          <div className={styles.colLabelSpacer} />
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

        <div className={styles.actions}>
          <SubmitButton label="Start tracking" canSubmit={canSubmit} />
          <Link href="/dashboard" className={styles.cancel}>
            Cancel
          </Link>
          {state?.error ? <span className={styles.formError}>{state.error}</span> : null}
        </div>

        <p className={styles.hint}>
          First check runs within an hour. After that, once a day — and we only tell you when something actually
          changed.
        </p>
      </form>
    </div>
  );
}
