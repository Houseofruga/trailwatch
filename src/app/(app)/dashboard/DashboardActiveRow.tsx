"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { timeAgo } from "./dashboardFeed";
import styles from "./page.module.css";

type Change = { id: string; summary: string | null; detectedAt: string };

const FALLBACK = "Meaningful change detected (summary unavailable).";

// Disclosure chevron — points down; rotated 180° (up) when expanded via CSS.
function ToggleChevron() {
  return (
    <svg width="9" height="6" viewBox="0 0 9 6" fill="none" aria-hidden="true" style={{ display: "block" }}>
      <path d="M1 1l3.5 3.5L8 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Small right chevron in the muted chip on each older change.
function SubChevron() {
  return (
    <svg width="6" height="9" viewBox="0 0 6 9" fill="none" aria-hidden="true" style={{ display: "block" }}>
      <path d="M1 1l3.5 3.5L1 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Crisp right arrow for the lime headline chip (a real stroke, not a text glyph).
function ArrowRight() {
  return (
    <svg width="15" height="12" viewBox="0 0 15 12" fill="none" aria-hidden="true" style={{ display: "block" }}>
      <path d="M1 6h11.4M8.8 2l4.2 4-4.2 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * One dashboard row for an "active" page (a meaningful change this week), built
 * to the "Dashboard Multi-Change Row" design. A single change is the ordinary v3
 * row. With several, the newest is the headline (green → chip) and a quiet
 * "N more this week" toggle reveals the week's other changes as a lighter
 * sub-list, each linking to its own detail. All this week's changes are shown
 * when expanded.
 *
 * Layout: [label] [body]. The body's top line holds the headline + chip; the
 * toggle and sub-list sit below it. On mobile the label drops to its own line
 * (see the media query) and the chip stays beside the headline.
 */
export function DashboardActiveRow({ changes, label, now }: { changes: Change[]; label: string; now: number }) {
  const [open, setOpen] = useState(false);
  const listId = useId();

  const [newest, ...rest] = changes;

  const meta = (
    <div className={styles.pageMeta}>
      <div className={styles.pageLabel}>{label}</div>
    </div>
  );

  // Single change — the whole row is one link (unchanged v3 behaviour).
  if (rest.length === 0) {
    return (
      <Link href={`/changes/${newest.id}`} className={styles.activeRow}>
        {meta}
        <div className={styles.activeBody}>
          <div className={styles.activeTop}>
            <div className={styles.activeContent}>
              <div className={styles.activeHeadline}>{newest.summary ?? FALLBACK}</div>
              <div className={styles.activeTime}>{timeAgo(newest.detectedAt, now)}</div>
            </div>
            <span className={styles.headlineChip} aria-hidden="true">
              <ArrowRight />
            </span>
          </div>
        </div>
      </Link>
    );
  }

  const topLine = (
    <div className={styles.activeTop}>
      <Link href={`/changes/${newest.id}`} className={`${styles.activeContent} ${styles.activeHeadlineLink}`}>
        <div className={styles.activeHeadline}>{newest.summary ?? FALLBACK}</div>
        <div className={styles.activeTime}>{timeAgo(newest.detectedAt, now)}</div>
      </Link>
      <Link href={`/changes/${newest.id}`} className={styles.headlineChip} aria-label="Read latest change">
        <ArrowRight />
      </Link>
    </div>
  );

  const toggle = (
    <button
      type="button"
      className={`${styles.moreToggle} ${open ? styles.moreToggleOpen : ""}`}
      aria-expanded={open}
      aria-controls={listId}
      onClick={() => setOpen((v) => !v)}
    >
      <span className={styles.moreChevron}>
        <ToggleChevron />
      </span>
      <span className={styles.moreToggleText}>{open ? "Show less" : `${rest.length} more this week`}</span>
    </button>
  );

  // Collapsed — headline row plus the toggle.
  if (!open) {
    return (
      <div className={styles.activeRow}>
        {meta}
        <div className={styles.activeBody}>
          {topLine}
          {toggle}
        </div>
      </div>
    );
  }

  // Expanded — the week's other changes as a lighter sub-list (all of them).
  return (
    <div className={styles.activeRowExpanded}>
      {meta}
      <div className={styles.activeBody}>
        {topLine}
        {toggle}
        <div id={listId} className={styles.subList}>
          {rest.map((c) => (
            <Link key={c.id} href={`/changes/${c.id}`} className={styles.subRow}>
              <div className={styles.subMain}>
                <div className={styles.subSummary}>{c.summary ?? FALLBACK}</div>
                <div className={styles.subWhen}>{timeAgo(c.detectedAt, now)}</div>
              </div>
              <span className={styles.subChip} aria-hidden="true">
                <SubChevron />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
