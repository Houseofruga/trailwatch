import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import { CompetitorAvatar } from "@/components/CompetitorAvatar";
import { PlusIcon } from "@/components/icons";
import type { CompetitorRow } from "@/features/competitors/queries";
import { originOf } from "@/features/competitors/domain";
import { activeChanges, timeAgo } from "@/app/(app)/dashboard/dashboardFeed";
import styles from "./page.module.css";

// The little external-link glyph after a competitor's domain.
function ExtIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M4.5 2.5h5v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The ">" affordance box on the right of a card (whole card taps to detail).
function ChevronBox() {
  return (
    <svg width="7" height="11" viewBox="0 0 6 9" fill="none" aria-hidden="true">
      <path d="M1 1l3.5 3.5L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The Competitors index (IA redesign §2): one health-metric card per competitor.
 * The whole card taps through to its detail page; the domain opens the external
 * site. Per-page management (add/edit/pause/delete, baseline + history) lives on
 * the detail page now, so this is a read-only overview and can render on the
 * server. Cards with movement this week float to the top.
 */
export function ManageBoard({ competitors, now }: { competitors: CompetitorRow[]; now: number }) {
  if (competitors.length === 0) {
    return (
      <div className={styles.empty}>
        {/* A competitor's page under a magnifier — "TrailWatch watches their pages". */}
        <svg
          className={styles.emptyArt}
          viewBox="0 0 140 116"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect x="26" y="14" width="60" height="82" stroke="currentColor" strokeWidth="2" />
          <line x1="36" y1="32" x2="76" y2="32" stroke="currentColor" strokeWidth="2" />
          <line x1="36" y1="44" x2="76" y2="44" stroke="currentColor" strokeWidth="2" />
          <line x1="36" y1="56" x2="62" y2="56" stroke="currentColor" strokeWidth="2" />
          <line x1="36" y1="68" x2="70" y2="68" className={styles.emptyArtAccent} strokeWidth="2" />
          <circle cx="94" cy="76" r="22" className={styles.emptyArtAccent} strokeWidth="2.5" />
          <line x1="110" y1="92" x2="126" y2="108" className={styles.emptyArtAccent} strokeWidth="3" strokeLinecap="round" />
        </svg>

        <h2 className={styles.emptyTitle}>No competitors yet</h2>
        <p className={styles.emptyBody}>
          Add a competitor and TrailWatch starts watching their pages — you’ll get a
          plain-English email when something actually changes.
        </p>
        <ButtonLink href="/competitors/add">
          <PlusIcon />
          Add your first competitor
        </ButtonLink>
      </div>
    );
  }

  const cards = competitors
    .map((c) => {
      const weekCount = c.pages.reduce((n, p) => n + activeChanges(p, now).length, 0);
      const allTime = c.pages.reduce((n, p) => n + p.meaningfulTotal, 0);
      const brokenCount = c.pages.filter(
        (p) => p.isActive && (p.lastCheckStatus === "broken" || p.lastCheckStatus === "error"),
      ).length;
      const checkedTimes = c.pages.map((p) => p.lastCheckedAt).filter((t): t is string => Boolean(t));
      const lastChecked = checkedTimes.length
        ? checkedTimes.reduce((a, b) => (new Date(a) > new Date(b) ? a : b))
        : null;
      return { c, weekCount, allTime, brokenCount, lastChecked };
    })
    // Most movement this week floats up; ties keep query order (newest first).
    .sort((a, b) => b.weekCount - a.weekCount);

  return (
    <div className={styles.list}>
      {cards.map(({ c, weekCount, allTime, brokenCount, lastChecked }) => {
        const firstUrl = c.pages[0]?.url ?? "";
        const domain = originOf(firstUrl);
        return (
          <div key={c.id} className={styles.idxCard}>
            {/* Stretched link makes the whole card the click target without nesting
                anchors — the domain link sits above it (z-index). */}
            <Link href={`/competitors/${c.id}`} className={styles.idxCardLink} aria-label={`${c.name} — view detail`} />

            <div className={styles.idxTop}>
              <div className={styles.idxIdentity}>
                <CompetitorAvatar url={firstUrl} name={c.name} className={styles.idxAvatar} />
                <div className={styles.idxNameWrap}>
                  <div className={styles.idxNameRow}>
                    <span className={styles.idxName}>{c.name}</span>
                    {brokenCount > 0 ? (
                      <span className={styles.idxBrokenPill}>
                        {brokenCount} page{brokenCount === 1 ? "" : "s"} can’t be reached
                      </span>
                    ) : null}
                  </div>
                  {domain ? (
                    <a href={firstUrl} target="_blank" rel="noreferrer" className={styles.idxDomain}>
                      <span className={styles.idxDomainText}>{domain}</span>
                      <span className={styles.idxDomainIcon}>
                        <ExtIcon />
                      </span>
                    </a>
                  ) : null}
                </div>
              </div>
              <span className={styles.idxChevron} aria-hidden="true">
                <ChevronBox />
              </span>
            </div>

            <div className={styles.idxMeta}>
              <div className={styles.idxMetaLeft}>
                <span>
                  Checked <span className={styles.idxMetaStrong}>{lastChecked ? timeAgo(lastChecked, now) : "not yet"}</span>
                </span>
                <span>
                  Tracking <span className={styles.idxMetaStrong}>{c.pages.length} page{c.pages.length === 1 ? "" : "s"}</span>
                </span>
                {weekCount > 0 ? (
                  <span className={styles.idxChanges}>
                    <span className={styles.idxSquare} aria-hidden="true" />
                    {weekCount} change{weekCount === 1 ? "" : "s"} this week
                  </span>
                ) : (
                  <span className={styles.idxNoChanges}>No changes yet</span>
                )}
              </div>
              <span className={styles.idxAllTime}>
                {allTime} change{allTime === 1 ? "" : "s"} since we started watching
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
