import { Suspense } from "react";
import { ButtonLink } from "@/components/Button";
import { PlusIcon } from "@/components/icons";
import { FlashToast } from "@/components/FlashToast";
import { getAccount } from "@/features/account/queries";
import { getCompetitorsWithPages } from "@/features/competitors/queries";
import { getDemoFeed } from "@/features/demo/demoFeed";
import { LIMITS } from "@/features/plan/limits";
import { PAGE_TYPE_VALUES } from "@/features/competitors/pageTypes";
import { originOf } from "@/features/competitors/domain";
import { DashboardTypeCard, type TypeCardRow } from "./DashboardTypeCard";
import { DashboardAddPage } from "./DashboardAddPage";
import { DemoDashboard } from "./DemoDashboard";
import { PendingSeedRedirect } from "./PendingSeedRedirect";
import { activeChanges, withinWeek } from "./dashboardFeed";
import styles from "./page.module.css";

// How many meaningful changes this week sit in a type group — used to float the
// most active cards to the top.
function weekCountOf(rows: TypeCardRow[], now: number): number {
  return rows.reduce((n, r) => n + activeChanges(r.page, now).length, 0);
}

export default async function DashboardPage() {
  const [account, competitors] = await Promise.all([getAccount(), getCompetitorsWithPages()]);
  // Server Component: this renders once per request on the server, so reading the
  // clock here is deterministic for the response (not a client-render impurity).
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  // A user with zero competitors of their own sees a clearly-labeled, display-only
  // example dashboard instead of an empty feed (SPEC — Seeded Demo Dashboard). It
  // is never stored, monitored, or counted to limits, and disappears the instant
  // they add their first real competitor. If no demo data is present, fall through
  // to the guided empty state below — never a blank screen.
  if (account && competitors.length === 0 && getDemoFeed(now).length > 0) {
    return (
      <>
        <PendingSeedRedirect />
        <DemoDashboard now={now} />
      </>
    );
  }

  if (!account || competitors.length === 0) {
    return (
      <div className={styles.empty}>
        <PendingSeedRedirect />
        <div className={styles.emptyCard}>
          <svg className={styles.emptyIcon} width="64" height="64" viewBox="0 0 72 72" fill="none" aria-hidden="true">
            <rect x="14" y="10" width="34" height="44" stroke="#c9c4ba" strokeWidth="1.5" />
            <line x1="20" y1="20" x2="38" y2="20" stroke="#e0dcd3" strokeWidth="1.5" />
            <line x1="20" y1="27" x2="42" y2="27" stroke="#e0dcd3" strokeWidth="1.5" />
            <line x1="20" y1="34" x2="34" y2="34" stroke="#e0dcd3" strokeWidth="1.5" />
            <circle cx="44" cy="44" r="13" fill="#f6fbea" stroke="#8ad800" strokeWidth="1.5" />
            <line x1="53" y1="53" x2="62" y2="62" stroke="#557a00" strokeWidth="2" strokeLinecap="round" />
          </svg>

          <h1 className={styles.title}>Nothing on the radar yet</h1>
          <p className={styles.body}>
            Add a competitor and the pages you care about. Cards appear here grouped by page type.
          </p>

          <ButtonLink href="/competitors/add" className={styles.cta}>
            Add your first competitor
          </ButtonLink>
        </div>

        <Suspense fallback={null}>
          <FlashToast />
        </Suspense>
      </div>
    );
  }

  const limits = LIMITS[account.plan];
  const pageCount = competitors.reduce((n, c) => n + c.pages.length, 0);
  const overComp = competitors.length > limits.competitors;
  const overPages = competitors.some((c) => c.pages.length > limits.pagesPerCompetitor);

  // Every change from this week, flattened, for the header stats.
  const weekChanges = competitors.flatMap((c) =>
    c.pages.flatMap((p) => p.changes.filter((ch) => withinWeek(ch.detectedAt, now))),
  );
  const changesThisWeek = weekChanges.filter((ch) => ch.isMeaningful).length;
  const trivialFiltered = weekChanges.filter((ch) => !ch.isMeaningful).length;

  // Flatten pages into rows carrying their competitor identity, then group by
  // page type across competitors — the inverted dashboard.
  const entries: TypeCardRow[] = competitors.flatMap((c) =>
    c.pages.map((p) => {
      const sibling = c.pages.find((other) => other.id !== p.id);
      return {
        page: p,
        competitorId: c.id,
        competitorName: c.name,
        competitorUrl: c.pages[0]?.url ?? p.url,
        siblingDomain: sibling ? originOf(sibling.url) : null,
        isLastPage: !sibling,
      };
    }),
  );

  const groups = PAGE_TYPE_VALUES.map((type) => ({
    type,
    // Changed-this-week pages first within the card; ties keep query order.
    rows: [...entries.filter((e) => e.page.pageType === type)].sort(
      (a, b) => activeChanges(b.page, now).length - activeChanges(a.page, now).length,
    ),
  }))
    .filter((g) => g.rows.length > 0)
    // Cards with the most movement this week float to the top.
    .sort((a, b) => weekCountOf(b.rows, now) - weekCountOf(a.rows, now));

  const quiet = changesThisWeek === 0;
  const heading = quiet ? "All quiet" : "This week";
  const headSub = quiet
    ? `No meaningful changes this week. We’re still checking all ${pageCount} page${pageCount === 1 ? "" : "s"} daily.`
    : `${changesThisWeek} meaningful ${changesThisWeek === 1 ? "change" : "changes"} across your watchlist.`;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <div className={styles.headingRow}>
            <h1 className={styles.heading}>{heading}</h1>
            {quiet ? <span className={styles.quietDot} aria-hidden="true" /> : null}
          </div>
          <p className={styles.headSub}>{headSub}</p>
        </div>
        <div className={styles.headActions}>
          <DashboardAddPage
            competitors={competitors.map((c) => ({
              id: c.id,
              name: c.name,
              url: c.pages[0]?.url ?? "",
              existingUrls: c.pages.map((p) => p.url),
              currentCount: c.pages.length,
            }))}
            pagesPerCompetitor={limits.pagesPerCompetitor}
            plan={account.plan}
          />
          <ButtonLink href="/competitors/add">
            <PlusIcon />
            Add competitor
          </ButtonLink>
        </div>
      </div>

      <div className={styles.digestBar}>
        <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden="true" className={styles.digestIcon}>
          <circle cx="6" cy="6" r="4.6" stroke="currentColor" strokeWidth="1.1" />
          <path d="M6 3.4V6l1.9 1.1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>You&rsquo;ll get a digest email every Monday at 8:00&nbsp;UTC.</span>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabelRow}>
            <div className={styles.statIconAmber}>&#9673;</div>
            <span className={styles.statLabel}>Changes this week</span>
          </div>
          <div className={styles.statValue}>{changesThisWeek}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabelRow}>
            <div className={styles.statIconGreen}>&#9673;</div>
            <span className={styles.statLabel}>Pages tracked</span>
          </div>
          <div className={styles.statValue}>{pageCount}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabelRow}>
            <div className={styles.statIconInk}>&#9673;</div>
            <span className={styles.statLabel}>Competitors</span>
          </div>
          <div className={styles.statValue}>{competitors.length}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabelRow}>
            <div className={styles.statIconWarn}>&#9673;</div>
            <span className={styles.statLabel}>Trivial edits filtered</span>
          </div>
          <div className={styles.statValue}>{trivialFiltered}</div>
        </div>
      </div>

      {account.plan === "free" && (overComp || overPages) ? (
        <div className={styles.upgradeBanner}>
          <div>
            <div className={styles.upgradeBannerTitle}>You&rsquo;re over the Free plan limit</div>
            <div className={styles.upgradeBannerBody}>
              Free tracks {limits.competitors} competitors and {limits.pagesPerCompetitor} pages each.
              The extras are read-only until you upgrade.
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.compList}>
        {groups.map((g) => (
          <DashboardTypeCard key={g.type} pageType={g.type} rows={g.rows} now={now} />
        ))}
      </div>

      <Suspense fallback={null}>
        <FlashToast />
      </Suspense>
    </div>
  );
}
