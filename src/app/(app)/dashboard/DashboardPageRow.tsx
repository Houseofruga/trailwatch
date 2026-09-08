"use client";

import { useState } from "react";
import Link from "next/link";
import { CompetitorAvatar } from "@/components/CompetitorAvatar";
import { PageActionsMenu } from "@/components/PageActionsMenu";
import { ExternalLinkIcon } from "@/components/icons";
import type { CompetitorRow } from "@/features/competitors/queries";
import { DashboardEditUrl } from "./DashboardEditUrl";
import { DashboardRecentHistory } from "./DashboardRecentHistory";
import { activeChanges, timeAgo } from "./dashboardFeed";
import styles from "./page.module.css";

type Page = CompetitorRow["pages"][number];

const FALLBACK = "Meaningful change detected (summary unavailable).";

function Chevron({ up }: { up?: boolean }) {
  return (
    <svg
      width="9"
      height="6"
      viewBox="0 0 9 6"
      fill="none"
      aria-hidden="true"
      style={{ transform: up ? "rotate(180deg)" : undefined }}
    >
      <path d="M1 1l3.5 3.5L8 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// "View change ›" — an inline blue link at the end of a change summary.
function ViewChange({ id }: { id: string }) {
  return (
    <Link href={`/changes/${id}`} className={styles.viewChangeInline}>
      View change ›
    </Link>
  );
}

/**
 * One competitor's page inside a page-type card. Header: avatar + name + URL +
 * status badge + ⋮ menu. Body follows the IA design: the newest change summary
 * with an inline "View change ›", the time, a "N more this week" expander that
 * reveals the week's other changes, and a "See what changed before this week →
 * Recent history" disclosure. (The "What we're watching now" panel lives on the
 * competitor-detail page, not here.)
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
  const hasHistory = page.meaningfulTotal > 0;

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
          <span className={styles.dashSep} aria-hidden="true">
            ›
          </span>
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

          {/* The week's other changes and the "before this week" history live
              together inside the expander — hidden until it's opened. */}
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
      ) : hasHistory ? (
        // Quiet this week, but there's earlier history to look back on.
        <DashboardRecentHistory pageId={page.id} />
      ) : (
        <div className={styles.dashQuiet}>No changes yet since we started watching.</div>
      )}
    </div>
  );
}
