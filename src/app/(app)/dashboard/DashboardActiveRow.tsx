"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { timeAgo } from "./dashboardFeed";
import styles from "./page.module.css";

type Change = { id: string; summary: string | null; detectedAt: string };

const FALLBACK = "Meaningful change detected (summary unavailable).";

function Chevron() {
  return (
    <svg width="7" height="12" viewBox="0 0 7 12" fill="none" aria-hidden="true">
      <path d="M1 1l4.5 5L1 11" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// One dashboard page row for an "active" page (a meaningful change this week).
// A single change renders exactly as before — the whole row links to its detail.
// When a page had several this week, the newest stays the headline and a subtle
// toggle reveals the rest, each linking to its own detail, so the row matches
// the "N changes this week" count instead of hiding all but the latest.
export function DashboardActiveRow({ changes, label, now }: { changes: Change[]; label: string; now: number }) {
  const [open, setOpen] = useState(false);
  const listId = useId();

  const [newest, ...rest] = changes;

  if (rest.length === 0) {
    return (
      <Link href={`/changes/${newest.id}`} className={styles.pageRowLink}>
        <div className={styles.pageMeta}>
          <div className={styles.pageLabel}>{label}</div>
        </div>
        <div className={styles.pageChange}>
          <span className={styles.pageSummary}>{newest.summary ?? FALLBACK}</span>
          <div className={styles.pageChangeMeta}>{timeAgo(newest.detectedAt, now)}</div>
        </div>
        <span className={styles.arrowBox} aria-hidden="true">
          <Chevron />
        </span>
      </Link>
    );
  }

  return (
    <div className={styles.pageRow}>
      <div className={styles.pageMeta}>
        <div className={styles.pageLabel}>{label}</div>
      </div>
      <div className={styles.pageChange}>
        <Link href={`/changes/${newest.id}`} className={styles.pageSummaryLink}>
          {newest.summary ?? FALLBACK}
        </Link>
        <div className={styles.pageChangeMeta}>{timeAgo(newest.detectedAt, now)}</div>

        <button
          type="button"
          className={`${styles.moreToggle} ${open ? styles.moreToggleOpen : ""}`}
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={styles.moreChevron}>
            <Chevron />
          </span>
          {open ? "Show less" : `+${rest.length} more this week`}
        </button>

        {open ? (
          <ul id={listId} className={styles.changeSubList}>
            {rest.map((c) => (
              <li key={c.id}>
                <Link href={`/changes/${c.id}`} className={styles.changeSubRow}>
                  <span className={styles.changeSubSummary}>{c.summary ?? FALLBACK}</span>
                  <span className={styles.pageChangeMeta}>{timeAgo(c.detectedAt, now)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <Link href={`/changes/${newest.id}`} className={styles.arrowBox} aria-label="Open latest change">
        <Chevron />
      </Link>
    </div>
  );
}
