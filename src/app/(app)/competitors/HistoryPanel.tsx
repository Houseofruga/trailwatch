"use client";

import { useState } from "react";
import Link from "next/link";
import { loadPageHistory } from "@/features/backfill/actions";
import { formatFullDate } from "@/app/(app)/dashboard/dashboardFeed";
import type { PageHistoryState } from "@/features/backfill/types";
import styles from "./page.module.css";

/**
 * Phase 2 day-0 value: a collapsible "Recent history" timeline of changes
 * reconstructed from the Wayback Machine, shown under each page beside the
 * baseline. Collapsed by default and loaded on first expand — backfill is the
 * heavy path (archive fetches + summaries), so it should never fire for every
 * page on page load. Cached server-side, so re-expanding is instant.
 */
export function HistoryPanel({ pageId }: { pageId: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PageHistoryState | null>(null);
  const [loading, setLoading] = useState(false);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && state === null && !loading) {
      setLoading(true);
      loadPageHistory(pageId)
        .then((result) => setState(result))
        .catch(() => setState({ status: "unavailable" }))
        .finally(() => setLoading(false));
    }
  }

  const count = state?.status === "ready" ? state.items.length : null;

  return (
    <div className={styles.history}>
      <button
        type="button"
        className={styles.historyToggle}
        onClick={toggle}
        aria-expanded={open}
      >
        <span className={styles.historyChevron} data-open={open}>
          &#8250;
        </span>
        Recent history
        {count !== null ? <span className={styles.historyCount}>{count}</span> : null}
      </button>

      {open ? (
        <div className={styles.historyBody}>
          {loading || state === null ? (
            <div className={styles.historySkeleton} aria-busy="true">
              <span className={styles.skelLine} style={{ width: "70%" }} />
              <span className={styles.skelLine} style={{ width: "84%" }} />
            </div>
          ) : state.status === "ready" ? (
            <ul className={styles.historyList}>
              {state.items.map((item) => (
                <li key={item.id} className={styles.historyItem}>
                  <span className={styles.historyDate}>{formatFullDate(item.detectedAt)}</span>
                  <Link href={`/changes/${item.id}`} className={styles.historyLink}>
                    {item.summary}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.historyNote}>
              {state.status === "empty"
                ? "No archived history for this page yet — we’ll track changes from here."
                : "Couldn’t load history right now."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
