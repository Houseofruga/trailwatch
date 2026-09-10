"use client";

import { useState, useTransition } from "react";
import { updatePage } from "@/features/competitors/actions";
import { domainMismatchError, formatUrlError } from "@/features/competitors/rowValidation";
import { siteOf } from "@/features/competitors/domain";
import styles from "./EditPageDialog.module.css";

function toFull(u: string): string {
  const t = u.trim();
  return t ? (/^https?:\/\//i.test(t) ? t : `https://${t}`) : "";
}
function canon(u: string): string {
  return u.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
}

type EditPageDialogProps = {
  pageId: string;
  initialUrl: string;
  initialLabel: string;
  /** Domain the competitor's other pages sit on — null when this is the only page. */
  siblingDomain: string | null;
  onClose: () => void;
  onSaved: () => void;
};

/**
 * Edit URL (IA "Add flows" §7) — a URL-only correction. The current URL is shown
 * locked; a new URL is validated (format + same-site) and, on save, `updatePage`
 * re-points the page and re-checks it. The page name/label is unchanged. URL-only
 * by design; changing the URL re-captures the page (history does NOT carry over —
 * so the copy never claims it does).
 */
export function EditPageDialog({
  pageId,
  initialUrl,
  initialLabel,
  siblingDomain,
  onClose,
  onSaved,
}: EditPageDialogProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const full = toFull(url);
  const urlError = full
    ? formatUrlError(full) ?? (siblingDomain ? domainMismatchError(full, siblingDomain) : null)
    : null;
  const changed = Boolean(full) && canon(full) !== canon(initialUrl);
  const valid = Boolean(full) && !urlError;
  const canSave = valid && changed;

  const domainDisplay = siblingDomain
    ? siblingDomain.replace(/^https?:\/\//, "").replace(/^www\./, "")
    : siteOf(full);

  function save() {
    if (!canSave) return;
    startTransition(async () => {
      const result = await updatePage(pageId, full, initialLabel);
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
      <div className={styles.card} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>Edit URL</div>
            <div className={styles.sub}>Point this page at a corrected address.</div>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            &#10005;
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.field}>
            <span className={styles.flabel}>Current URL</span>
            <div className={styles.fldDis}>
              <span className={styles.mono}>{initialUrl.replace(/^https?:\/\//, "")}</span>
              <span className={styles.lock} aria-hidden="true">&#128274;</span>
            </div>
          </div>

          <div className={styles.fieldLast}>
            <span className={styles.flabel}>New URL</span>
            <div className={urlError ? styles.fldErr : styles.fld}>
              <input
                className={styles.input}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                placeholder="https://…"
                inputMode="url"
                autoFocus
              />
              {full ? (
                urlError ? (
                  <span className={styles.warnIcon} aria-hidden="true">&#9888;</span>
                ) : changed ? (
                  <span className={styles.okIcon} aria-hidden="true">&#10003;</span>
                ) : null
              ) : null}
            </div>
            {urlError ? (
              <div className={styles.errNote}>
                <span aria-hidden="true">&#9888;</span>
                <span>{urlError}</span>
              </div>
            ) : valid && changed ? (
              <div className={styles.okNote}>
                <span aria-hidden="true">&#10003;</span> Looks good{domainDisplay ? ` — part of ${domainDisplay}` : ""}
              </div>
            ) : (
              <div className={styles.hint}>Enter a new URL to save.</div>
            )}
            {error ? <div className={styles.formError}>{error}</div> : null}
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancel} onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button type="button" className={styles.save} onClick={save} disabled={!canSave || pending}>
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
