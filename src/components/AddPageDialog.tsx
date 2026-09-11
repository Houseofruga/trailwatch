"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { UpgradeCta } from "./UpgradeCta";
import { CompetitorAvatar } from "./CompetitorAvatar";
import { addPages, type FormState } from "@/features/competitors/actions";
import { originOf } from "@/features/competitors/domain";
import { formatUrlError, domainMismatchError } from "@/features/competitors/rowValidation";
import { PAGE_TYPE_VALUES, pageTypeLabel, type PageType } from "@/features/competitors/pageTypes";
import { LIMITS } from "@/features/plan/limits";
import styles from "./AddPageDialog.module.css";

// Loose URL equality for the "already tracking this" check — protocol / www /
// trailing slash / case shouldn't make the same page look new. Kept in sync with
// the server's canonicalUrl (actions.ts) and rowRules' canonUrl.
function normalize(u: string): string {
  return u
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
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

// One competitor the modal can add a page to. In picker mode the modal is handed
// the whole list and the user chooses; in fixed mode the caller passes a single
// one it already knows (its own detail page).
export type AddPageCompetitor = {
  id: string;
  name: string;
  url: string;
  existingUrls: string[];
  currentCount: number;
};

function Chevron() {
  return (
    <svg width="9" height="6" viewBox="0 0 9 6" fill="none" aria-hidden="true" className={styles.compChevron}>
      <path d="M1 1l3.5 3.5L8 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type AddPageDialogProps = {
  // Picker mode (opened from the dashboard): the user picks the competitor first.
  competitors?: AddPageCompetitor[];
  // Fixed mode (opened from a competitor's detail page): competitor is known.
  competitorId?: string;
  competitorName?: string;
  competitorUrl?: string;
  existingUrls?: string[];
  currentCount?: number;
  pagesPerCompetitor: number;
  plan: "free" | "paid";
  onClose: () => void;
};

/**
 * Add Page — a focused modal (IA "Add flows" §A–E). URL is validated against the
 * chosen competitor's domain and against pages already tracked; a page-type
 * picker sets the dashboard grouping key. At the competitor's per-plan page cap
 * the form is replaced by an upgrade prompt.
 *
 * Two entry points share this one modal. From a competitor's detail page the
 * competitor is fixed and shown as a static row. From the dashboard there is no
 * competitor context, so step 1 is a picker and everything below stays inert
 * (§A "nothing below is active yet") until one is chosen.
 */
export function AddPageDialog({
  competitors,
  competitorId,
  competitorName,
  competitorUrl,
  existingUrls,
  currentCount,
  pagesPerCompetitor,
  plan,
  onClose,
}: AddPageDialogProps) {
  const isPicker = Array.isArray(competitors);
  const fixed: AddPageCompetitor | null = competitorId
    ? {
        id: competitorId,
        name: competitorName ?? "",
        url: competitorUrl ?? "",
        existingUrls: existingUrls ?? [],
        currentCount: currentCount ?? 0,
      }
    : null;

  const [state, formAction] = useActionState<FormState, FormData>(addPages, null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [pickedType, setPickedType] = useState<PageType | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close the competitor menu on an outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (!pickerRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  const selected: AddPageCompetitor | null = isPicker
    ? competitors!.find((c) => c.id === pickedId) ?? null
    : fixed;

  // Nothing below step 1 is usable until a competitor is chosen (picker mode).
  const gated = isPicker && !selected;

  const domain = selected ? originOf(selected.url) || "" : "";
  const trimmed = url.trim();
  // Accept bare domains (design shows "stripe.com/customers" as valid) by
  // normalizing to https:// before validating and submitting.
  const full = trimmed ? (/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`) : "";
  const dup = Boolean(full) && Boolean(selected) && selected!.existingUrls.some((u) => normalize(u) === normalize(full));
  const urlError =
    full && selected
      ? formatUrlError(full) ??
        domainMismatchError(full, domain) ??
        (dup ? "You’re already tracking this page." : null)
      : null;
  const urlValid = Boolean(full) && !urlError;
  // The page's name IS its type (a fixed set) — no free text. A type must be
  // picked before tracking; its display name is derived from the type.
  const canSubmit = Boolean(selected) && urlValid && pickedType !== null;
  const planLabel = plan === "free" ? "Free" : "Pro";
  const atLimit = Boolean(selected) && selected!.currentCount >= pagesPerCompetitor;

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
          <input type="hidden" name="competitorId" value={selected?.id ?? ""} />
          <input type="hidden" name="url" value={full} />
          <input type="hidden" name="label" value={pickedType ? pageTypeLabel(pickedType) : ""} />
          <input type="hidden" name="pageType" value={pickedType ?? ""} />

          <div className={styles.body}>
            <div className={styles.field}>
              <span className={styles.flabel}>Competitor</span>
              {isPicker ? (
                <div className={styles.compPicker} ref={pickerRef}>
                  <button
                    type="button"
                    className={styles.compSelect}
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-haspopup="listbox"
                    aria-expanded={menuOpen}
                  >
                    {selected ? (
                      <span className={styles.compSelectVal}>
                        <CompetitorAvatar url={selected.url} name={selected.name} className={styles.compAvatar} />
                        {selected.name}
                      </span>
                    ) : (
                      <span className={styles.compPlaceholder}>Choose a competitor</span>
                    )}
                    <Chevron />
                  </button>
                  {menuOpen ? (
                    <div className={styles.compMenu} role="listbox">
                      {competitors!.map((c) => (
                        <button
                          type="button"
                          key={c.id}
                          role="option"
                          aria-selected={c.id === selected?.id}
                          className={c.id === selected?.id ? styles.compMenuItemActive : styles.compMenuItem}
                          onClick={() => {
                            setPickedId(c.id);
                            setMenuOpen(false);
                          }}
                        >
                          <CompetitorAvatar url={c.url} name={c.name} className={styles.compAvatar} />
                          <span className={styles.compMenuName}>{c.name}</span>
                          {c.id === selected?.id ? (
                            <span className={styles.compMenuCheck} aria-hidden="true">
                              &#10003;
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className={styles.compRow}>
                  <CompetitorAvatar url={selected!.url} name={selected!.name} className={styles.compAvatar} />
                  <span className={styles.compName}>{selected!.name}</span>
                </div>
              )}
            </div>

            {!atLimit ? (
              <>
                <div className={styles.field}>
                  <span className={styles.flabel}>Page URL</span>
                  <div className={gated ? styles.fldDisabled : urlError ? styles.fldErr : styles.fld}>
                    <input
                      className={styles.urlInput}
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="competitor.com/pricing"
                      inputMode="url"
                      disabled={gated}
                      autoFocus={!isPicker}
                    />
                    {!gated && trimmed ? (
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
                  {gated ? (
                    <div className={styles.gateHint}>Select a competitor first.</div>
                  ) : urlError ? (
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

                <div className={styles.fieldLast}>
                  <span className={styles.flabel}>Page type</span>
                  <div className={styles.pills}>
                    {PAGE_TYPE_VALUES.map((t) => (
                      <button
                        type="button"
                        key={t}
                        className={gated ? styles.pillDisabled : t === pickedType ? styles.pillOn : styles.pill}
                        onClick={() => setPickedType(t)}
                        aria-pressed={!gated && t === pickedType}
                        disabled={gated}
                      >
                        {!gated && t === pickedType ? (
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
                    {selected!.name} is at {selected!.currentCount} of {pagesPerCompetitor} page
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
                    <UpgradeCta />
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
                {selected
                  ? `${planLabel} · will be ${selected.currentCount + 1} of ${pagesPerCompetitor}`
                  : `${planLabel} · pick a competitor first`}
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
