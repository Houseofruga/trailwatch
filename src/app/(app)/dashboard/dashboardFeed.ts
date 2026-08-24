import type { CompetitorRow } from "@/features/competitors/queries";

// Small shared helpers for the "this week" feed, used by both the real dashboard
// (page.tsx) and the display-only demo (DemoDashboard.tsx).

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// "This week" = the trailing 7 days.
export function withinWeek(detectedAt: string, now: number): boolean {
  return now - new Date(detectedAt).getTime() <= WEEK_MS;
}

// "18 Aug 2026" — day-month-year, matching the change-detail design.
export function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// "11 Aug" — day-month, for the before/after excerpt labels.
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function timeAgo(detectedAt: string, now: number): string {
  const mins = Math.round((now - new Date(detectedAt).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

// The most recent meaningful change on a page, if any — the sentence worth
// showing. Trivial changes stay counted-but-unshown (the low-noise edge).
export function latestMeaningful(page: CompetitorRow["pages"][number]) {
  return page.changes.find((c) => c.isMeaningful) ?? null;
}
