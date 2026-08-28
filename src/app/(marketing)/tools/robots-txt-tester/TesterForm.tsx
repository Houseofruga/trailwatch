"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { testRobotsAction, type TesterState } from "./actions";
import { USER_AGENTS } from "./content";
import styles from "./page.module.css";

type ResultData = NonNullable<Extract<TesterState, { status: "ok" }>>["result"];

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
              aria-label="URL to test against robots.txt"
              required
            />
            <button type="submit" className={styles.submit} disabled={pending}>
              {pending ? "Testing…" : "Test URL"}
            </button>
          </div>

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
        <div className={styles.robotsBlock}>
          <div className={styles.robotsHead}>{robotsUrl}</div>
          <pre className={styles.robotsPre}>{robotsText}</pre>
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
