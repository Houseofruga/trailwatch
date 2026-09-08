"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { CompetitorAvatar } from "./CompetitorAvatar";
import { addPages, type FormState } from "@/features/competitors/actions";
import { originOf } from "@/features/competitors/domain";
import { formatUrlError, domainMismatchError } from "@/features/competitors/rowValidation";
import { PAGE_TYPE_VALUES, pageTypeLabel, labelToType, type PageType } from "@/features/competitors/pageTypes";
import { LIMITS } from "@/features/plan/limits";
import styles from "./AddPageDialog.module.css";

// Loose URL equality for the "already tracking this" check — protocol/trailing
// slash / case shouldn't make the same page look new.
function normalize(u: string): string {
  return u
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
}

function StartButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.start} disabled={disabled || pending}>
      {pending ? "Capturing…" : "Start tracking"}
    </button>
  );
}

type AddPageDialogProps = {
  competitorId: string;
  competitorName: string;
  competitorUrl: string;
  existingDomain: string;
  existingUrls: string[];
  currentCount: number;
  pagesPerCompetitor: number;
  plan: "free" | "paid";
  onClose: () => void;
};

/**
 * Add Page — a focused modal (IA "Add flows" §2). Competitor is fixed (opened
 * from its detail page); URL is validated against the competitor's domain and
 * against pages already tracked; a page-type picker sets the dashboard grouping
 * key. At the plan's per-competitor page cap the form is replaced by an upgrade
 * prompt.
 */
export function AddPageDialog({
  competitorId,
  competitorName,
  competitorUrl,
  existingDomain,
  existingUrls,
  currentCount,
  pagesPerCompetitor,
  plan,
  onClose,
}: AddPageDialogProps) {
  const [state, formAction] = useActionState<FormState, FormData>(addPages, null);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [pickedType, setPickedType] = useState<PageType | null>(null);

  const atLimit = currentCount >= pagesPerCompetitor;
  const domain = existingDomain || originOf(competitorUrl) || "";
  const trimmed = url.trim();
  // Accept bare domains (design shows "stripe.com/customers" as valid) by
  // normalizing to https:// before validating and submitting — same as the
  // onboarding add-competitor modal.
  const full = trimmed ? (/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`) : "";
  const dup = Boolean(full) && existingUrls.some((u) => normalize(u) === normalize(full));
  const urlError = full
    ? formatUrlError(full) ??
      domainMismatchError(full, domain) ??
      (dup ? "You’re already tracking this page." : null)
    : null;
  const urlValid = Boolean(full) && !urlError;
  // The picked type wins; until the user picks, follow the name (labelToType).
  const effectiveType: PageType = pickedType ?? labelToType(name || "");
  const canSubmit = urlValid && name.trim().length > 0;
  const planLabel = plan === "free" ? "Free" : "Pro";

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>Track a new page</div>
            <div className={styles.sub}>We take a baseline snapshot the moment you add it.</div>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            &#10005;
          </button>
        </div>

        <form action={formAction}>
          <input type="hidden" name="competitorId" value={competitorId} />
          <input type="hidden" name="url" value={full} />
          <input type="hidden" name="label" value={name.trim()} />
          <input type="hidden" name="pageType" value={effectiveType} />

          <div className={styles.body}>
            <div className={styles.field}>
              <span className={styles.flabel}>Competitor</span>
              <div className={styles.compRow}>
                <CompetitorAvatar url={competitorUrl} name={competitorName} className={styles.compAvatar} />
                <span className={styles.compName}>{competitorName}</span>
              </div>
            </div>

            {!atLimit ? (
              <>
                <div className={styles.field}>
                  <span className={styles.flabel}>Page URL</span>
                  <div className={urlError ? styles.fldErr : styles.fld}>
                    <input
                      className={styles.urlInput}
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="competitor.com/pricing"
                      inputMode="url"
                      autoFocus
                    />
                    {trimmed ? (
                      urlError ? (
                        <span className={styles.warnIcon} aria-hidden="true">
                          &#9888;
                        </span>
                      ) : (
                        <span className={styles.okIcon} aria-hidden="true">
                          &#10003;
                        </span>
                      )
                    ) : null}
                  </div>
                  {urlError ? (
                    <div className={styles.errNote}>
                      <span aria-hidden="true">&#9888;</span>
                      <span>{urlError}</span>
                    </div>
                  ) : urlValid ? (
                    <div className={styles.okNote}>
                      <span aria-hidden="true">&#10003;</span> Looks good — part of{" "}
                      {domain.replace(/^https?:\/\//, "").replace(/^www\./, "")}
                    </div>
                  ) : null}
                </div>

                <div className={styles.field}>
                  <span className={styles.flabel}>Page name</span>
                  <div className={styles.fld}>
                    <input
                      className={styles.nameInput}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Pricing"
                    />
                  </div>
                </div>

                <div className={styles.fieldLast}>
                  <span className={styles.flabel}>Page type</span>
                  <div className={styles.pills}>
                    {PAGE_TYPE_VALUES.map((t) => (
                      <button
                        type="button"
                        key={t}
                        className={t === effectiveType ? styles.pillOn : styles.pill}
                        onClick={() => setPickedType(t)}
                        aria-pressed={t === effectiveType}
                      >
                        {t === effectiveType ? (
                          <svg width="10" height="8" viewBox="0 0 11 9" fill="none" aria-hidden="true">
                            <path d="M1 4.5L4 7.5L10 1.5" stroke="#9ff50a" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : null}
                        {pageTypeLabel(t)}
                      </button>
                    ))}
                  </div>
                  <div className={styles.pillsNote}>
                    Groups this page on the dashboard with the same type across competitors.
                  </div>
                </div>
              </>
            ) : null}

            {state?.error ? <div className={styles.formError}>{state.error}</div> : null}
          </div>

          {atLimit ? (
            <div className={styles.limitFoot}>
              <div className={styles.limitRow}>
                <span className={styles.limitBadge} aria-hidden="true">
                  {plan === "free" ? "↑" : "✓"}
                </span>
                <div>
                  <div className={styles.limitTitle}>
                    {competitorName} is at {currentCount} of {pagesPerCompetitor} page
                    {pagesPerCompetitor === 1 ? "" : "s"} on {planLabel}
                  </div>
                  <div className={styles.sub}>
                    {plan === "free"
                      ? `Pro tracks up to ${LIMITS.paid.pagesPerCompetitor} pages per competitor. Upgrade to add this one.`
                      : "That's the most pages we track per competitor. Remove one to make room for another."}
                  </div>
                </div>
              </div>
              <div className={styles.limitActions}>
                {plan === "free" ? (
                  <>
                    <Link href="/billing" className={styles.upgrade}>
                      Upgrade to Pro
                    </Link>
                    <button type="button" className={styles.maybe} onClick={onClose}>
                      Maybe later
                    </button>
                  </>
                ) : (
                  <button type="button" className={styles.maybe} onClick={onClose}>
                    Got it
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.footer}>
              <span className={styles.sub}>
                {planLabel} · will be {currentCount + 1} of {pagesPerCompetitor}
              </span>
              <div className={styles.footActions}>
                <button type="button" className={styles.cancel} onClick={onClose}>
                  Cancel
                </button>
                <StartButton disabled={!canSubmit} />
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
