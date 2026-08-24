import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { getRealChangeDetail } from "@/features/changes/queries";
import { getDemoChangeDetail } from "@/features/demo/demoFeed";
import styles from "./page.module.css";

// The change-detail page (SPEC prototype "CHANGE DETAIL"): a summary headline plus
// the before/after excerpt our filter judged meaningful. Serves both real changes
// (from the DB, RLS-scoped) and the display-only demo changes.
export default async function ChangeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Server Component: reading the clock here is deterministic for the response.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const detail = id.startsWith("demo-")
    ? getDemoChangeDetail(id, now)
    : await getRealChangeDetail(id);
  if (!detail) notFound();

  return (
    <div className={styles.wrap}>
      <BackLink href="/dashboard">This week</BackLink>

      <div className={styles.crumb}>
        <span className={styles.crumbComp}>{detail.competitorName}</span>
        <span className={styles.crumbDot}>&middot;</span>
        <span className={styles.crumbLabel}>{detail.pageLabel}</span>
      </div>

      <h1 className={styles.summary}>{detail.summary}</h1>

      <div className={styles.meta}>
        <span>Detected {detail.detectedDate}</span>
        <a href={detail.url} target="_blank" rel="noopener noreferrer" className={styles.metaLink}>
          View live page ↗
        </a>
      </div>

      <div className={styles.said}>
        <div className={styles.saidLabel}>What the page said</div>
        <div className={styles.grid}>
          <div className={styles.beforeBox}>
            <div className={styles.boxHeadBefore}>Before &mdash; {detail.beforeDate}</div>
            <div className={styles.excerpt}>{detail.before}</div>
          </div>
          <div className={styles.afterBox}>
            <div className={styles.boxHeadAfter}>After &mdash; {detail.afterDate}</div>
            <div className={styles.excerptAfter}>{detail.after}</div>
          </div>
        </div>
        <p className={styles.note}>
          Excerpt only &mdash; the part of the page our filter judged meaningful.
          {detail.ignoredNote ? ` ${detail.ignoredNote}` : ""}
        </p>
      </div>

      <div className={styles.foot}>
        <Link href="/dashboard" className={styles.footBack}>
          Back to this week
        </Link>
        <a href={detail.url} target="_blank" rel="noopener noreferrer" className={styles.footOpen}>
          Open {detail.domain} ↗
        </a>
      </div>
    </div>
  );
}
