import { Suspense } from "react";
import { ButtonLink } from "@/components/Button";
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

// The check engine (slice 3) and LLM summaries (slice 4) don't exist yet, so
// every page is honestly "quiet" — there's nothing to report yet, not
// nothing meaningful changed. The distinction matters for a low-noise product.
function quietNote(page: CompetitorRow["pages"][number]): string {
  if (!page.isActive) return "Paused";
  if (!page.lastCheckedAt) return "First check runs within the hour";
  return "No meaningful changes since the last check";
}

export default async function DashboardPage() {
  const [account, competitors] = await Promise.all([getAccount(), getCompetitorsWithPages()]);

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

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.heading}>This week</h1>
          <p className={styles.headSub}>
            No changes recorded yet — the daily check engine lands in a later slice.
          </p>
        </div>
        <ButtonLink href="/competitors/add">+ Add competitor</ButtonLink>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabelRow}>
            <div className={styles.statIconAmber}>&#9673;</div>
            <span className={styles.statLabel}>Changes this week</span>
          </div>
          <div className={styles.statValue}>0</div>
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
          <div className={styles.statValue}>0</div>
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
        {competitors.map((c) => (
          <section key={c.id} className={styles.compCard}>
            <div className={styles.compHead}>
              <div className={styles.compHeadLeft}>
                <div className={styles.compAvatar}>{c.name.slice(0, 2).toUpperCase()}</div>
                <div className={styles.compName}>{c.name}</div>
                {c.pages[0] ? <div className={styles.compDomain}>{domainOf(c.pages[0].url)}</div> : null}
              </div>
              <div className={styles.compMeta}>Quiet this week</div>
            </div>

            {c.pages.map((p) => (
              <div key={p.id} className={styles.pageRow}>
                <div className={styles.pageMeta}>
                  <div className={styles.pageLabel}>{p.label}</div>
                  {!p.isActive ? <div className={styles.pagePaused}>Paused</div> : null}
                </div>
                <div className={styles.pageQuiet}>{quietNote(p)}</div>
              </div>
            ))}
          </section>
        ))}
      </div>

      <Suspense fallback={null}>
        <FlashToast />
      </Suspense>
    </div>
  );
}
