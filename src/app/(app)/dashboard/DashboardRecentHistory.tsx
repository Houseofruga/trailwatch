"use client";

import { useState } from "react";
import Link from "next/link";
import { loadPageHistory } from "@/features/backfill/actions";
import type { PageHistoryState } from "@/features/backfill/types";
import { formatFullDate } from "./dashboardFeed";
import styles from "./page.module.css";

/**
 * The "See what changed before this week → Recent history" disclosure on a
 * dashboard row. Lazy-loads the page's reconstructed history on first open
 * (backfill is the heavy path) and shows a compact timeline. Degrades quietly.
 */
export function DashboardRecentHistory({ pageId }: { pageId: string }) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<PageHistoryState | null>(null);
  const [loading, setLoading] = useState(false);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && history === null && !loading) {
      setLoading(true);
      loadPageHistory(pageId)
        .then(setHistory)
        .catch(() => setHistory({ status: "unavailable" }))
        .finally(() => setLoading(false));
    }
  }

  return (
    <div className={styles.recentWrap}>
      <button type="button" className={styles.recentToggle} aria-expanded={open} onClick={toggle}>
        <span className={styles.recentLead}>See what changed before this week →</span>
        <span className={styles.recentLabel}>Recent history</span>
      </button>

      {open ? (
        <div className={styles.recentPanel}>
          {loading || history === null ? (
            <div className={styles.recentMuted}>Loading…</div>
          ) : history.status === "ready" ? (
            <div className={styles.recentList}>
              {history.items.map((item) => (
                <Link key={item.id} href={`/changes/${item.id}`} className={styles.recentItem}>
                  <span className={styles.recentDate}>
                    {formatFullDate(item.detectedAt)}
                    {item.isArchive ? <span className={styles.recentArchive}>Web archive</span> : null}
                  </span>
                  <span className={styles.recentSummary}>{item.summary}</span>
                </Link>
              ))}
            </div>
          ) : history.status === "empty" ? (
            <div className={styles.recentMuted}>No earlier changes on record for this page yet.</div>
          ) : (
            <div className={styles.recentMuted}>Couldn’t load history right now.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
