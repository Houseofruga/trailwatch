import { createServiceClient } from "@/lib/supabase/service";
import { isMeaningfulChange } from "@/features/checks/noiseFilter";
import { getSummarizer } from "@/features/summaries";
import { listCaptures, fetchArchivedText, type Capture } from "./wayback";

// Owner ask: search the last ~6 months for a notable change. Cap the distinct
// captures we diff to keep the LLM/fetch cost bounded — collapse=digest means
// typical competitor pages have few distinct versions in the window, so 8 usually
// covers it; a page with more than this changed often enough that a notable change
// almost always surfaces anyway.
const MAX_CAPTURES = 8; // → at most 7 consecutive diffs
const EXCERPT_CAP = 4000; // mirrors runCheck.ts
const FALLBACK_SUMMARY = "This page changed — open it to see what's different.";

type ArchiveChange = {
  page_id: string;
  from_snapshot_id: null;
  to_snapshot_id: null;
  is_meaningful: true;
  filter_reason: string;
  summary: string;
  excerpt_before: string;
  excerpt_after: string;
  detected_at: string;
  compared_from_at: string;
  source: "archive";
};

/**
 * Reconstruct a page's recent history from the Wayback Machine and store the
 * meaningful changes as `source='archive'` rows. Reuses the live pipeline: same
 * extractor/normalizer (in wayback.ts), the same pure noise filter, and the same
 * summarizer seam. Writes with the service client, mirroring runCheck.ts.
 *
 * Idempotent by design: the caller sets pages.backfilled_at before invoking this
 * and only invokes it when that was null, so it runs at most once per page.
 * Returns the number of history rows created (0 on a thin/empty archive).
 */
export async function backfillPage(
  pageId: string,
  page: { url: string; label: string },
): Promise<number> {
  const captures = await listCaptures(page.url, MAX_CAPTURES);
  if (captures.length < 2) return 0; // nothing to diff

  // Fetch each capture's text in order; a failed capture just drops out.
  const texts = await sequential(captures, (c) => fetchArchivedText(c, page.url));

  const rows: ArchiveChange[] = [];
  for (let i = 1; i < captures.length; i++) {
    const before = texts[i - 1];
    const after = texts[i];
    if (!before || !after) continue;
    if (before.hash === after.hash) continue;

    const verdict = isMeaningfulChange(before.text, after.text);
    if (!verdict.meaningful) continue;

    const summary = await summarize(page.label, before.text, after.text);

    rows.push({
      page_id: pageId,
      from_snapshot_id: null,
      to_snapshot_id: null,
      is_meaningful: true,
      filter_reason: verdict.reason,
      summary,
      excerpt_before: before.text.slice(0, EXCERPT_CAP),
      excerpt_after: after.text.slice(0, EXCERPT_CAP),
      detected_at: (captures[i] as Capture).date,
      compared_from_at: (captures[i - 1] as Capture).date,
      source: "archive",
    });
  }

  if (rows.length === 0) return 0;

  const service = createServiceClient();
  const { error } = await service.from("changes").insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}

// A meaningful diff always yields a row. The noise filter has already judged this
// change meaningful, so a "declined as trivial" verdict is just model noise
// (gpt-oss is nondeterministic on large diffs) — retry once before giving up. A
// genuine failure falls back to plain, user-facing wording (the change-detail
// page still shows the full before/after), never the internal filter reason.
async function summarize(label: string, oldText: string, newText: string): Promise<string> {
  const summarizer = getSummarizer();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const out = await summarizer.summarize({ label, oldText, newText });
      if ("summary" in out) return out.summary;
    } catch {
      break; // hard error (rate/network) — a retry won't help; use the fallback
    }
  }
  return FALLBACK_SUMMARY;
}

// Run an async map one at a time — we're being polite to archive.org and keeping
// peak memory/connections low; the capture set is tiny (≤4).
async function sequential<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (const item of items) out.push(await fn(item));
  return out;
}
