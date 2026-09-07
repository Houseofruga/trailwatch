"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { formatUrlError } from "@/features/competitors/rowValidation";
import { normalizeUrl } from "@/features/competitors/url";
import styles from "@/components/EditPageDialog.module.css";

// Add a competitor by hand during onboarding — the same modal chrome as the
// add/edit-page dialog, but it collects a competitor name + homepage URL and
// hands them back to the watchlist (nothing is persisted here; seeding happens
// when the user finishes onboarding).
export function AddCompetitorDialog({
  onAdd,
  onClose,
}: {
  onAdd: (competitor: { name: string; url: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const normalized = normalizeUrl(url);
  // Only surface a format error once they've typed a URL; the button gates the
  // required-ness so the form doesn't shout on an empty open.
  const urlError = url.trim() ? formatUrlError(normalized) : null;
  const canSubmit = name.trim() !== "" && url.trim() !== "" && !urlError;

  function save() {
    if (!canSubmit) return;
    onAdd({ name: name.trim(), url: normalized });
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.title}>Add competitor</div>

        <label className={styles.label} htmlFor="add-comp-name">
          Competitor name
        </label>
        <input
          id="add-comp-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
          placeholder="e.g. Linear"
          className={styles.nameInput}
          autoFocus
        />
        <div className={styles.spacer} />

        <label className={styles.label} htmlFor="add-comp-url">
          Homepage URL
        </label>
        <input
          id="add-comp-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
          placeholder="https://competitor.com"
          inputMode="url"
          className={urlError ? styles.urlInputError : styles.urlInput}
        />
        {urlError ? <div className={styles.fieldError}>{urlError}</div> : null}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSubmit}>
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
