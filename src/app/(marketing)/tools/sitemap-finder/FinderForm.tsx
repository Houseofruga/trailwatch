"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { findSitemapsAction, type FinderState } from "./actions";
import styles from "./page.module.css";

type ResultData = NonNullable<Extract<FinderState, { status: "ok" }>>["result"];

const plural = (n: number, one: string, many = one + "s") => (n === 1 ? one : many);
const fmt = (n: number) => n.toLocaleString("en-US");

export function FinderForm() {
  const [state, formAction, pending] = useActionState<FinderState, FormData>(
    findSitemapsAction,
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
            Website URL
          </label>
          <div className={styles.formRow}>
            <input
              ref={inputRef}
              id="url"
              type="text"
              name="url"
              inputMode="url"
              autoComplete="off"
              placeholder="example.com"
              className={styles.input}
              aria-label="Website URL to find sitemaps for"
              required
            />
            <button type="submit" className={styles.submit} disabled={pending}>
              {pending ? "Finding…" : "Find sitemaps"}
            </button>
          </div>
          <p className={styles.hint}>
            We check robots.txt and the common sitemap paths. Public sites only.
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
  const { base, sitemaps, totalUrls, totalSitemapFiles, declaredInRobots, truncated } = result;
  const [copied, setCopied] = useState(false);
  const found = totalSitemapFiles > 0;

  function copyUrls() {
    const list = sitemaps.filter((s) => s.ok).map((s) => s.url).join("\n");
    navigator.clipboard?.writeText(list).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }

  return (
    <div className={styles.results}>
      <div className={styles.resultsHead}>
        <div>
          <div className={styles.resultsTitle}>
            {found ? "Sitemap analysis complete" : "No sitemaps found"}
          </div>
          <div className={styles.resultsUrl}>{base}</div>
          {found ? (
            <div className={styles.resultsSummary}>
              Found {fmt(totalSitemapFiles)} {plural(totalSitemapFiles, "sitemap")} with{" "}
              {fmt(totalUrls)} total {plural(totalUrls, "URL")}
              {declaredInRobots ? " · declared in robots.txt" : " · via common paths"}
            </div>
          ) : (
            <div className={styles.resultsSummary}>
              No sitemap was declared in robots.txt or found at the common paths. See the
              guide below for other ways to check.
            </div>
          )}
        </div>
        {found && (
          <button type="button" onClick={copyUrls} className={styles.copyBtn}>
            {copied ? "Copied ✓" : "Copy sitemap URLs"}
          </button>
        )}
      </div>

      {sitemaps.length > 0 && (
        <ul className={styles.sitemapList}>
          {sitemaps.map((s) => (
            <li key={s.url} className={styles.sitemapRow}>
              <span className={`${styles.kind} ${s.ok ? styles[s.kind] : styles.bad}`}>
                {!s.ok ? "Error" : s.kind === "index" ? "Index" : "URLs"}
              </span>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className={styles.sitemapUrl}>
                {s.url}
              </a>
              <span className={styles.sitemapMeta}>
                {s.ok
                  ? s.kind === "index"
                    ? `${fmt(s.entryCount)} ${plural(s.entryCount, "sitemap")}`
                    : `${fmt(s.entryCount)} ${plural(s.entryCount, "URL")}`
                  : s.error}
              </span>
            </li>
          ))}
        </ul>
      )}

      {truncated && (
        <p className={styles.note}>
          This site has a large sitemap index — we counted the first batch of child
          sitemaps. The real total is higher.
        </p>
      )}

      <div className={styles.convert}>
        <div className={styles.convertHeading}>Found their pages? Track the ones that matter.</div>
        <p className={styles.convertBody}>
          A sitemap is a snapshot. TrailWatch watches the competitor pages you choose —
          every day — and emails one plain-English digest a week when something actually
          changes. Free plan, no card required.
        </p>
        <div className={styles.convertActions}>
          <Link href="/login?mode=signup" className={styles.btnPrimary}>
            Start free — no card required
          </Link>
          <button type="button" onClick={onCheckAnother} className={styles.btnSecondary}>
            Check another site
          </button>
        </div>
      </div>
    </div>
  );
}
