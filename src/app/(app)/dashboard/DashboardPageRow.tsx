"use client";

import { useState } from "react";
import Link from "next/link";
import { CompetitorAvatar } from "@/components/CompetitorAvatar";
import { PageActionsMenu } from "@/components/PageActionsMenu";
import { ExternalLinkIcon } from "@/components/icons";
import type { CompetitorRow } from "@/features/competitors/queries";
import { DashboardEditUrl } from "./DashboardEditUrl";
import { DashboardRecentHistory } from "./DashboardRecentHistory";
import { activeChanges, formatFullDate, timeAgo } from "./dashboardFeed";
import styles from "./page.module.css";

type Page = CompetitorRow["pages"][number];
type Change = Page["changes"][number];

const FALLBACK = "Meaningful change detected (summary unavailable).";

function Chevron({ up }: { up?: boolean }) {
  return (
    <svg width="9" height="6" viewBox="0 0 9 6" fill="none" aria-hidden="true" style={{ transform: up ? "rotate(180deg)" : undefined }}>
      <path d="M1 1l3.5 3.5L8 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ViewChange({ id }: { id: string }) {
  return (
    <Link href={`/changes/${id}`} className={styles.viewChangeInline}>
      View change ›
    </Link>
  );
}

// The most notable change to surface on a quiet page: newest meaningful (any age)
// or the archive backfill, whichever is more recent.
function lastNotable(page: Page): { change: Change; isArchive: boolean } | null {
  const live = page.changes.find((c) => c.isMeaningful) ?? null;
  const arch = page.lastArchived;
  if (live && arch) {
    return live.detectedAt >= arch.detectedAt
      ? { change: live, isArchive: false }
      : { change: arch, isArchive: true };
  }
  if (live) return { change: live, isArchive: false };
  if (arch) return { change: arch, isArchive: true };
  return null;
}

/**
 * One competitor's page inside a page-type card. Renders all row states from the
 * IA design: active (live change this week, with a "N more this week" expander +
 * nested Recent history), quiet-with-notable (incl. a "From web archive" variant),
 * paused (muted, inline), and broken ("Can't reach" + Edit URL).
 */
export function DashboardPageRow({
  page,
  competitorName,
  competitorUrl,
  siblingDomain,
  now,
}: {
  page: Page;
  competitorName: string;
  competitorUrl: string;
  siblingDomain: string | null;
  now: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const paused = !page.isActive;
  const broken = page.isActive && (page.lastCheckStatus === "broken" || page.lastCheckStatus === "error");
  const active = paused || broken ? [] : activeChanges(page, now);
  const [newest, ...rest] = active;
  const notable = !paused && !broken && active.length === 0 ? lastNotable(page) : null;

  const identity = (
    <div className={styles.dashIdentity}>
      <CompetitorAvatar url={competitorUrl} name={competitorName} className={styles.compAvatar} />
      <span className={styles.dashCompName}>{competitorName}</span>
      <span className={styles.dashSep} aria-hidden="true">
        ›
      </span>
      <a href={page.url} target="_blank" rel="noreferrer" className={styles.dashUrl}>
        <span className={styles.dashUrlText}>{page.url.replace(/^https?:\/\//, "")}</span>
        {!paused ? (
          <span className={styles.dashUrlIcon}>
            <ExternalLinkIcon />
          </span>
        ) : null}
      </a>
    </div>
  );

  const menu = (
    <PageActionsMenu
      pageId={page.id}
      label={page.label}
      url={page.url}
      siblingDomain={siblingDomain}
      isActive={page.isActive}
      competitorName={competitorName}
    />
  );

  // --- Paused: a single muted line, no body. ---
  if (paused) {
    return (
      <div className={`${styles.dashRow} ${styles.dashRowPaused}`}>
        <div className={styles.dashHead}>
          {identity}
          <div className={styles.dashStatus}>
            <span className={styles.stBadgePaused}>Paused</span>
            <span className={styles.dashPausedNote}>Not being checked</span>
            {menu}
          </div>
        </div>
      </div>
    );
  }

  // --- Broken: identity + "Can't reach", then the error line + Edit URL. ---
  if (broken) {
    return (
      <div className={`${styles.dashRow} ${styles.dashRowBroken}`}>
        <div className={styles.dashHead}>
          {identity}
          <div className={styles.dashStatus}>
            <span className={styles.stBadgeError}>
              <span className={styles.stBadgeSquare} aria-hidden="true" />
              {page.lastCheckStatus === "broken" ? "Can’t reach" : "Check failed"}
            </span>
            {menu}
          </div>
        </div>
        <div className={styles.brokenMeta}>
          <span className={styles.brokenText}>
            {page.lastCheckError ?? "This page couldn’t be reached on the last check."}
            {page.lastCheckedAt ? ` · last checked ${timeAgo(page.lastCheckedAt, now)}` : null}
          </span>
          <DashboardEditUrl pageId={page.id} url={page.url} label={page.label} siblingDomain={siblingDomain} />
        </div>
      </div>
    );
  }

  const badge = (
    <span className={styles.stBadge}>
      <span className={styles.stBadgeDot} aria-hidden="true" />
      Checking daily
    </span>
  );

  return (
    <div className={`${styles.dashRow} ${notable?.isArchive ? styles.dashRowArchive : ""}`}>
      <div className={styles.dashHead}>
        {identity}
        <div className={styles.dashStatus}>
          {badge}
          {menu}
        </div>
      </div>

      <div className={styles.dashBody}>
      {active.length > 0 ? (
        <>
          <p className={styles.dashSummary}>
            {newest.summary ?? FALLBACK} <ViewChange id={newest.id} />
          </p>
          <div className={styles.dashTime}>{timeAgo(newest.detectedAt, now)}</div>

          {rest.length > 0 ? (
            <button
              type="button"
              className={`${styles.morePill} ${expanded ? styles.morePillOpen : ""}`}
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
            >
              <span>{expanded ? "Show less" : `${rest.length} more this week`}</span>
              <Chevron up={expanded} />
            </button>
          ) : null}

          {rest.length > 0 && expanded ? (
            <>
              <div className={styles.subList}>
                {rest.map((c) => (
                  <div key={c.id} className={styles.subChange}>
                    <p className={styles.subChangeSummary}>
                      {c.summary ?? FALLBACK} <ViewChange id={c.id} />
                    </p>
                    <div className={styles.subChangeWhen}>{timeAgo(c.detectedAt, now)}</div>
                  </div>
                ))}
              </div>
              <DashboardRecentHistory pageId={page.id} />
            </>
          ) : null}
        </>
      ) : notable ? (
        <>
          {notable.isArchive ? (
            <div className={styles.archiveTagRow}>
              <span className={styles.archiveTag}>From web archive</span>
            </div>
          ) : null}
          <p className={styles.dashSummaryQuiet}>
            {notable.change.summary ?? FALLBACK} <ViewChange id={notable.change.id} />
          </p>
          <div className={styles.dashTime}>
            Last notable change · {formatFullDate(notable.change.detectedAt)} ({timeAgo(notable.change.detectedAt, now)})
          </div>
          {notable.isArchive ? (
            <div className={styles.archiveNote}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className={styles.archiveNoteIcon}>
                <circle cx="6" cy="6" r="4.6" stroke="currentColor" strokeWidth="1.1" />
                <path d="M4 6h4M6 4v4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
              No weekly change count — this page is sourced via Web Archive.
            </div>
          ) : null}
        </>
      ) : (
        <div className={styles.dashQuiet}>No changes yet since we started watching.</div>
      )}
      </div>
    </div>
  );
}
