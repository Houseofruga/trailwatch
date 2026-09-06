import { createServiceClient } from "@/lib/supabase/service";
import { isMeaningfulChange } from "@/features/checks/noiseFilter";
import { getSummarizer } from "@/features/summaries";
import { listCaptures, fetchArchivedText, type Capture } from "./wayback";

// Owner ask: keep the first load fast and the LLM/fetch cost bounded.
const MAX_CAPTURES = 4; // → at most 3 consecutive diffs
const EXCERPT_CAP = 4000; // mirrors runCheck.ts
const FALLBACK_SUMMARY = "This page changed meaningfully (summary unavailable).";

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

    const summary = await summarize(page.label, before.text, after.text, verdict.reason);

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

// A meaningful diff always yields a row; a declined/failed summary falls back to
// plain wording rather than dropping a real change (mirrors runCheck.ts).
async function summarize(
  label: string,
  oldText: string,
  newText: string,
  reason: string,
): Promise<string> {
  try {
    const out = await getSummarizer().summarize({ label, oldText, newText });
    if ("summary" in out) return out.summary;
    return `${reason} (summary unavailable)`;
  } catch {
    return FALLBACK_SUMMARY;
  }
}

// Run an async map one at a time — we're being polite to archive.org and keeping
// peak memory/connections low; the capture set is tiny (≤4).
async function sequential<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (const item of items) out.push(await fn(item));
  return out;
}
