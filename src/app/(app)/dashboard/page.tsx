import { Suspense } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import { CompetitorAvatar } from "@/components/CompetitorAvatar";
import { PlusIcon } from "@/components/icons";
import { FlashToast } from "@/components/FlashToast";
import { getAccount } from "@/features/account/queries";
import { getCompetitorsWithPages, type CompetitorRow } from "@/features/competitors/queries";
import { getDemoFeed } from "@/features/demo/demoFeed";
import { LIMITS } from "@/features/plan/limits";
import { DemoDashboard } from "./DemoDashboard";
import { DashboardBaseline } from "./DashboardBaseline";
import { PendingSeedRedirect } from "./PendingSeedRedirect";
import { domainOf, timeAgo, withinWeek } from "./dashboardFeed";
import styles from "./page.module.css";

const SUGGESTIONS = [
  { n: "01", text: "Their pricing page — the change that matters most" },
  { n: "02", text: "Their changelog — what they’re shipping" },
  { n: "03", text: "Their homepage — how the positioning moves" },
];

type Page = CompetitorRow["pages"][number];
type Change = Page["changes"][number];

// The most recent meaningful change from this week — the page is "active" and
// keeps its change link. `withinWeek` decides active vs quiet, per the adaptive
// design (value-forward when quiet, feed-forward when active).
function activeChange(page: Page, now: number): Change | null {
  return page.changes.find((c) => c.isMeaningful && withinWeek(c.detectedAt, now)) ?? null;
}

// For a quiet page, the most notable change to link to: the newest meaningful
// change of any age (necessarily older than this week here) or the archive
// backfill — whichever is more recent. The dashboard only ever links to it.
function lastNotable(page: Page): Change | null {
  const live = page.changes.find((c) => c.isMeaningful) ?? null;
  const arch = page.lastArchived;
  if (live && arch) return live.detectedAt >= arch.detectedAt ? live : arch;
  return live ?? arch;
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
        <div className={styles.mark}>
          <div className={styles.markDot} />
        </div>

        <h1 className={styles.title}>Nothing on the radar yet</h1>
        <p className={styles.body}>
          Add one competitor and the pages you care about. We check them every day and email you a
          digest each Monday.
        </p>

        <ButtonLink href="/competitors/add" className={styles.cta}>
          Add your first competitor
        </ButtonLink>

        <div className={styles.suggestions}>
          <div className={styles.suggestionsLabel}>Most people start with</div>
          <div className={styles.suggestionList}>
            {SUGGESTIONS.map((s) => (
              <div key={s.n} className={styles.suggestion}>
                <span className={styles.suggestionNum}>{s.n}</span>
                <span>{s.text}</span>
              </div>
            ))}
          </div>
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

  // Every change from this week, flattened, so the three stats are one pass.
  const weekChanges = competitors.flatMap((c) =>
    c.pages.flatMap((p) => p.changes.filter((ch) => withinWeek(ch.detectedAt, now))),
  );
  const changesThisWeek = weekChanges.filter((ch) => ch.isMeaningful).length;
  const trivialFiltered = weekChanges.filter((ch) => !ch.isMeaningful).length;

  // Per competitor: how many meaningful changes landed this week.
  const meaningfulThisWeek = (c: CompetitorRow) =>
    c.pages.reduce(
      (n, p) => n + p.changes.filter((ch) => ch.isMeaningful && withinWeek(ch.detectedAt, now)).length,
      0,
    );

  // Adaptive header: feed-forward when something moved, value-forward when quiet.
  // A quiet week is the product working, not a dead screen — say so.
  const quiet = changesThisWeek === 0;
  const heading = quiet ? "All quiet" : "This week";
  const headSub = quiet
    ? "Exactly the point — here's what we're watching for you."
    : `${changesThisWeek} meaningful ${changesThisWeek === 1 ? "change" : "changes"} across your tracked pages.`;

  // Competitors with the most movement this week float to the top; ties keep the
  // query's newest-first order (Array.sort is stable). Within a competitor, pages
  // that changed this week come before quiet ones.
  const orderedCompetitors = [...competitors].sort((a, b) => meaningfulThisWeek(b) - meaningfulThisWeek(a));

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
        <ButtonLink href="/competitors/add">
          <PlusIcon />
          Add competitor
        </ButtonLink>
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
            <div className={styles.statIconWarn}>&#9673;</div>
            <span className={styles.statLabel}>Trivial edits filtered</span>
          </div>
          <div className={styles.statValue}>{trivialFiltered}</div>
        </div>
      </div>

      <div className={styles.metaRow}>
        <span>Checks start within an hour of adding a page</span>
        <span>Digests go out Mondays at 8am</span>
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
        {orderedCompetitors.map((c) => {
          const meaningful = meaningfulThisWeek(c);
          // Changed-this-week pages first; ties keep the query's page order.
          const orderedPages = [...c.pages].sort(
            (a, b) => (activeChange(b, now) ? 1 : 0) - (activeChange(a, now) ? 1 : 0),
          );
          return (
            <section key={c.id} className={styles.compCard}>
              <div className={styles.compHead}>
                <div className={styles.compHeadLeft}>
                  <CompetitorAvatar url={c.pages[0]?.url} name={c.name} className={styles.compAvatar} />
                  <div className={styles.compName}>{c.name}</div>
                  {c.pages[0] ? <div className={styles.compDomain}>{domainOf(c.pages[0].url)}</div> : null}
                </div>
                <div className={styles.compMeta}>
                  {meaningful > 0
                    ? `${meaningful} ${meaningful === 1 ? "change" : "changes"} this week`
                    : "Quiet this week"}
                </div>
              </div>

              {orderedPages.map((p) => {
                // Active page: a meaningful change landed this week — keep the feed link.
                const change = activeChange(p, now);
                if (change) {
                  return (
                    <Link key={p.id} href={`/changes/${change.id}`} className={styles.pageRowLink}>
                      <div className={styles.pageMeta}>
                        <div className={styles.pageLabel}>{p.label}</div>
                        {!p.isActive ? <div className={styles.pagePaused}>Paused</div> : null}
                      </div>
                      <div className={styles.pageChange}>
                        <span className={styles.pageSummary}>
                          {change.summary ?? "Meaningful change detected (summary unavailable)."}
                        </span>
                        <div className={styles.pageChangeMeta}>{timeAgo(change.detectedAt, now)}</div>
                      </div>
                      <span className={styles.arrowBox} aria-hidden="true">
                        <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
                          <path
                            d="M1 1l4.5 5L1 11"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </Link>
                  );
                }

                // Paused pages aren't being watched — no value card, just the state.
                if (!p.isActive) {
                  return (
                    <div key={p.id} className={styles.pageRowPaused}>
                      <div className={styles.pageMeta}>
                        <div className={styles.pageLabelMuted}>{p.label}</div>
                      </div>
                      <div className={styles.pausedLine}>
                        <span className={styles.pagePausedTag}>Paused</span>
                        <span className={styles.pageQuiet}>Not being checked</span>
                      </div>
                    </div>
                  );
                }

                // Quiet, active page: value-forward — the baseline profile + a
                // link to its last notable change, instead of "nothing happened".
                const notable = lastNotable(p);
                return (
                  <div key={p.id} className={styles.pageRowQuiet}>
                    <div className={styles.pageMeta}>
                      <div className={styles.pageLabel}>{p.label}</div>
                      <div className={styles.pageQuietSub}>Quiet</div>
                    </div>
                    <div className={styles.pageValue}>
                      <DashboardBaseline
                        pageId={p.id}
                        lastNotable={notable ? { id: notable.id, label: timeAgo(notable.detectedAt, now) } : null}
                      />
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>

      <Suspense fallback={null}>
        <FlashToast />
      </Suspense>
    </div>
  );
}
