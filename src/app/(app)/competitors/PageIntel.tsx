"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadPageInsight } from "@/features/insights/actions";
import { loadPageHistory } from "@/features/backfill/actions";
import type { PageInsightState } from "@/features/insights/types";
import type { PageHistoryState } from "@/features/backfill/types";
import { formatFullDate } from "@/app/(app)/dashboard/dashboardFeed";
import styles from "./page.module.css";

/**
 * The per-page intelligence panels (v3 design): two pills under a page row —
 * "What we're now watching" (Phase-1 baseline) and "Recent history" (Phase-2
 * Wayback backfill) — only one open at a time, each expanding a panel below.
 *
 * Baseline is loaded on mount (cached) to distinguish "capturing" (no snapshot
 * yet) from "ready"; history is loaded lazily on first expand (backfill is the
 * heavy path). Both degrade quietly.
 */
type Which = "baseline" | "history";

export function PageIntel({ pageId }: { pageId: string }) {
  const [insight, setInsight] = useState<PageInsightState | null>(null);
  const [open, setOpen] = useState<Which | null>(null);
  const [history, setHistory] = useState<PageHistoryState | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    let live = true;
    loadPageInsight(pageId)
      .then((r) => live && setInsight(r))
      .catch(() => live && setInsight({ status: "unavailable" }));
    return () => {
      live = false;
    };
  }, [pageId]);

  function loadHistory() {
    setHistoryLoading(true);
    loadPageHistory(pageId)
      .then(setHistory)
      .catch(() => setHistory({ status: "unavailable" }))
      .finally(() => setHistoryLoading(false));
  }

  function toggle(which: Which) {
    setOpen((cur) => (cur === which ? null : which));
    if (which === "history" && history === null && !historyLoading) loadHistory();
  }

  // Still determining baseline state — a quiet placeholder so the row doesn't jump.
  if (insight === null) {
    return (
      <div className={styles.intel}>
        <div className={styles.intelPills}>
          <span className={`${styles.pill} ${styles.pillSkel}`} />
          <span className={`${styles.pill} ${styles.pillSkel}`} />
        </div>
      </div>
    );
  }

  // No baseline snapshot yet — first check hasn't captured text.
  if (insight.status === "pending") {
    return (
      <div className={styles.intel}>
        <div className={styles.capturing}>
          <span className={styles.spinner} aria-hidden="true" />
          We&rsquo;ll profile this page as soon as we&rsquo;ve captured it
        </div>
      </div>
    );
  }

  // No provider / not owned / error — stay out of the way.
  if (insight.status !== "ready") return null;

  const profile = insight.profile;
  const historyCount = history?.status === "ready" ? history.items.length : null;

  return (
    <div className={styles.intel}>
      <div className={styles.intelPills}>
        <button
          type="button"
          className={open === "baseline" ? `${styles.pill} ${styles.pillOpen}` : styles.pill}
          onClick={() => toggle("baseline")}
          aria-expanded={open === "baseline"}
        >
          <span>What we&rsquo;re now watching</span>
          <span className={styles.pillChevron} data-open={open === "baseline"}>
            <svg width="9" height="6" viewBox="0 0 9 6" fill="none" aria-hidden="true">
              <path d="M1 1l3.5 3.5L8 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        <button
          type="button"
          className={open === "history" ? `${styles.pill} ${styles.pillOpen}` : styles.pill}
          onClick={() => toggle("history")}
          aria-expanded={open === "history"}
        >
          <span>Recent history</span>
          {historyCount !== null && historyCount > 0 ? (
            <span className={styles.pillCount}>{historyCount}</span>
          ) : null}
          <span className={styles.pillChevron} data-open={open === "history"}>
            <svg width="9" height="6" viewBox="0 0 9 6" fill="none" aria-hidden="true">
              <path d="M1 1l3.5 3.5L8 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>

      {open === "baseline" ? (
        <div className={styles.intelPanel}>
          {profile.summary ? <p className={styles.positioning}>{profile.summary}</p> : null}

          {profile.pricingTiers && profile.pricingTiers.length > 0 ? (
            <>
              <div className={styles.panelLabel}>Pricing tiers</div>
              <div className={styles.tierList}>
                {profile.pricingTiers.map((tier, i) => (
                  <div key={`${tier.name}-${i}`} className={styles.tierRow}>
                    <span className={styles.tierName}>{tier.name}</span>
                    <span className={styles.tierPrice}>{tier.price}</span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div className={styles.panelFoot}>Captured now &mdash; you&rsquo;ll get an email when this changes.</div>
        </div>
      ) : null}

      {open === "history" ? (
        <div className={styles.intelPanel}>
          {historyLoading || history === null ? (
            <div className={styles.historySkeleton} aria-busy="true">
              <span className={styles.skelLine} style={{ width: "40%" }} />
              <span className={styles.skelLine} style={{ width: "80%" }} />
            </div>
          ) : history.status === "ready" ? (
            <>
              <div className={styles.histNote}>Recent changes, newest first.</div>
              <div className={styles.timeline}>
                {history.items.map((item) => (
                  <Link key={item.id} href={`/changes/${item.id}`} className={styles.timeItem}>
                    <span className={styles.timeMarker} aria-hidden="true">
                      <span className={styles.timeDot} />
                      <span className={styles.timeLine} />
                    </span>
                    <span className={styles.timeBody}>
                      <span className={styles.timeDate}>
                        {formatFullDate(item.detectedAt)}
                        {item.isArchive ? <span className={styles.timeArchiveTag}>Web archive</span> : null}
                      </span>
                      <span className={styles.timeSummary}>{item.summary}</span>
                      <span className={styles.timeLink}>
                        View change
                        <svg width="6" height="9" viewBox="0 0 6 9" fill="none" aria-hidden="true">
                          <path d="M1 1l3.5 3.5L1 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            </>
          ) : history.status === "empty" ? (
            <div className={styles.histNoteMuted}>
              No archived history for this page yet &mdash; we&rsquo;ll track changes from here.
            </div>
          ) : (
            <div className={styles.histError}>
              <span>Couldn&rsquo;t load history right now.</span>
              <button
                type="button"
                className={styles.histRetry}
                onClick={() => {
                  setHistory(null);
                  loadHistory();
                }}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
