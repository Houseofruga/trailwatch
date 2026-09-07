import { CompetitorAvatar } from "@/components/CompetitorAvatar";
import type { ChangeDetail } from "@/features/changes/queries";
import styles from "./page.module.css";

// The competitor/page crumb — the "who + which page" line. On the full page it
// sits above the summary (with its own bottom margin); in the modal it lives in
// the header next to the close button, so `compact` drops that margin.
export function ChangeDetailCrumb({ detail, compact = false }: { detail: ChangeDetail; compact?: boolean }) {
  return (
    <div className={styles.crumb} style={compact ? { marginBottom: 0 } : undefined}>
      <CompetitorAvatar url={detail.url} name={detail.competitorName} className={styles.crumbAvatar} />
      <span className={styles.crumbComp}>{detail.competitorName}</span>
      <span className={styles.crumbDot}>&middot;</span>
      <span className={styles.crumbLabel}>{detail.pageLabel}</span>
      {detail.isArchive ? <span className={styles.archiveBadge}>Web archive</span> : null}
    </div>
  );
}

// The change-detail content beneath the crumb: the summary headline plus the
// before/after excerpt our filter judged meaningful. Shared by the full page and
// the modal so the two can't drift.
export function ChangeDetailBody({ detail }: { detail: ChangeDetail }) {
  return (
    <>
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
    </>
  );
}
