"use client";

import { useEffect, useRef, useState } from "react";
import { loadPageInsight } from "@/features/insights/actions";
import type { PageInsightState } from "@/features/insights/types";
import styles from "./page.module.css";

/**
 * Day-0 value: under each watched page, show an instant AI "baseline profile"
 * (what we're now watching) generated from the snapshot captured on add. Loads
 * lazily on mount and is cached server-side, so a reload is instant and costs no
 * second LLM call. Quiet states (pending / unavailable / not-found) render
 * nothing so the row stays clean.
 */
export function BaselinePanel({ pageId }: { pageId: string }) {
  const [state, setState] = useState<PageInsightState | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    let live = true;
    loadPageInsight(pageId)
      .then((result) => {
        if (live) setState(result);
      })
      .catch(() => {
        if (live) setState({ status: "unavailable" });
      });
    return () => {
      live = false;
    };
  }, [pageId]);

  // Loading skeleton.
  if (state === null) {
    return (
      <div className={styles.baseline} aria-busy="true">
        <div className={styles.baselineHead}>What we&rsquo;re now watching</div>
        <div className={styles.baselineSkeleton}>
          <span className={styles.skelLine} style={{ width: "82%" }} />
          <span className={styles.skelLine} style={{ width: "64%" }} />
          <span className={styles.skelLine} style={{ width: "40%" }} />
        </div>
      </div>
    );
  }

  // Baseline not captured yet (rare — first check hasn't stored text).
  if (state.status === "pending") {
    return (
      <div className={styles.baseline}>
        <div className={styles.baselineHead}>What we&rsquo;re now watching</div>
        <p className={styles.baselineNote}>
          We&rsquo;ll profile this page right after its first check.
        </p>
      </div>
    );
  }

  // No provider / declined / not owned: stay out of the way.
  if (state.status !== "ready") return null;

  const { profile } = state;

  return (
    <div className={styles.baseline}>
      <div className={styles.baselineHead}>What we&rsquo;re now watching</div>

      {profile.positioning ? (
        <p className={styles.baselinePositioning}>{profile.positioning}</p>
      ) : null}

      {profile.pricingTiers && profile.pricingTiers.length > 0 ? (
        <div className={styles.baselineTiers}>
          {profile.pricingTiers.map((tier, i) => (
            <div key={`${tier.name}-${i}`} className={styles.baselineTier}>
              <span className={styles.tierName}>{tier.name}</span>
              <span className={styles.tierPrice}>{tier.price}</span>
            </div>
          ))}
        </div>
      ) : null}

      {profile.whatToWatch && profile.whatToWatch.length > 0 ? (
        <ul className={styles.baselineWatch}>
          {profile.whatToWatch.slice(0, 4).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      ) : null}

      <p className={styles.baselineFoot}>
        Captured now &mdash; you&rsquo;ll get an email when this changes.
      </p>
    </div>
  );
}
