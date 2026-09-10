"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadPageInsight } from "@/features/insights/actions";
import { loadPageHistory } from "@/features/backfill/actions";
import type { PageInsightState, PageProfile } from "@/features/insights/types";
import type { InitialHistory, PageHistoryState } from "@/features/backfill/types";
import { formatFullDate } from "@/app/(app)/dashboard/dashboardFeed";
import styles from "./page.module.css";

/**
 * The per-page intelligence panels (v3 design): two pills under a page row —
 * "What we're now watching" (Phase-1 baseline) and "Recent history" (Phase-2
 * Wayback backfill) — only one open at a time, each expanding a panel below.
 *
 * The baseline profile is hydrated from `initialProfile` when the server already
 * has it cached (the common case) — so revisiting the page renders instantly with
 * no skeleton flash or refetch. Only when it's absent do we fetch on mount, which
 * also generates it once and distinguishes "capturing" (no snapshot yet) from
 * "ready". Recent history works the same way, for live changes as well as
 * archived ones: `initialHistory` carries the page's stored change rows from the
 * server, so the pill shows its count and opens instantly on every visit with no
 * re-fetch. If the page has never been backfilled, the first expand still runs the
 * heavy Wayback reconstruction — but in the background, over the rows already
 * shown, rather than as a blocking load. Both degrade quietly.
 */
type Which = "baseline" | "history";

// Turn the server's stored rows into the panel's render state.
function seedHistory(initial: InitialHistory | null): PageHistoryState | null {
  if (!initial) return null;
  return initial.items.length > 0 ? { status: "ready", items: initial.items } : { status: "empty" };
}

export function PageIntel({
  pageId,
  flush = false,
  initialProfile = null,
  initialHistory = null,
}: {
  pageId: string;
  flush?: boolean;
  initialProfile?: PageProfile | null;
  initialHistory?: InitialHistory | null;
}) {
  const [insight, setInsight] = useState<PageInsightState | null>(
    initialProfile ? { status: "ready", profile: initialProfile } : null,
  );
  const [open, setOpen] = useState<Which | null>(null);
  const [history, setHistory] = useState<PageHistoryState | null>(() => seedHistory(initialHistory));
  // Blocking load: only when the server gave us nothing to show yet.
  const [historyLoading, setHistoryLoading] = useState(false);
  // Background enrichment: Wayback reconstruction over rows we already show.
  const [enriching, setEnriching] = useState(false);
  // Whether a first expand still needs to trigger the Wayback backfill. Already-
  // backfilled pages (and any lazy usage with no server data) never need it.
  const enrichDone = useRef(initialHistory ? initialHistory.backfilled : true);

  // The manage board indents the panels under the URL (`.intel`); the competitor
  // detail card gives them the card body's own padding (`.intelFlush`).
  const wrap = flush ? styles.intelFlush : styles.intel;

  useEffect(() => {
    // Server already handed us the cached profile — nothing to fetch or generate.
    if (initialProfile) return;
    let live = true;
    loadPageInsight(pageId)
      .then((r) => live && setInsight(r))
      .catch(() => live && setInsight({ status: "unavailable" }));
    return () => {
      live = false;
    };
  }, [pageId, initialProfile]);

  // First-ever expand with no server rows: a plain blocking load + backfill.
  function loadHistory() {
    setHistoryLoading(true);
    enrichDone.current = true;
    loadPageHistory(pageId)
      .then(setHistory)
      .catch(() => setHistory({ status: "unavailable" }))
      .finally(() => setHistoryLoading(false));
  }

  // First expand of a not-yet-backfilled page that already shows stored rows: run
  // the Wayback reconstruction quietly and fold the fuller result in when it lands
  // (keep the rows on failure — never blank out what we already had).
  function enrich() {
    setEnriching(true);
    enrichDone.current = true;
    loadPageHistory(pageId)
      .then((r) => {
        if (r.status === "ready") setHistory(r);
      })
      .catch(() => {})
      .finally(() => setEnriching(false));
  }

  function toggle(which: Which) {
    setOpen((cur) => (cur === which ? null : which));
    if (which !== "history") return;
    if (history === null && !historyLoading) loadHistory();
    else if (!enrichDone.current && !enriching) enrich();
  }

  // Still determining baseline state — a quiet placeholder so the row doesn't jump.
  if (insight === null) {
    return (
      <div className={wrap}>
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
      <div className={wrap}>
        <div className={styles.capturing}>
          <span className={styles.spinner} aria-hidden="true" />
          We&rsquo;ll profile this page as soon as we&rsquo;ve captured it
        </div>
      </div>
    );
  }

  // Captured, but the AI couldn't profile this page (declined, thin content, or a
  // transient error). Say so quietly instead of vanishing — a future edit or the
  // daily sweep will retry — so the row doesn't look broken after a URL change.
  if (insight.status === "unavailable") {
    return (
      <div className={wrap}>
        <div className={styles.capturing}>We couldn&rsquo;t profile this page yet — we&rsquo;ll try again.</div>
      </div>
    );
  }

  // Not owned / missing — stay out of the way.
  if (insight.status !== "ready") return null;

  const profile = insight.profile;
  const historyCount = history?.status === "ready" ? history.items.length : null;

  return (
    <div className={wrap}>
      <div className={styles.intelPills}>
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
          {history === null || historyLoading || (enriching && history.status === "empty") ? (
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
              {enriching ? (
                <div className={styles.histNoteMuted}>Checking the web archive for older history&hellip;</div>
              ) : null}
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
