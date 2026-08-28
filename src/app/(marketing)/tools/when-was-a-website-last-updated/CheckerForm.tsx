"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { checkLastUpdated, type CheckState } from "./actions";
import styles from "./page.module.css";

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

export function CheckerForm() {
  const [state, formAction, pending] = useActionState<CheckState, FormData>(
    checkLastUpdated,
    null,
  );
  const [startOver, setStartOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // A successful check replaces the form with the result; the form only shows
  // while there's no result to display (initial load, an error, or after the
  // user chose to start over).
  const showResult = state?.status === "ok" && !startOver;
  const showError = state?.status === "error" && !startOver;

  // When the form reappears after a result, drop focus into the input.
  useEffect(() => {
    if (!showResult) inputRef.current?.focus();
  }, [showResult]);

  function checkAnother() {
    setStartOver(true);
  }

  return (
    <div className={styles.tool}>
      {showResult ? (
        <Results
          result={(state as { result: ResultData }).result}
          onCheckAnother={checkAnother}
        />
      ) : (
        <form
          action={formAction}
          onSubmit={() => setStartOver(false)}
          className={styles.formCard}
        >
          <label htmlFor="url" className={styles.fieldLabel}>
            Page URL
          </label>
          <div className={styles.formRow}>
            <input
              ref={inputRef}
              id="url"
              type="text"
              name="url"
              inputMode="url"
              autoComplete="off"
              placeholder="example.com/pricing"
              className={styles.input}
              aria-label="Page URL to check"
              required
            />
            <button type="submit" className={styles.submit} disabled={pending}>
              {pending ? "Checking…" : "Check page"}
            </button>
          </div>
          <p className={styles.hint}>
            Works on any public page. We only read public content and respect robots.txt.
          </p>

          {showError && (
            <p className={styles.error} role="alert">
              {(state as { message: string }).message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

type ResultData = NonNullable<Extract<CheckState, { status: "ok" }>>["result"];

function Results({
  result,
  onCheckAnother,
}: {
  result: ResultData;
  onCheckAnother: () => void;
}) {
  const { bestGuess, signals, finalUrl } = result;

  return (
    <div className={styles.results}>
      <div className={styles.resultsUrl}>{finalUrl}</div>

      {bestGuess ? (
        <div className={styles.headline}>
          <div className={styles.headlineLabel}>Best estimate of last update</div>
          <div className={styles.headlineDate}>{bestGuess.human}</div>
          <div className={styles.headlineMeta}>
            from {bestGuess.source} · {CONFIDENCE_LABEL[bestGuess.confidence]}
          </div>
        </div>
      ) : (
        <div className={styles.noDate}>
          <div className={styles.noDateTitle}>No reliable last-updated date found</div>
          <p className={styles.noDateBody}>
            This page doesn&rsquo;t expose a trustworthy modified date — common for
            dynamic or app-rendered pages. See the guide below for how to confirm
            changes another way, like the Wayback Machine.
          </p>
        </div>
      )}

      {signals.length > 0 && (
        <div className={styles.signals}>
          <div className={styles.signalsHead}>All signals found</div>
          <ul className={styles.signalList}>
            {signals.map((s) => (
              <li key={`${s.source}-${s.iso}`} className={styles.signalRow}>
                <span className={styles.signalSource}>{s.source}</span>
                <span className={styles.signalDate}>{s.human}</span>
                <span className={`${styles.badge} ${styles[s.confidence]}`}>
                  {CONFIDENCE_LABEL[s.confidence]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Contextual conversion panel — they've just seen the value of a one-off
          check; TrailWatch is the automated version. */}
      <div className={styles.convert}>
        <div className={styles.convertHeading}>Don&rsquo;t check by hand again</div>
        <p className={styles.convertBody}>
          You just checked one page, once. TrailWatch watches your competitors&rsquo;
          pages for you — every day — and emails one plain-English digest a week when
          something actually changes. Free plan, no card required.
        </p>
        <div className={styles.convertActions}>
          <Link href="/login?mode=signup" className={styles.btnPrimary}>
            Start free — no card required
          </Link>
          <button type="button" onClick={onCheckAnother} className={styles.btnSecondary}>
            Check another URL
          </button>
        </div>
      </div>
    </div>
  );
}
