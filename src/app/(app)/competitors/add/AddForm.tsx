"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/Button";
import { addPages, createCompetitor, type FormState } from "@/features/competitors/actions";
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

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "One moment…" : label}
    </Button>
  );
}

type AddFormProps =
  | { mode: "new"; slotsLeft: number; totalCompetitorSlots: number; pagesPerCompetitor: number }
  | { mode: "page"; competitorId: string; competitorName: string; slotsLeft: number; pagesPerCompetitor: number };

export function AddForm(props: AddFormProps) {
  const { mode, slotsLeft, pagesPerCompetitor } = props;
  const listId = useId();
  const action = mode === "new" ? createCompetitor : addPages;
  const [state, formAction] = useActionState<FormState, FormData>(action, null);
  const [rows, setRows] = useState<Row[]>([{ key: "0", url: "", label: "Pricing" }]);

  function addRow() {
    setRows((r) => (r.length >= pagesPerCompetitor ? r : [...r, { key: String(r.length + Date.now()), url: "", label: "" }]));
  }

  function removeRow(key: string) {
    setRows((r) => (r.length === 1 ? r : r.filter((row) => row.key !== key)));
  }

  function updateRow(key: string, field: "url" | "label", value: string) {
    setRows((r) => r.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  }

  const rowsMaxed = rows.length >= pagesPerCompetitor;

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
          {rows.map((row) => (
            <div key={row.key} className={styles.rowLine}>
              <input
                name="url"
                value={row.url}
                onChange={(e) => updateRow(row.key, "url", e.target.value)}
                placeholder="https://competitor.com/pricing"
                className={styles.urlInput}
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
          ))}
        </div>

        {!rowsMaxed ? (
          <button type="button" className={styles.addRow} onClick={addRow}>
            + Add another page
          </button>
        ) : (
          <div className={styles.rowsMaxedNote}>That&rsquo;s all {pagesPerCompetitor} pages on this plan.</div>
        )}

        <div className={styles.actions}>
          <SubmitButton label={mode === "new" ? "Start tracking" : "Add pages"} />
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
