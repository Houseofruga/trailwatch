import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import { PlusIcon } from "@/components/icons";
import { getDemoFeed } from "@/features/demo/demoFeed";
import { domainOf, latestMeaningful, timeAgo, withinWeek } from "./dashboardFeed";
import styles from "./page.module.css";

// SPEC — Seeded Demo Dashboard. A display-only example feed shown only to users
// with zero competitors, rendered in the same layout as the real dashboard but
// wrapped in unmistakable "example" chrome (banner + Example badges + a distinct
// container). Nothing here is stored, monitored, or counted toward limits.
export function DemoDashboard({ now }: { now: number }) {
  const competitors = getDemoFeed(now);

  const weekChanges = competitors.flatMap((c) =>
    c.pages.flatMap((p) => p.changes.filter((ch) => withinWeek(ch.detectedAt, now))),
  );
  const changesThisWeek = weekChanges.filter((ch) => ch.isMeaningful).length;
  const trivialFiltered = weekChanges.filter((ch) => !ch.isMeaningful).length;
  const pageCount = competitors.reduce((n, c) => n + c.pages.length, 0);

  const meaningfulThisWeek = (c: (typeof competitors)[number]) =>
    c.pages.reduce(
      (n, p) => n + p.changes.filter((ch) => ch.isMeaningful && withinWeek(ch.detectedAt, now)).length,
      0,
    );

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.heading}>This week</h1>
          <p className={styles.headSub}>See TrailWatch working before you add a thing.</p>
        </div>
        <ButtonLink href="/competitors/add">
          <PlusIcon />
          Add your first competitor
        </ButtonLink>
      </div>

      <div className={styles.demoWrap}>
        <div className={styles.demoBanner}>
          Example dashboard — here&rsquo;s TrailWatch in action. Add your first competitor to start
          tracking your own.
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
                    <span className={styles.demoBadge}>Example</span>
                  </div>
                  <div className={styles.compMeta}>
                    {meaningful > 0
                      ? `${meaningful} ${meaningful === 1 ? "change" : "changes"} this week`
                      : "Quiet this week"}
                  </div>
                </div>

                {c.pages.map((p) => {
                  const change = latestMeaningful(p);
                  if (change) {
                    return (
                      <Link key={p.id} href={`/changes/${change.id}`} className={styles.pageRowLink}>
                        <div className={styles.pageMeta}>
                          <div className={styles.pageLabel}>{p.label}</div>
                        </div>
                        <div className={styles.pageChange}>
                          <span className={styles.pageSummary}>
                            {change.summary ?? "Meaningful change detected."}
                          </span>
                          <div className={styles.pageChangeMeta}>{timeAgo(change.detectedAt, now)}</div>
                        </div>
                      </Link>
                    );
                  }
                  return (
                    <div key={p.id} className={styles.pageRow}>
                      <div className={styles.pageMeta}>
                        <div className={styles.pageLabel}>{p.label}</div>
                      </div>
                      <div className={styles.pageQuiet}>No meaningful changes yet</div>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>

        <div className={styles.demoFoot}>
          <ButtonLink href="/competitors/add">
          <PlusIcon />
          Add your first competitor
        </ButtonLink>
          <p className={styles.allowanceLine}>Your free plan tracks up to 2 competitors and 6 pages.</p>
        </div>
      </div>
    </div>
  );
}
