"use client";

import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconCheck, IconChevronLeft, IconChevronRight } from "@/components/ui/icons";
import type { Briefing, BriefingPanel, HomeSummary } from "@/features/appData/types";
import styles from "./BriefingCard.module.css";

// Home · "This week's briefing" (DESIGN 04b): the latest Monday briefing in the
// app, with arrows back through earlier weeks. Hidden when the briefing is off.

const IconFlag = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 21V4" />
    <path d="M5 4h12l-2 4 2 4H5" />
  </svg>
);

const IconMail = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18v12H3z" />
    <path d="M3 7l9 6 9-6" />
  </svg>
);

function weekLabel(weekStart: string): string {
  return `Week of ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${weekStart}T00:00:00Z`))}`;
}

/** "on Monday at 8:00 AM" (latest), "on Monday, Sep 28 at 8:00 AM" (earlier weeks). */
function sentLine(iso: string, timeZone: string, withDate: boolean): string {
  const d = new Date(iso);
  const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(d);
  const day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" }).format(d);
  const date = new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(d);
  return withDate ? `on ${day}, ${date} at ${time}` : `on ${day} at ${time}`;
}

/** "Monday, Oct 5 at 8:00 AM". */
function firstLine(iso: string, timeZone: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "short", day: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(d);
  return `${day} at ${time}`;
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "your competitors";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function Head({ children, nav }: { children?: React.ReactNode; nav?: React.ReactNode }) {
  return (
    <div className={styles.head}>
      <div className={styles.headLeft}>
        <h2 className={styles.title} id="briefing-title">
          This week&rsquo;s briefing
        </h2>
        {children}
      </div>
      {nav}
    </div>
  );
}

function TopMoves({ briefing }: { briefing: Briefing }) {
  return (
    <div className={styles.block}>
      <h3 className={styles.label}>Top moves</h3>
      <ol className={styles.moves}>
        {briefing.topMoves.map((t, i) => {
          const inner = (
            <>
              <Avatar name={t.competitorName ?? t.headline} domain={t.domain} size={24} />
              <span className={styles.moveText}>
                <span className={styles.moveHeadline}>{t.headline}</span>
                {t.why ? <span className={styles.moveWhy}>{t.why}</span> : null}
              </span>
              {t.competitorId ? (
                <span className={styles.chevron}>
                  <IconChevronRight />
                </span>
              ) : null}
            </>
          );
          return (
            <li key={i} className={styles.moveItem}>
              {t.competitorId ? (
                <Link className={styles.moveRow} href={`/competitors/${t.competitorId}?from=home${t.moveId ? `#move-${t.moveId}` : ""}`}>
                  {inner}
                </Link>
              ) : (
                <div className={styles.moveRow}>{inner}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function BriefingCard({
  panel,
  next,
  loading,
}: {
  panel: BriefingPanel;
  /** null when the briefing is turned off: the card is hidden (DESIGN 04b · 6). */
  next: HomeSummary["nextBriefing"];
  loading?: boolean;
}) {
  const [index, setIndex] = useState(0);
  if (!next) return null;

  if (loading) {
    return (
      <section className={styles.card} aria-labelledby="briefing-title" aria-busy="true">
        <Head>
          <span className={styles.skel} style={{ width: 88, height: 10 }} />
        </Head>
        <div className={styles.body}>
          <span className="visually-hidden">Loading this week&rsquo;s briefing</span>
          <div className={styles.grid}>
            <div className={`${styles.skelMove} ${styles.primary}`}>
              <span className={styles.skel} style={{ width: "40%", height: 10 }} />
              <span className={styles.skel} style={{ width: "95%", height: 14 }} />
              <span className={styles.skel} style={{ width: "70%", height: 14 }} />
            </div>
            <div className={styles.secondary}>
              <span className={styles.skel} style={{ width: "45%", height: 10 }} />
              <span className={styles.skel} style={{ width: "100%", height: 10 }} />
              <span className={styles.skel} style={{ width: "100%", height: 10 }} />
              <span className={styles.skel} style={{ width: "60%", height: 10 }} />
            </div>
          </div>
          <div className={styles.block}>
            <span className={styles.skel} style={{ width: 80, height: 10 }} />
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.skelRow}>
                <span className={styles.skel} style={{ width: 24, height: 24 }} />
                <span className={styles.skelLines}>
                  <span className={styles.skel} style={{ width: "55%", height: 10 }} />
                  <span className={styles.skel} style={{ width: "80%", height: 8 }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Before the first Monday (DESIGN 04b · 5).
  if (panel.briefings.length === 0) {
    return (
      <section className={styles.card} aria-labelledby="briefing-title">
        <Head>
          <Badge tone="info">Starts Monday</Badge>
        </Head>
        <div className={styles.note}>
          <span className={`${styles.noteIcon} ${styles.noteIconMail}`}>
            <IconMail size={20} />
          </span>
          <div className={styles.noteText}>
            <p className={styles.noteTitle}>Your first briefing arrives {firstLine(next.at, next.timeZone)}</p>
            <p className={styles.noteSub}>Every Monday, it sums up last week&rsquo;s competitor moves:</p>
            <ul className={styles.ticks}>
              <li>
                <IconCheck />
                The one move worth making this week
              </li>
              <li>
                <IconCheck />
                What your competitors&rsquo; changes mean for you
              </li>
              <li>
                <IconCheck />
                The top moves, each linked to the details
              </li>
            </ul>
          </div>
        </div>
        <div className={styles.foot}>
          <Link href="/settings#briefing" className={styles.footLink}>
            Change time in Settings
          </Link>
          <span className={styles.sent}>
            <IconMail />
            We&rsquo;ll also email it to {next.to}
          </span>
        </div>
      </section>
    );
  }

  const b = panel.briefings[index];
  const latest = index === 0;
  const quiet = b.moves === 0;
  const nav = (
    <div className={styles.nav}>
      <Button
        variant="grey"
        iconOnly
        aria-label="Previous briefing"
        icon={<IconChevronLeft />}
        disabled={index >= panel.briefings.length - 1}
        onClick={() => setIndex((i) => i + 1)}
      />
      <Button
        variant="grey"
        iconOnly
        aria-label="Next briefing"
        icon={<IconChevronRight />}
        disabled={latest}
        onClick={() => setIndex((i) => i - 1)}
      />
    </div>
  );
  const sent = (
    <span className={styles.sent}>
      <IconMail />
      Sent to {next.to} {sentLine(b.sentAt, next.timeZone, !latest)}
    </span>
  );

  return (
    <section className={styles.card} aria-labelledby="briefing-title">
      <Head nav={nav}>
        <span className={styles.week}>{weekLabel(b.weekStart)}</span>
        <Badge>{`${b.moves} ${b.moves === 1 ? "move" : "moves"}`}</Badge>
      </Head>

      {quiet ? (
        // DESIGN 04b · 4
        <div className={styles.note}>
          <span className={`${styles.noteIcon} ${styles.noteIconQuiet}`}>
            <IconCheck />
          </span>
          <div className={styles.noteText}>
            <p className={styles.noteTitle}>Quiet week.</p>
            <p className={styles.noteBody}>None of your competitors made a move worth flagging.</p>
            <p className={styles.noteSub}>
              We checked {listNames(panel.checkedStores)} every {panel.checkIntervalHours} hours. Nothing to react to, so
              no suggested move.
            </p>
          </div>
        </div>
      ) : (
        <div className={styles.body}>
          {b.whatThisMeans ? (
            <div className={styles.grid}>
              <OneMove text={b.suggestedMove} />
              <div className={styles.secondary}>
                <h3 className={styles.label}>What this means for you</h3>
                <p className={styles.meaning}>{b.whatThisMeans}</p>
              </div>
            </div>
          ) : b.suggestedMove ? (
            // The plain version (DESIGN 04b · 3): the one move, full width.
            <OneMove text={b.suggestedMove} plain />
          ) : null}
          {b.topMoves.length ? <TopMoves briefing={b} /> : null}
        </div>
      )}

      <div className={styles.foot}>
        <div className={styles.footLinks}>
          {!quiet ? (
            <a href="#recent-moves" className={styles.footLink}>
              See all {b.moves} {b.moves === 1 ? "move" : "moves"}
            </a>
          ) : null}
          {!latest ? (
            <button type="button" className={styles.footButton} onClick={() => setIndex(0)}>
              Back to this week
            </button>
          ) : null}
          {!panel.personalised && !quiet ? (
            <Link href="/settings#your-store" className={styles.footLinkQuiet}>
              Add your store to compare prices with yours
            </Link>
          ) : null}
        </div>
        {sent}
      </div>
    </section>
  );
}

function OneMove({ text, plain }: { text: string; plain?: boolean }) {
  return (
    <div className={`${styles.oneMove} ${plain ? "" : styles.primary}`}>
      <div className={styles.oneMoveLabel}>
        <IconFlag />
        One move for this week
      </div>
      <p className={plain ? styles.oneMoveTextPlain : styles.oneMoveText}>{text}</p>
    </div>
  );
}
