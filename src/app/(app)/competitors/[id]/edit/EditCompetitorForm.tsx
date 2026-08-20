"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/Button";
import type { CompetitorRow } from "@/features/competitors/queries";
import { updateCompetitorDetails, type EditFormState } from "@/features/competitors/actions";
import { normalizeDomainInput, originOf, replaceUrlHost } from "@/features/competitors/domain";
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

type Row = { id: string; label: string; url: string };

function SubmitButton({ canSubmit }: { canSubmit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || !canSubmit}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

function labelError(label: string): string | null {
  const result = pageLabel.safeParse(label);
  return result.success ? null : result.error.issues[0].message;
}

export function EditCompetitorForm({ competitor }: { competitor: CompetitorRow }) {
  const [state, formAction] = useActionState<EditFormState, FormData>(updateCompetitorDetails, null);
  const listId = useId();
  const [name, setName] = useState(competitor.name);
  const [domain, setDomain] = useState(
    (originOf(competitor.pages[0]?.url ?? "") ?? "").replace(/^https?:\/\//, ""),
  );
  const [rows, setRows] = useState<Row[]>(() =>
    competitor.pages.map((p) => ({ id: p.id, label: p.label, url: p.url })),
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

  function updateRow(id: string, field: "label" | "url", value: string) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }

  function urlError(url: string): string | null {
    if (!url.trim()) return "Enter a URL.";
    return formatUrlError(url) ?? domainMismatchError(url, normalizedOrigin);
  }

  const rowErrors = rows.map((row) => ({ url: urlError(row.url), label: labelError(row.label) }));
  const canSubmit =
    name.trim().length > 0 &&
    normalizedOrigin !== null &&
    rowErrors.every((e) => !e.url && !e.label);

  return (
    <div className={styles.wrap}>
      <Link href="/competitors" className={styles.back}>
        ← Competitors
      </Link>
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
        </div>

        <div className={styles.pageRows}>
          {rows.map((row, index) => {
            const errors = rowErrors[index];
            return (
              <div key={row.id} className={styles.pageGroup}>
                <div className={styles.pageRow}>
                  <input type="hidden" name="pageId" value={row.id} />
                  <input
                    name="url"
                    value={row.url}
                    onChange={(e) => updateRow(row.id, "url", e.target.value)}
                    placeholder="https://competitor.com/pricing"
                    className={errors.url ? styles.urlInputError : styles.urlInput}
                  />
                  <input
                    name="label"
                    list={listId}
                    value={row.label}
                    onChange={(e) => updateRow(row.id, "label", e.target.value)}
                    placeholder="e.g. Pricing"
                    className={errors.label ? styles.labelInputError : styles.labelInput}
                  />
                </div>
                {errors.url ? <div className={styles.rowError}>{errors.url}</div> : null}
                {errors.label ? <div className={styles.rowError}>{errors.label}</div> : null}
              </div>
            );
          })}
        </div>

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
