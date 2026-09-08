import Link from "next/link";
import { CompetitorAvatar } from "@/components/CompetitorAvatar";
import { pageTypeLabel, type PageType } from "@/features/competitors/pageTypes";
import { DashboardPageRow } from "./DashboardPageRow";
import type { TypeCardRow } from "./DashboardTypeCard";
import styles from "./page.module.css";

// The small "›" chevron trailing a "· quiet" line (design: "Quiet week" artboard).
function QuietChevron() {
  return (
    <svg width="6" height="9" viewBox="0 0 6 9" fill="none" aria-hidden="true" className={styles.quietChevron}>
      <path d="M1 1l3.5 3.5L1 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The compact page-type card shown when the WHOLE week is quiet (0 meaningful
 * changes across the account). A small header + one collapsed row per page — no
 * change body, no ⋮ menu — per the "Quiet week" artboard.
 *
 * Exceptions (owner decisions): paused and broken pages keep their full-fidelity
 * row (a silently-hidden broken page would undermine trust); a quiet page with no
 * prior history shows a muted note instead of the "before this week" link.
 */
export function DashboardQuietCard({
  pageType,
  rows,
  now,
}: {
  pageType: PageType;
  rows: TypeCardRow[];
  now: number;
}) {
  const allTime = rows.reduce((n, r) => n + r.page.meaningfulTotal, 0);

  return (
    <section className={styles.quietCard}>
      <div className={styles.quietHead}>
        <span className={styles.quietHeadLeft}>
          <span className={styles.quietTypeName}>{pageTypeLabel(pageType)}</span>
          <span className={styles.quietSep2} aria-hidden="true">
            ·
          </span>
          <span className={styles.quietPageCount}>
            {rows.length} page{rows.length === 1 ? "" : "s"}
          </span>
        </span>
        <span className={styles.quietMetric}>0 this week · {allTime} since watching</span>
      </div>

      {rows.map((r) => {
        const paused = !r.page.isActive;
        const broken = r.page.isActive && (r.page.lastCheckStatus === "broken" || r.page.lastCheckStatus === "error");

        // Paused / broken pages still need surfacing — keep the full row.
        if (paused || broken) {
          return (
            <DashboardPageRow
              key={r.page.id}
              page={r.page}
              competitorId={r.competitorId}
              competitorName={r.competitorName}
              competitorUrl={r.competitorUrl}
              siblingDomain={r.siblingDomain}
              now={now}
            />
          );
        }

        const hasHistory = r.page.meaningfulTotal > 0;

        return (
          <Link key={r.page.id} href={`/competitors/${r.competitorId}`} className={styles.quietPageLink}>
            <div className={styles.quietPageTop}>
              <CompetitorAvatar url={r.competitorUrl} name={r.competitorName} className={styles.quietAvatar} />
              <span className={styles.quietName}>{r.competitorName}</span>
              <span>· quiet</span>
              <QuietChevron />
            </div>
            {hasHistory ? (
              <div className={styles.quietHistoryLine}>
                See what changed before this week <span className={styles.quietHistoryArrow}>→</span>{" "}
                <span className={styles.quietHistoryLabel}>Recent history</span>
              </div>
            ) : (
              <div className={styles.quietNoHistory}>No changes yet since we started watching.</div>
            )}
          </Link>
        );
      })}
    </section>
  );
}
