// Pure digest assembly — the testable heart of the weekly job. Takes the raw
// users→competitors→pages→changes tree and returns, per user, only the
// meaningful changes from the trailing 7 days, grouped by competitor. Users
// (and competitors, and pages) with nothing to report are dropped entirely, so
// callers never email "nothing changed" (SPEC.md F6).

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type RawChange = {
  summary: string | null;
  is_meaningful: boolean;
  detected_at: string;
};

export type RawPage = { label: string; url: string; changes: RawChange[] };
export type RawCompetitor = { name: string; pages: RawPage[] };
export type RawUser = {
  id: string;
  email: string;
  competitors: RawCompetitor[];
};

export type DigestLine = { pageLabel: string; url: string; summary: string; detectedAt: string };
export type DigestCompetitor = { name: string; lines: DigestLine[] };
export type UserDigest = {
  userId: string;
  email: string;
  competitors: DigestCompetitor[];
  changeCount: number;
};

// A meaningful change whose LLM summary was unavailable still belongs in the
// digest — we just say so plainly rather than dropping a real change.
const FALLBACK_SUMMARY = "This page changed meaningfully (summary unavailable).";

function isRecentMeaningful(change: RawChange, now: number): boolean {
  if (!change.is_meaningful) return false;
  return now - new Date(change.detected_at).getTime() <= WEEK_MS;
}

export function buildDigests(users: RawUser[], now: number): UserDigest[] {
  const digests: UserDigest[] = [];

  for (const user of users) {
    const competitors: DigestCompetitor[] = [];
    let changeCount = 0;

    for (const competitor of user.competitors) {
      const lines: DigestLine[] = [];

      for (const page of competitor.pages) {
        for (const change of page.changes) {
          if (!isRecentMeaningful(change, now)) continue;
          lines.push({
            pageLabel: page.label,
            url: page.url,
            summary: change.summary?.trim() || FALLBACK_SUMMARY,
            detectedAt: change.detected_at,
          });
        }
      }

      if (lines.length > 0) {
        // Newest first within a competitor.
        lines.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
        competitors.push({ name: competitor.name, lines });
        changeCount += lines.length;
      }
    }

    if (changeCount > 0) {
      digests.push({ userId: user.id, email: user.email, competitors, changeCount });
    }
  }

  return digests;
}
