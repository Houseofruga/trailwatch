import type { CompetitorRow } from "@/features/competitors/queries";
import { pageTypeLabel, type PageType } from "@/features/competitors/pageTypes";
import { DashboardPageRow } from "./DashboardPageRow";
import { activeChanges } from "./dashboardFeed";
import styles from "./page.module.css";

type Page = CompetitorRow["pages"][number];

export type TypeCardRow = {
  page: Page;
  competitorId: string;
  competitorName: string;
  competitorUrl: string;
  siblingDomain: string | null;
  isLastPage: boolean;
};

// One dashboard card = one page type, holding every competitor's page of that
// type. Header shows the type, the page count, and the "N this week · M since
// watching" metric; the body is one row per page.
export function DashboardTypeCard({
  pageType,
  rows,
  now,
}: {
  pageType: PageType;
  rows: TypeCardRow[];
  now: number;
}) {
  const weekCount = rows.reduce((n, r) => n + activeChanges(r.page, now).length, 0);
  const allTime = rows.reduce((n, r) => n + r.page.meaningfulTotal, 0);
  const active = weekCount > 0;

  const lead = active ? `${weekCount} change${weekCount === 1 ? "" : "s"} this week` : "0 this week";

  return (
    <section className={styles.typeCard}>
      <div className={styles.typeHead}>
        <div className={styles.typeHeadLeft}>
          <span className={active ? styles.typeSquare : styles.typeSquareQuiet} aria-hidden="true" />
          <span className={styles.typeName}>{pageTypeLabel(pageType)}</span>
          <span className={styles.typeSep} aria-hidden="true">
            ·
          </span>
          <span className={styles.typeCount}>
            {rows.length} page{rows.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className={styles.typeMetric}>
          {weekCount === 0 && allTime === 0 ? (
            <span className={styles.typeMetricRest}>No changes yet</span>
          ) : (
            <>
              <span className={active ? styles.typeMetricLead : styles.typeMetricLeadQuiet}>{lead}</span>
              <span className={styles.typeMetricRest}> · {allTime} since watching</span>
            </>
          )}
        </div>
      </div>

      {rows.map((r) => (
        <DashboardPageRow
          key={r.page.id}
          page={r.page}
          competitorId={r.competitorId}
          competitorName={r.competitorName}
          competitorUrl={r.competitorUrl}
          siblingDomain={r.siblingDomain}
          isLastPage={r.isLastPage}
          now={now}
        />
      ))}
    </section>
  );
}
