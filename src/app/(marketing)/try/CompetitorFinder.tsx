"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { findCompetitorsAction, type FinderState } from "./actions";
import type { Competitor, FinderResult } from "@/features/competitorFinder/types";
import styles from "./try.module.css";

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

  // Seed the editable list from a suggestion result, re-seeding whenever a new
  // lookup lands. Setting state during render (guarded on the result identity) is
  // the React-sanctioned way to reset state when derived-from input changes.
  const [seeded, setSeeded] = useState<FinderResult | null>(null);
  if (state?.status === "ok" && state.result !== seeded) {
    setSeeded(state.result);
    setList(state.result.competitors);
  }

  const showEditor = state !== null; // after the first lookup (ok or error)
  const errored = state?.status === "error";

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

  return (
    <div className={styles.finder}>
      <form action={formAction} className={styles.finderForm}>
        <label htmlFor="company" className={styles.finderLabel}>
          Your company (name or website)
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
            required
          />
          <button type="submit" className={styles.finderSubmit} disabled={pending}>
            {pending ? "Finding…" : "Find competitors"}
          </button>
        </div>
        <p className={styles.finderHint}>
          {pending
            ? "Reading your site and finding who to watch — a few seconds."
            : "We’ll suggest competitors to track — edit them before you start."}
        </p>
      </form>

      {showEditor && (
        <div className={styles.finderResult}>
          <div className={styles.finderResultHead}>
            <span className={styles.finderResultTitle}>
              {errored ? "Add your competitors" : "Suggested — edit before you start"}
            </span>
            {!errored && list.length > 0 && (
              <span className={styles.finderBadge}>AI-suggested</span>
            )}
          </div>

          {errored && <p className={styles.finderError}>{state.message}</p>}

          {list.length > 0 ? (
            <ul className={styles.compList}>
              {list.map((c, i) => (
                <li key={`${c.name}-${i}`} className={styles.compRow}>
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
          ) : (
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

          <Link href={SIGNUP_HREF} className={styles.finderCta}>
            {list.length > 0
              ? `Start free — watch ${list.length} competitor${list.length > 1 ? "s" : ""}`
              : "Start free — no card required"}
          </Link>
        </div>
      )}
    </div>
  );
}
