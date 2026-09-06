"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadPageInsight } from "@/features/insights/actions";
import type { PageInsightState } from "@/features/insights/types";
import styles from "./page.module.css";

/**
 * The quiet-page value card on the adaptive dashboard. When a watched page has no
 * meaningful change this week, we don't say "nothing happened" — we show the
 * cached Phase-1 baseline (positioning + a few pricing chips) so the low-noise
 * dashboard still carries value. Reuses `loadPageInsight` (cached server-side, one
 * LLM call per page, no re-fetch), mirroring the Competitors page's BaselinePanel
 * but in a tighter, row-embedded form.
 *
 * `lastNotable`, when present, is the most recent archive-backfilled change — a
 * cheap read the dashboard already has; we only ever LINK to it, never trigger a
 * backfill here.
 */
export function DashboardBaseline({
  pageId,
  lastNotable,
}: {
  pageId: string;
  lastNotable?: { id: string; label: string } | null;
}) {
  const [state, setState] = useState<PageInsightState | null>(null);

  useEffect(() => {
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

  const notableLine = lastNotable ? (
    <Link href={`/changes/${lastNotable.id}`} className={styles.quietNotable}>
      Last notable change &middot; {lastNotable.label}
    </Link>
  ) : null;

  // Loading: a light one-line skeleton so the row doesn't jump.
  if (state === null) {
    return (
      <div className={styles.quietCard} aria-busy="true">
        <span className={styles.skelLine} style={{ width: "70%" }} />
        {notableLine}
      </div>
    );
  }

  // No baseline to show — fall back to the notable line alone, or a plain note.
  if (state.status !== "ready") {
    return (
      <div className={styles.quietCard}>
        {notableLine ?? <span className={styles.quietPlain}>No meaningful changes yet</span>}
      </div>
    );
  }

  const { profile } = state;

  return (
    <div className={styles.quietCard}>
      {profile.positioning ? (
        <p className={styles.quietPositioning}>{profile.positioning}</p>
      ) : null}

      {profile.pricingTiers && profile.pricingTiers.length > 0 ? (
        <div className={styles.quietTiers}>
          {profile.pricingTiers.slice(0, 4).map((tier, i) => (
            <span key={`${tier.name}-${i}`} className={styles.quietTier}>
              <span className={styles.quietTierName}>{tier.name}</span>
              <span className={styles.quietTierPrice}>{tier.price}</span>
            </span>
          ))}
        </div>
      ) : null}

      {notableLine}
    </div>
  );
}
