"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { teardownAction, type TeardownState } from "./actions";
import styles from "./page.module.css";

type ResultData = NonNullable<Extract<TeardownState, { status: "ok" }>>["result"];

export function TeardownForm() {
  const [state, formAction, pending] = useActionState<TeardownState, FormData>(
    teardownAction,
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
            Competitor URL
          </label>
          <div className={styles.formRow}>
            <input
              ref={inputRef}
              id="url"
              type="text"
              name="url"
              inputMode="url"
              autoComplete="off"
              placeholder="competitor.com"
              className={styles.input}
              aria-label="Competitor website URL to tear down"
              required
            />
            <button type="submit" className={styles.submit} disabled={pending}>
              {pending ? "Analyzing…" : "Run teardown"}
            </button>
          </div>
          <p className={styles.hint}>
            {pending
              ? "Fetching their public pages and summarizing — this takes a few seconds."
              : "We read their public homepage and pricing page. Public sites only."}
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
  const { url, title, positioning, pricingTiers, whatToWatch, provider } = result;

  return (
    <div className={styles.results}>
      <div className={styles.resultsHead}>
        <div>
          <div className={styles.resultsTitle}>{title || "Competitor teardown"}</div>
          <a href={url} target="_blank" rel="noopener noreferrer" className={styles.resultsUrl}>
            {url}
          </a>
        </div>
        <span className={styles.badge}>AI teardown</span>
      </div>

      <section className={styles.block}>
        <h3 className={styles.blockLabel}>Positioning</h3>
        <p className={styles.blockBody}>{positioning}</p>
      </section>

      <section className={styles.block}>
        <h3 className={styles.blockLabel}>Pricing</h3>
        {pricingTiers && pricingTiers.length > 0 ? (
          <ul className={styles.tierList}>
            {pricingTiers.map((tier, i) => (
              <li key={`${tier.name}-${i}`} className={styles.tierRow}>
                <span className={styles.tierName}>{tier.name}</span>
                <span className={styles.tierPrice}>{tier.price}</span>
                {tier.notes && <span className={styles.tierNotes}>{tier.notes}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.blockBody}>
            No public pricing found — they may hide it behind “contact sales” or load it with
            JavaScript we can’t read.
          </p>
        )}
      </section>

      <section className={styles.block}>
        <h3 className={styles.blockLabel}>What to watch</h3>
        <ul className={styles.watchList}>
          {whatToWatch.map((item, i) => (
            <li key={i} className={styles.watchItem}>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <div className={styles.convert}>
        <div className={styles.convertHeading}>Want this every Monday — automatically?</div>
        <p className={styles.convertBody}>
          This is a one-time snapshot. TrailWatch watches the competitor pages you choose —
          every day — filters out trivial edits, and emails one plain-English digest a week on
          what actually changed. Free plan, no card required.
        </p>
        <div className={styles.convertActions}>
          <Link href="/login?mode=signup&src=teardown" className={styles.btnPrimary}>
            Start free — no card required
          </Link>
          <button type="button" onClick={onCheckAnother} className={styles.btnSecondary}>
            Tear down another
          </button>
        </div>
      </div>

      <p className={styles.provenance} aria-hidden="true">
        Generated by {provider === "groq" ? "an open model" : "Claude"} from public pages.
      </p>
    </div>
  );
}
