"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/Button";
import { BackLink } from "@/components/BackLink";
import type { CompetitorRow } from "@/features/competitors/queries";
import { updateCompetitorDetails, type EditFormState } from "@/features/competitors/actions";
import { normalizeDomainInput, originOf, replaceUrlHost } from "@/features/competitors/domain";
import { PlusIcon } from "@/components/icons";
import { domainMismatchError, formatUrlError } from "@/features/competitors/rowValidation";
import { pageLabel } from "@/features/competitors/validation";
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

// `id` is null for rows added here that don't exist in the DB yet — the
// server inserts those and updates the rest.
type Row = { key: string; id: string | null; label: string; url: string };

function SubmitButton({ canSubmit }: { canSubmit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || !canSubmit}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

export function EditCompetitorForm({
  competitor,
  pagesPerCompetitor,
}: {
  competitor: CompetitorRow;
  pagesPerCompetitor: number;
}) {
  const [state, formAction] = useActionState<EditFormState, FormData>(updateCompetitorDetails, null);
  const listId = useId();
  const [name, setName] = useState(competitor.name);
  const [domain, setDomain] = useState(
    (originOf(competitor.pages[0]?.url ?? "") ?? "").replace(/^https?:\/\//, ""),
  );
  const [rows, setRows] = useState<Row[]>(() =>
    competitor.pages.map((p) => ({ key: p.id, id: p.id, label: p.label, url: p.url })),
  );

  const normalizedOrigin = normalizeDomainInput(domain);

  // Editing the domain moves every page under it, each keeping its own
  // path — that's the "fix one typo, not five URLs" case. The page URLs
  // themselves stay freely editable below.
  function updateDomain(value: string) {
    setDomain(value);
    const origin = normalizeDomainInput(value);
    if (!origin) return;
    setRows((current) =>
      current.map((row) => {
        try {
          return { ...row, url: replaceUrlHost(row.url, origin) };
        } catch {
          return row; // unparseable URL — leave it for its own inline error
        }
      }),
    );
  }

  function addRow() {
    setRows((current) =>
      current.length >= pagesPerCompetitor
        ? current
        : [
            ...current,
            {
              key: `new-${Date.now()}`,
              id: null,
              label: "",
              url: normalizedOrigin ? `${normalizedOrigin}/` : "",
            },
          ],
    );
  }

  function removeRow(key: string) {
    setRows((current) => current.filter((row) => row.key !== key));
  }

  function updateRow(key: string, field: "label" | "url", value: string) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  }

  // A brand-new row left blank is just an unused slot, not an error —
  // matching how the add form treats its empty rows.
  function isUnusedNewRow(row: Row) {
    return !row.id && !row.url.trim() && !row.label.trim();
  }

  function urlError(row: Row): string | null {
    if (isUnusedNewRow(row)) return null;
    if (!row.url.trim()) return "Enter a URL.";
    return formatUrlError(row.url) ?? domainMismatchError(row.url, normalizedOrigin);
  }

  function labelErrorFor(row: Row): string | null {
    if (isUnusedNewRow(row)) return null;
    const result = pageLabel.safeParse(row.label);
    return result.success ? null : result.error.issues[0].message;
  }

  const rowErrors = rows.map((row) => ({ url: urlError(row), label: labelErrorFor(row) }));
  const rowsMaxed = rows.length >= pagesPerCompetitor;
  const canSubmit =
    name.trim().length > 0 &&
    normalizedOrigin !== null &&
    rows.some((row) => !isUnusedNewRow(row)) &&
    rowErrors.every((e) => !e.url && !e.label);

  return (
    <div className={styles.wrap}>
      <BackLink href="/competitors">Competitors</BackLink>
      <h1 className={styles.title}>Edit {competitor.name}</h1>

      <form action={formAction}>
        <input type="hidden" name="competitorId" value={competitor.id} />

        <label className={styles.fieldLabel} htmlFor="edit-name">
          Name
        </label>
        <input
          id="edit-name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.nameInput}
        />

        {/* Client-side only: a shortcut for rewriting every page URL below. */}
        <label className={styles.fieldLabel} htmlFor="edit-domain">
          Domain
        </label>
        <input
          id="edit-domain"
          value={domain}
          onChange={(e) => updateDomain(e.target.value)}
          placeholder="example.com"
          className={styles.domainInput}
        />
        <p className={styles.domainHint}>
          Changing this moves every page below to the new domain, each keeping its own path. You
          can also edit any page&rsquo;s full URL directly.
        </p>

        <datalist id={listId}>
          {LABEL_OPTIONS.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>

        <div className={styles.pagesHead}>Pages</div>
        <div className={styles.colLabels}>
          <div className={styles.colLabelUrl}>Page URL</div>
          <div className={styles.colLabelName}>Page name</div>
          <div className={styles.colLabelSpacer} />
        </div>

        <div className={styles.pageRows}>
          {rows.map((row, index) => {
            const errors = rowErrors[index];
            return (
              <div key={row.key} className={styles.pageGroup}>
                <div className={styles.pageRow}>
                  <input type="hidden" name="pageId" value={row.id ?? ""} />
                  <input
                    name="url"
                    value={row.url}
                    onChange={(e) => updateRow(row.key, "url", e.target.value)}
                    placeholder="https://competitor.com/pricing"
                    className={errors.url ? styles.urlInputError : styles.urlInput}
                  />
                  <input
                    name="label"
                    list={listId}
                    value={row.label}
                    onChange={(e) => updateRow(row.key, "label", e.target.value)}
                    placeholder="e.g. Pricing"
                    className={errors.label ? styles.labelInputError : styles.labelInput}
                  />
                  {/* Existing pages are deleted from the Competitors list,
                      where it's behind a confirmation. */}
                  {row.id ? (
                    <span className={styles.removeSpacer} />
                  ) : (
                    <button type="button" className={styles.removeRow} onClick={() => removeRow(row.key)}>
                      Remove
                    </button>
                  )}
                </div>
                {errors.url ? <div className={styles.rowError}>{errors.url}</div> : null}
                {errors.label ? <div className={styles.rowError}>{errors.label}</div> : null}
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
          <SubmitButton canSubmit={canSubmit} />
          <Link href="/competitors" className={styles.cancel}>
            Cancel
          </Link>
          {state?.error ? <span className={styles.formError}>{state.error}</span> : null}
        </div>
      </form>
    </div>
  );
}
