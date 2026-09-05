"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { findCompetitorsAction, type FinderState } from "./actions";
import { CompetitorAvatar } from "@/components/CompetitorAvatar";
import type { Competitor } from "@/features/competitorFinder/types";
import styles from "./home.module.css";

const SIGNUP_HREF = "/login?mode=signup&src=hero-finder";

/**
 * "Find your competitors" hero tool. Enter a company name or URL → we suggest a
 * few direct competitors (LLM, grounded on the site when a URL is given). The
 * list is editable — remove a wrong guess, add your own — and degrades to plain
 * manual entry when suggestions aren't available. It IS the product's onboarding
 * ("add your competitors"), so the CTA carries into signup.
 */
export function CompetitorFinder() {
  const [state, formAction, pending] = useActionState<FinderState, FormData>(
    findCompetitorsAction,
    null,
  );
  const [list, setList] = useState<Competitor[]>([]);
  const [addValue, setAddValue] = useState("");
  // Controlled company input so the search button only shows when there's a new
  // query to run (dirty) — no dead "Find competitors" button after a lookup.
  const [company, setCompany] = useState("");
  const [lastQuery, setLastQuery] = useState("");

  // Reset the editable list whenever a new lookup lands: replace it with the new
  // suggestions on success, or clear it on a failed lookup so a previous search's
  // results don't linger under the "no results" message. Guarded on state
  // identity (a fresh object per submission) — the React-sanctioned way to reset
  // state when derived-from input changes.
  const [processed, setProcessed] = useState<FinderState>(null);
  if (state !== processed) {
    setProcessed(state);
    if (state?.status === "ok") setList(state.result.competitors);
    else if (state?.status === "error") setList([]);
  }

  const showEditor = state !== null; // after the first lookup (ok or error)
  const errored = state?.status === "error";
  const rateLimited = state?.status === "error" && state.kind === "rate-limited";

  // Show "Find competitors" only when there's something new to search: a
  // non-empty query that differs from the last one, while searching, or after an
  // error (so they can retry). Hidden once results for the current query are in.
  const dirty = company.trim() !== "" && company.trim() !== lastQuery;
  const showFind = pending || dirty || errored;

  function removeAt(i: number) {
    setList((l) => l.filter((_, idx) => idx !== i));
  }
  function addManual() {
    const v = addValue.trim();
    if (!v) return;
    const isUrl = /\.[a-z]{2,}/i.test(v) && !/\s/.test(v);
    setList((l) => [...l, { name: v, url: isUrl ? v : "", why: "" }]);
    setAddValue("");
  }
  // Stash the chosen competitors so the new account can be pre-seeded after
  // signup (read on /welcome). localStorage survives the same-browser signup /
  // email-confirm / OAuth round-trip.
  function persistPending() {
    try {
      if (list.length > 0) {
        const payload = list.map(({ name, url }) => ({ name, url }));
        localStorage.setItem("tw_pending_competitors", JSON.stringify(payload));
      } else {
        localStorage.removeItem("tw_pending_competitors");
      }
    } catch {
      /* private mode / storage disabled — pre-seed just won't happen */
    }
  }

  return (
    <div className={styles.finder}>
      <form
        action={formAction}
        onSubmit={() => setLastQuery(company.trim())}
        className={styles.finderForm}
      >
        <label htmlFor="company" className={styles.finderLabel}>
          Your company website
        </label>
        <div className={styles.finderRow}>
          <input
            id="company"
            name="company"
            type="text"
            placeholder="yourcompany.com"
            className={styles.finderInput}
            autoComplete="off"
            aria-label="Your company name or website"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
          />
          {showFind && (
            <button type="submit" className={styles.finderSubmit} disabled={pending}>
              {pending ? "Finding…" : "Find competitors"}
            </button>
          )}
        </div>
        <p className={styles.finderHint}>
          {pending
            ? "Reading your site and finding who to watch — a few seconds."
            : "Your website gives the most accurate matches — a company name works too. You can edit the list before you start."}
        </p>
      </form>

      {/* Fixed-height zone so the card doesn't resize between the idle placeholder,
          the pending state, and the results. */}
      <div className={styles.resultZone}>
        {!showEditor ? (
          <div className={styles.emptyState}>
            {pending
              ? "Finding competitors…"
              : "Your competitors will appear here — suggested from your company, and yours to edit."}
          </div>
        ) : (
          <div className={styles.finderResult}>
            <div className={styles.finderResultHead}>
              <span className={styles.finderResultTitle}>
                {!errored
                  ? "Suggested competitors — review before you start"
                  : rateLimited
                    ? "Too many lookups"
                    : "No competitors found"}
              </span>
            </div>

            {!errored && (
              <p className={styles.finderResultNote}>
                Our best guesses — they may not be perfect. Remove any that don’t fit and
                add your own. Nothing’s saved until you sign up.
              </p>
            )}

            {errored && (
              <p className={styles.finderError}>
                {rateLimited ? state.message : "Add the ones you want to watch below."}
              </p>
            )}

            {list.length > 0 ? (
              <ul className={styles.compList}>
              {list.map((c, i) => (
                <li key={`${c.name}-${i}`} className={styles.compRow}>
                  <CompetitorAvatar url={c.url} name={c.name} className={styles.compFavicon} />
                  <div className={styles.compMain}>
                    <span className={styles.compName}>{c.name}</span>
                    {c.url && (
                      <span className={styles.compUrl}>
                        {c.url.replace(/^https?:\/\//, "")}
                      </span>
                    )}
                    {c.why && <span className={styles.compWhy}>{c.why}</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    className={styles.compRemove}
                    aria-label={`Remove ${c.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : errored ? null : (
            <p className={styles.compEmpty}>No competitors yet — add a few below.</p>
          )}

          <div className={styles.addRow}>
            <input
              type="text"
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addManual();
                }
              }}
              placeholder="Add a competitor (name or URL)"
              className={styles.addInput}
              aria-label="Add a competitor"
            />
            <button type="button" onClick={addManual} className={styles.addBtn}>
              Add
            </button>
          </div>

            <Link href={SIGNUP_HREF} onClick={persistPending} className={styles.finderCta}>
              {list.length > 0
                ? `Start free — watch ${list.length} competitor${list.length > 1 ? "s" : ""}`
                : "Start free — no card required"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
