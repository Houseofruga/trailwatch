"use client";

import { useState } from "react";
import { formatUrlError } from "@/features/competitors/rowValidation";
import { normalizeUrl } from "@/features/competitors/url";
import styles from "./AddCompetitorDialog.module.css";

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
        <div className={styles.header}>
          <div className={styles.title}>Add competitor</div>
          <div className={styles.sub}>We&rsquo;ll watch its homepage and email you when it changes.</div>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="add-comp-name">
              Competitor name
            </label>
            <div className={styles.fld}>
              <input
                id="add-comp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                }}
                placeholder="e.g. Linear"
                className={styles.input}
                autoFocus
              />
            </div>
          </div>

          <div className={styles.fieldLast}>
            <label className={styles.label} htmlFor="add-comp-url">
              Homepage URL
            </label>
            <div className={urlError ? styles.fldErr : styles.fld}>
              <input
                id="add-comp-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save();
                }}
                placeholder="competitor.com"
                inputMode="url"
                className={`${styles.input} ${styles.inputMono}`}
              />
            </div>
            {urlError ? (
              <div className={styles.errNote}>
                <span aria-hidden="true">&#9888;</span>
                <span>{urlError}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancel} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.add} onClick={save} disabled={!canSubmit}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
