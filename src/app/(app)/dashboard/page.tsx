import { Suspense } from "react";
import { ButtonLink } from "@/components/Button";
import { PlusIcon } from "@/components/icons";
import { FlashToast } from "@/components/FlashToast";
import { getAccount } from "@/features/account/queries";
import { getCompetitorsWithPages, type CompetitorRow } from "@/features/competitors/queries";
import { LIMITS } from "@/features/plan/limits";
import styles from "./page.module.css";

const SUGGESTIONS = [
  { n: "01", text: "Their pricing page — the change that matters most" },
  { n: "02", text: "Their changelog — what they’re shipping" },
  { n: "03", text: "Their homepage — how the positioning moves" },
];

function domainOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// "This week" = the trailing 7 days. Digests are derived from changes in this
// same window (SPEC.md) — no digest table, just the changes rows filtered by
// detected_at, computed here on the fly.
function withinWeek(detectedAt: string, now: number): boolean {
  return now - new Date(detectedAt).getTime() <= WEEK_MS;
}

function timeAgo(detectedAt: string, now: number): string {
  const mins = Math.round((now - new Date(detectedAt).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

// The most recent meaningful change on a page, if any — that's the sentence
// worth showing. Trivial changes stay counted-but-unshown (the low-noise edge).
function latestMeaningful(page: CompetitorRow["pages"][number]) {
  return page.changes.find((c) => c.isMeaningful) ?? null;
}

function quietNote(page: CompetitorRow["pages"][number]): string {
  if (!page.isActive) return "Paused";
  if (!page.lastCheckedAt) return "First check runs within the hour";
  return "No meaningful changes yet";
}

export default async function DashboardPage() {
  const [account, competitors] = await Promise.all([getAccount(), getCompetitorsWithPages()]);
  // Server Component: this renders once per request on the server, so reading the
  // clock here is deterministic for the response (not a client-render impurity).
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  if (!account || competitors.length === 0) {
    return (
      <div className={styles.empty}>
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

  const headSub =
    changesThisWeek > 0
      ? `${changesThisWeek} meaningful ${changesThisWeek === 1 ? "change" : "changes"} across your tracked pages.`
      : "No meaningful changes this week — we'll email a digest each Monday.";

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.heading}>This week</h1>
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
              Free tracks {limits.competitors} competitor and {limits.pagesPerCompetitor} pages.
              The extras are read-only until you upgrade.
            </div>
          </div>
        </div>
      ) : null}

      <div className={styles.compList}>
        {competitors.map((c) => {
          const meaningful = meaningfulThisWeek(c);
          return (
            <section key={c.id} className={styles.compCard}>
              <div className={styles.compHead}>
                <div className={styles.compHeadLeft}>
                  <div className={styles.compAvatar}>{c.name.slice(0, 2).toUpperCase()}</div>
                  <div className={styles.compName}>{c.name}</div>
                  {c.pages[0] ? <div className={styles.compDomain}>{domainOf(c.pages[0].url)}</div> : null}
                </div>
                <div className={styles.compMeta}>
                  {meaningful > 0
                    ? `${meaningful} ${meaningful === 1 ? "change" : "changes"} this week`
                    : "Quiet this week"}
                </div>
              </div>

              {c.pages.map((p) => {
                const change = latestMeaningful(p);
                return (
                  <div key={p.id} className={styles.pageRow}>
                    <div className={styles.pageMeta}>
                      <div className={styles.pageLabel}>{p.label}</div>
                      {!p.isActive ? <div className={styles.pagePaused}>Paused</div> : null}
                    </div>
                    {change ? (
                      <div className={styles.pageChange}>
                        <a
                          className={styles.pageSummary}
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {change.summary ?? "Meaningful change detected (summary unavailable)."}
                        </a>
                        <div className={styles.pageChangeMeta}>{timeAgo(change.detectedAt, now)}</div>
                      </div>
                    ) : (
                      <div className={styles.pageQuiet}>{quietNote(p)}</div>
                    )}
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
