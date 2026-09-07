import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { CompetitorAvatar } from "@/components/CompetitorAvatar";
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
      <BackLink href="/dashboard" />

      <div className={styles.crumb}>
        <CompetitorAvatar url={detail.url} name={detail.competitorName} className={styles.crumbAvatar} />
        <span className={styles.crumbComp}>{detail.competitorName}</span>
        <span className={styles.crumbDot}>&middot;</span>
        <span className={styles.crumbLabel}>{detail.pageLabel}</span>
        {detail.isArchive ? <span className={styles.archiveBadge}>Web archive</span> : null}
      </div>

      <h1 className={styles.summary}>{detail.summary}</h1>

      {detail.isArchive ? (
        <div className={styles.archiveCallout}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={styles.archiveIcon}>
            <path d="M8 1.5A6.5 6.5 0 108 14.5 6.5 6.5 0 008 1.5z" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 4.6v3.6l2.4 1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <div>
            Reconstructed from the web archive &mdash; we didn&rsquo;t watch this page when the change
            happened, so the &ldquo;before&rdquo; is the nearest archived snapshot from {detail.beforeDate}.
            Exact wording may differ slightly.
          </div>
        </div>
      ) : null}

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
        <a href={detail.url} target="_blank" rel="noopener noreferrer" className={styles.footOpen}>
          Open {detail.domain} ↗
        </a>
      </div>
    </div>
  );
}
