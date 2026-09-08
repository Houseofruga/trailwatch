"use client";

import { useState } from "react";
import Link from "next/link";
import { CompetitorAvatar } from "@/components/CompetitorAvatar";
import { PageActionsMenu } from "@/components/PageActionsMenu";
import { ExternalLinkIcon } from "@/components/icons";
import type { CompetitorRow } from "@/features/competitors/queries";
import { PageIntel } from "@/app/(app)/competitors/PageIntel";
import { DashboardEditUrl } from "./DashboardEditUrl";
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

function SubChevron() {
  return (
    <svg width="6" height="9" viewBox="0 0 6 9" fill="none" aria-hidden="true">
      <path d="M1 1l3.5 3.5L1 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ViewChange({ id }: { id: string }) {
  return (
    <Link href={`/changes/${id}`} className={styles.viewChangeBtn}>
      View change
      <SubChevron />
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
 * One competitor's page inside a page-type card on the redesigned dashboard.
 * Header: competitor avatar + name + URL + status badge + ⋮ menu. Body: the
 * change treatment (active with a "N more this week" expander, quiet, paused, or
 * broken). Active/quiet rows also carry the shared "What we're watching now" /
 * "Recent history" pills (PageIntel).
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

  const broken = page.isActive && (page.lastCheckStatus === "broken" || page.lastCheckStatus === "error");
  const paused = !page.isActive;
  const active = activeChanges(page, now);
  const [newest, ...rest] = active;
  const notable = active.length === 0 ? lastNotable(page) : null;

  const badge = paused ? (
    <span className={styles.stBadgePaused}>Paused</span>
  ) : broken ? (
    <span className={styles.stBadgeError}>{page.lastCheckStatus === "broken" ? "Can’t reach" : "Check failed"}</span>
  ) : (
    <span className={styles.stBadge}>
      <span className={styles.stBadgeDot} aria-hidden="true" />
      Checking daily
    </span>
  );

  return (
    <div className={styles.dashRow}>
      <div className={styles.dashHead}>
        <div className={styles.dashIdentity}>
          <CompetitorAvatar url={competitorUrl} name={competitorName} className={styles.compAvatar} />
          <span className={styles.dashCompName}>{competitorName}</span>
          <a href={page.url} target="_blank" rel="noreferrer" className={styles.dashUrl}>
            <span className={styles.dashUrlText}>{page.url.replace(/^https?:\/\//, "")}</span>
            <span className={styles.dashUrlIcon}>
              <ExternalLinkIcon />
            </span>
          </a>
        </div>
        <div className={styles.dashStatus}>
          {badge}
          <PageActionsMenu
            pageId={page.id}
            label={page.label}
            url={page.url}
            siblingDomain={siblingDomain}
            isActive={page.isActive}
            competitorName={competitorName}
          />
        </div>
      </div>

      {broken ? (
        <div className={styles.dashBroken}>
          <span className={styles.pageErrorText}>
            {page.lastCheckError ?? "This page couldn’t be reached on the last check."}
          </span>
          <DashboardEditUrl pageId={page.id} url={page.url} label={page.label} siblingDomain={siblingDomain} />
        </div>
      ) : paused ? (
        <div className={styles.dashQuiet}>Not being checked</div>
      ) : active.length > 0 ? (
        <>
          <div className={styles.dashBody}>
            <div className={styles.dashBodyText}>
              <div className={styles.activeHeadline}>{newest.summary ?? FALLBACK}</div>
              <div className={styles.activeTime}>{timeAgo(newest.detectedAt, now)}</div>
              {rest.length > 0 ? (
                <button
                  type="button"
                  className={`${styles.moreToggle} ${expanded ? styles.moreToggleOpen : ""}`}
                  aria-expanded={expanded}
                  onClick={() => setExpanded((v) => !v)}
                >
                  <span className={styles.moreChevron}>
                    <Chevron up={expanded} />
                  </span>
                  <span className={styles.moreToggleText}>{expanded ? "Show less" : `${rest.length} more this week`}</span>
                </button>
              ) : null}
              {expanded ? (
                <div className={styles.subList}>
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
              ) : null}
            </div>
            <ViewChange id={newest.id} />
          </div>
          <PageIntel pageId={page.id} />
        </>
      ) : notable ? (
        <>
          <div className={styles.dashBody}>
            <div className={styles.dashBodyText}>
              {notable.change.summary ? <div className={styles.quietSummary}>{notable.change.summary}</div> : null}
              <div className={styles.quietNotableMeta}>
                Last notable change · {formatFullDate(notable.change.detectedAt)} ({timeAgo(notable.change.detectedAt, now)})
                {notable.isArchive ? <span className={styles.quietArchiveTag}>Web archive</span> : null}
              </div>
            </div>
            <ViewChange id={notable.change.id} />
          </div>
          <PageIntel pageId={page.id} />
        </>
      ) : (
        <>
          <div className={styles.dashQuiet}>
            {page.backfilledAt ? "No notable change in the last 180 days" : "No changes yet since we started watching."}
          </div>
          <PageIntel pageId={page.id} />
        </>
      )}
    </div>
  );
}
