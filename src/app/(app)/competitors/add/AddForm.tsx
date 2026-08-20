"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/Button";
import { addPages, createCompetitor, type FormState } from "@/features/competitors/actions";
import { originOf } from "@/features/competitors/domain";
import { pageUrl } from "@/features/competitors/validation";
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

function formatError(url: string): string | null {
  if (!url.trim()) return null; // blank rows aren't errors, just unused slots
  const result = pageUrl.safeParse(url);
  return result.success ? null : result.error.issues[0].message;
}

function SubmitButton({ label, canSubmit }: { label: string; canSubmit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || !canSubmit}>
      {pending ? "One moment…" : label}
    </Button>
  );
}

type AddFormProps =
  | { mode: "new"; slotsLeft: number; totalCompetitorSlots: number; pagesPerCompetitor: number }
  | {
      mode: "page";
      competitorId: string;
      competitorName: string;
      existingDomain: string;
      slotsLeft: number;
      pagesPerCompetitor: number;
    };

export function AddForm(props: AddFormProps) {
  const { mode, slotsLeft, pagesPerCompetitor } = props;
  const listId = useId();
  const action = mode === "new" ? createCompetitor : addPages;
  const [state, formAction] = useActionState<FormState, FormData>(action, null);
  const [rows, setRows] = useState<Row[]>([{ key: "0", url: "", label: "Pricing" }]);

  // Pages under one competitor must share a domain. "new" mode: row 0 sets
  // it. "page" mode: it's already fixed by the competitor's existing pages.
  const establishedOrigin = mode === "page" ? props.existingDomain : originOf(rows[0]?.url ?? "");

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
    const formatIssue = formatError(row.url);
    if (formatIssue) return formatIssue;
    if (!row.url.trim()) return null;
    if (mode === "new" && index === 0) return null; // this row establishes the domain
    if (!establishedOrigin || originOf(row.url) === establishedOrigin) return null;
    return `Must be on ${establishedOrigin.replace(/^https?:\/\//, "")} — add a separate competitor for other domains.`;
  }

  const rowsMaxed = rows.length >= pagesPerCompetitor;
  const rowErrors = rows.map((row, index) => rowError(row, index));
  const hasAnyValidUrl = rows.some((row, index) => row.url.trim() && !rowErrors[index]);
  const hasAnyInvalidUrl = rowErrors.some(Boolean);
  const canSubmit = hasAnyValidUrl && !hasAnyInvalidUrl;

  return (
    <div>
      <h1 className={styles.title}>{mode === "new" ? "Add a competitor" : `Add a page to ${props.competitorName}`}</h1>
      <p className={styles.slotsNote}>
        {mode === "new"
          ? `${slotsLeft} of ${props.totalCompetitorSlots} competitor slots left.`
          : `${slotsLeft} of ${pagesPerCompetitor} page slots left for ${props.competitorName}.`}
      </p>

      <form action={formAction}>
        {mode === "page" ? (
          <>
            <input type="hidden" name="competitorId" value={props.competitorId} />
            <div className={styles.competitorFixed}>Competitor</div>
            <div className={styles.competitorFixedName}>{props.competitorName}</div>
          </>
        ) : (
          <>
            <label className={styles.fieldLabel} htmlFor="name">
              Competitor name
            </label>
            <input id="name" name="name" placeholder="Linear" className={styles.nameInput} />
          </>
        )}

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
            + Add another page
          </button>
        ) : (
          <div className={styles.rowsMaxedNote}>That&rsquo;s all {pagesPerCompetitor} pages on this plan.</div>
        )}

        <div className={styles.actions}>
          <SubmitButton label={mode === "new" ? "Start tracking" : "Add pages"} canSubmit={canSubmit} />
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
