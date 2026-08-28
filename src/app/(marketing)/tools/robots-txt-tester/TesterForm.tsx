"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { testRobotsAction, type TesterState } from "./actions";
import { USER_AGENTS } from "./content";
import styles from "./page.module.css";

type ResultData = NonNullable<Extract<TesterState, { status: "ok" }>>["result"];

/** Line-style eye icon matching the app's inline SVG icons (16px, currentColor). */
function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1.5 8S3.8 3.5 8 3.5 14.5 8 14.5 8 12.2 12.5 8 12.5 1.5 8 1.5 8Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="8" cy="8" r="1.9" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function TesterForm() {
  const [state, formAction, pending] = useActionState<TesterState, FormData>(
    testRobotsAction,
    null,
  );
  const [startOver, setStartOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const showResult = state?.status === "ok" && !startOver;
  const showError = state?.status === "error" && !startOver;

  useEffect(() => {
    if (!showResult) inputRef.current?.focus();
  }, [showResult]);

  return (
    <div className={styles.tool}>
      {showResult ? (
        <Results
          result={(state as { result: ResultData }).result}
          onCheckAnother={() => setStartOver(true)}
        />
      ) : (
        <form
          action={formAction}
          onSubmit={() => setStartOver(false)}
          className={styles.formCard}
        >
          <label htmlFor="url" className={styles.fieldLabel}>
            URL to test
          </label>
          <input
            ref={inputRef}
            id="url"
            type="text"
            name="url"
            inputMode="url"
            autoComplete="off"
            placeholder="example.com/pricing"
            className={styles.input}
            aria-label="URL to test against robots.txt"
            required
          />

          <label htmlFor="userAgent" className={styles.fieldLabelInline}>
            Test as
          </label>
          <select id="userAgent" name="userAgent" className={styles.select} defaultValue="Googlebot">
            {USER_AGENTS.map((ua) => (
              <option key={ua.value} value={ua.value}>
                {ua.label}
              </option>
            ))}
          </select>

          <button type="submit" className={styles.submit} disabled={pending}>
            {pending ? "Testing…" : "Test URL"}
          </button>

          <p className={styles.hint}>
            We fetch the site&rsquo;s robots.txt and apply Google&rsquo;s matching rules.
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

function Results({ result, onCheckAnother }: { result: ResultData; onCheckAnother: () => void }) {
  const { allowed, matched, robotsFound, robotsText, robotsUrl, testedUrl, userAgent, groupAgent } = result;
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // lock background scroll while open
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  return (
    <div className={styles.results}>
      <div className={styles.verdict}>
        <div className={`${styles.verdictBadge} ${allowed ? styles.allowed : styles.blocked}`}>
          {allowed ? "Allowed" : "Blocked"}
        </div>
        <div className={styles.verdictText}>
          <strong>{userAgent}</strong> {allowed ? "can crawl" : "cannot crawl"} this URL
        </div>
        <div className={styles.verdictUrl}>{testedUrl}</div>
      </div>

      <div className={styles.reason}>
        <div className={styles.reasonText}>
          {!robotsFound ? (
            <>No robots.txt was found at {robotsUrl} — so crawling is allowed by default.</>
          ) : matched ? (
            <>
              Decided by{" "}
              <code className={styles.rule}>
                {matched.type === "allow" ? "Allow" : "Disallow"}: {matched.path || "(empty)"}
              </code>{" "}
              under <code className={styles.rule}>User-agent: {groupAgent}</code>.
            </>
          ) : (
            <>No rule in the applicable group matches this path — allowed by default.</>
          )}
        </div>
        {robotsFound && (
          <button type="button" className={styles.viewBtn} onClick={() => setModalOpen(true)}>
            <EyeIcon />
            View robots.txt file
          </button>
        )}
      </div>

      {modalOpen && robotsFound && (
        <div className={styles.modalOverlay} role="presentation" onClick={() => setModalOpen(false)}>
          <div
            className={styles.modalPanel}
            role="dialog"
            aria-modal="true"
            aria-label="robots.txt file"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHead}>
              <span className={styles.modalTitle}>{robotsUrl}</span>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <pre className={styles.modalPre}>{robotsText}</pre>
          </div>
        </div>
      )}

      <div className={styles.convert}>
        <div className={styles.convertHeading}>Watch what competitors change</div>
        <p className={styles.convertBody}>
          robots.txt is one snapshot. TrailWatch watches competitor pages for you — every
          day — and emails one plain-English digest a week when something actually changes.
          Free plan, no card required.
        </p>
        <div className={styles.convertActions}>
          <Link href="/login?mode=signup" className={styles.btnPrimary}>
            Start free — no card required
          </Link>
          <button type="button" onClick={onCheckAnother} className={styles.btnSecondary}>
            Test another URL
          </button>
        </div>
      </div>
    </div>
  );
}
