// Pure digest assembly — the testable heart of the weekly job. Takes the raw
// users→competitors→pages→changes tree and returns, per user, only the
// meaningful changes from the trailing 7 days, grouped **competitor → page →
// change** so the email can show one section per competitor, the pages within
// it, and the changes on each page (never a flat "HOMEPAGE / HOMEPAGE" stack).
// Users with nothing to report are dropped, so callers never email an empty
// digest (SPEC.md F6). No I/O here — the shape is unit-testable.

import { pageTypeLabel } from "@/features/competitors/pageTypes";
import { siteOf } from "@/features/competitors/domain";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Display caps that keep a big week scannable. Extra changes/competitors are
// still true — they're summarized ("+N more") and live on the dashboard.
export const MAX_CHANGES_PER_PAGE = 2;
export const MAX_COMPETITORS = 4;
// Above this many competitors, the email shows a one-line count-by-competitor
// strip up top so a busy week is legible at a glance.
const SUMMARY_STRIP_MIN_COMPETITORS = 3;

export type RawChange = {
  id?: string | null;
  summary: string | null;
  is_meaningful: boolean;
  detected_at: string;
  source?: string | null;
};

export type RawPage = {
  label: string;
  url: string;
  page_type?: string | null;
  last_check_status?: string | null;
  changes: RawChange[];
};
export type RawCompetitor = { name: string; pages: RawPage[] };
export type RawUser = {
  id: string;
  email: string;
  plan?: string | null; // 'free' | 'paid'
  competitors: RawCompetitor[];
};

export type DigestChange = {
  summary: string;
  when: string; // "2d ago" / "today"
  changeId: string | null; // → /changes/<id>; email builds the absolute URL
  isFallback: boolean; // summary was unavailable — plainer copy + link label
};
export type DigestPage = {
  typeLabel: string; // "Pricing"
  path: string; // "/pricing" — disambiguates same-type pages
  changes: DigestChange[]; // capped to MAX_CHANGES_PER_PAGE
  moreCount: number; // changes beyond the cap on this page
};
export type DigestCompetitor = {
  name: string;
  domain: string; // "notion.so" (registrable host; "" if underivable)
  initials: string; // "NO" — avatar fallback
  changeCount: number; // meaningful changes this week (pre-cap)
  pages: DigestPage[];
};
export type UnreachablePage = { competitor: string; path: string };
export type UserDigest = {
  userId: string;
  email: string;
  plan: "free" | "pro";
  changeCount: number; // total meaningful changes this week (all competitors)
  competitorCount: number; // competitors with ≥1 change this week
  competitors: DigestCompetitor[]; // capped to MAX_COMPETITORS, most active first
  hiddenCompetitorCount: number; // competitors beyond the cap
  hiddenChangeCount: number; // their changes, summed
  summaryStrip: { name: string; count: number }[]; // every competitor, most active first
  showSummaryStrip: boolean;
  trivialFiltered: number; // trivial edits dropped this week (low-noise proof)
  unreachable: UnreachablePage[]; // pages we couldn't reach this week
};

// A meaningful change whose LLM summary was unavailable still belongs in the
// digest — we just say so plainly rather than dropping a real change.
const FALLBACK_SUMMARY = "This page changed — open it to see what's different.";

function inWindow(change: RawChange, now: number): boolean {
  // Archive-backfilled changes are in-app only — never emailed. (They're also
  // historically dated, so the window would exclude them anyway; explicit guard.)
  if (change.source === "archive") return false;
  return now - new Date(change.detected_at).getTime() <= WEEK_MS;
}

function relativeWhen(detectedAt: string, now: number): string {
  const diff = now - new Date(detectedAt).getTime();
  if (diff < DAY_MS) return "today";
  const days = Math.floor(diff / DAY_MS);
  return days === 1 ? "1d ago" : `${days}d ago`;
}

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function pathOf(url: string): string {
  try {
    const p = new URL(url).pathname;
    return p === "" ? "/" : p;
  } catch {
    return "/";
  }
}

function domainOf(pages: RawPage[]): string {
  // Prefer the homepage's host; fall back to the first page that has one.
  const homepage = pages.find((p) => (p.page_type ?? "") === "homepage");
  const ordered = homepage ? [homepage, ...pages] : pages;
  for (const p of ordered) {
    const site = siteOf(p.url);
    if (site) return site;
  }
  return "";
}

export function buildDigests(users: RawUser[], now: number): UserDigest[] {
  const digests: UserDigest[] = [];

  for (const user of users) {
    const built: DigestCompetitor[] = [];
    let trivialFiltered = 0;
    const unreachable: UnreachablePage[] = [];

    for (const competitor of user.competitors) {
      // Carry each page's newest change timestamp so we can order pages by
      // freshness before dropping the key.
      const pages: (DigestPage & { newestAt: string })[] = [];
      let competitorChanges = 0;

      for (const page of competitor.pages) {
        if (page.last_check_status === "broken" || page.last_check_status === "error") {
          unreachable.push({ competitor: competitor.name, path: pathOf(page.url) });
        }

        const recent = page.changes.filter((c) => inWindow(c, now));
        // Trivial edits filtered this week — the low-noise proof line.
        trivialFiltered += recent.filter((c) => !c.is_meaningful).length;

        const meaningful = recent
          .filter((c) => c.is_meaningful)
          .sort((a, b) => b.detected_at.localeCompare(a.detected_at));
        if (meaningful.length === 0) continue;

        competitorChanges += meaningful.length;
        const shown = meaningful.slice(0, MAX_CHANGES_PER_PAGE).map(
          (c): DigestChange => ({
            summary: c.summary?.trim() || FALLBACK_SUMMARY,
            when: relativeWhen(c.detected_at, now),
            changeId: c.id ?? null,
            isFallback: !c.summary?.trim(),
          }),
        );
        pages.push({
          typeLabel: pageTypeLabel(page.page_type ?? "other"),
          path: pathOf(page.url),
          changes: shown,
          moreCount: meaningful.length - shown.length,
          newestAt: meaningful[0].detected_at,
        });
      }

      if (competitorChanges > 0) {
        // Freshest page first within a competitor.
        pages.sort((a, b) => b.newestAt.localeCompare(a.newestAt));
        built.push({
          name: competitor.name,
          domain: domainOf(competitor.pages),
          initials: initialsFor(competitor.name),
          changeCount: competitorChanges,
          // Drop the internal sort key, keeping only the DigestPage shape.
          pages: pages.map(
            (p): DigestPage => ({
              typeLabel: p.typeLabel,
              path: p.path,
              changes: p.changes,
              moreCount: p.moreCount,
            }),
          ),
        });
      }
    }

    const changeCount = built.reduce((n, c) => n + c.changeCount, 0);
    if (changeCount === 0) continue;

    // Most active competitor first.
    built.sort((a, b) => b.changeCount - a.changeCount || a.name.localeCompare(b.name));

    const shownCompetitors = built.slice(0, MAX_COMPETITORS);
    const hidden = built.slice(MAX_COMPETITORS);

    digests.push({
      userId: user.id,
      email: user.email,
      plan: user.plan === "paid" ? "pro" : "free",
      changeCount,
      competitorCount: built.length,
      competitors: shownCompetitors,
      hiddenCompetitorCount: hidden.length,
      hiddenChangeCount: hidden.reduce((n, c) => n + c.changeCount, 0),
      summaryStrip: built.map((c) => ({ name: c.name, count: c.changeCount })),
      showSummaryStrip: built.length >= SUMMARY_STRIP_MIN_COMPETITORS,
      trivialFiltered,
      unreachable,
    });
  }

  return digests;
}
