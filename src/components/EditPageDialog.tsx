"use client";

import { useId, useState, useTransition } from "react";
import { Button } from "./Button";
import { updatePage } from "@/features/competitors/actions";
import { originOf } from "@/features/competitors/domain";
import { formatUrlError } from "@/features/competitors/rowValidation";
import { pageLabel } from "@/features/competitors/validation";
import styles from "./EditPageDialog.module.css";

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

type EditPageDialogProps = {
  pageId: string;
  initialUrl: string;
  initialLabel: string;
  /** Domain the competitor's other pages sit on — null when this is the only page. */
  siblingDomain: string | null;
  onClose: () => void;
  onSaved: () => void;
};

export function EditPageDialog({
  pageId,
  initialUrl,
  initialLabel,
  siblingDomain,
  onClose,
  onSaved,
}: EditPageDialogProps) {
  const listId = useId();
  const [url, setUrl] = useState(initialUrl);
  const [label, setLabel] = useState(initialLabel);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function urlErrorFor(value: string): string | null {
    if (!value.trim()) return "Enter a URL.";
    const format = formatUrlError(value);
    if (format) return format;
    if (siblingDomain && originOf(value) !== siblingDomain) {
      return `Must be on ${siblingDomain.replace(/^https?:\/\//, "")} — use Edit to move every page to a new domain.`;
    }
    return null;
  }

  function labelErrorFor(value: string): string | null {
    const result = pageLabel.safeParse(value);
    return result.success ? null : result.error.issues[0].message;
  }

  const urlError = urlErrorFor(url);
  const labelError = labelErrorFor(label);
  const canSubmit = !urlError && !labelError;

  function save() {
    startTransition(async () => {
      const result = await updatePage(pageId, url, label);
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
        <div className={styles.title}>Edit page</div>

        <label className={styles.label} htmlFor="edit-page-url">
          Page URL
        </label>
        <input
          id="edit-page-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://competitor.com/pricing"
          className={urlError ? styles.urlInputError : styles.urlInput}
          autoFocus
        />
        {urlError ? <div className={styles.fieldError}>{urlError}</div> : <div className={styles.spacer} />}

        <label className={styles.label} htmlFor="edit-page-name">
          Page name
        </label>
        <datalist id={listId}>
          {LABEL_OPTIONS.map((opt) => (
            <option key={opt} value={opt} />
          ))}
        </datalist>
        <input
          id="edit-page-name"
          list={listId}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Pricing"
          className={labelError ? styles.nameInputError : styles.nameInput}
        />
        {labelError ? <div className={styles.fieldError}>{labelError}</div> : null}

        {error ? <div className={styles.error}>{error}</div> : null}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending || !canSubmit}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
