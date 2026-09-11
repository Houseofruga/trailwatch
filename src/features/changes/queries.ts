import { createClient } from "@/lib/supabase/server";
import { domainOf, formatFullDate, formatShortDate } from "@/app/(app)/dashboard/dashboardFeed";
import { getDemoChangeDetail } from "@/features/demo/demoFeed";
import { labelToType, pageTypeLabel } from "@/features/competitors/pageTypes";

// The view-model for the change-detail page. Both the real (DB) and demo (static)
// sources resolve to this shape, so the page renders one way.
export type ChangeDetail = {
  competitorName: string;
  pageLabel: string;
  url: string;
  domain: string;
  summary: string;
  detectedDate: string; // "18 Aug 2026"
  beforeDate: string; // "11 Aug"
  afterDate: string; // "18 Aug"
  before: string;
  after: string;
  // The trailing sentence of the "excerpt only…" note, e.g.
  // "4 other edits on this page were ignored as boilerplate." May be empty.
  ignoredNote: string;
  // Non-empty for archive-reconstructed changes (Phase 2 backfill).
  provenanceNote: string;
  // True for archive-reconstructed changes — drives the "Web archive" badge + callout.
  isArchive: boolean;
};

// Shape we cast the (untyped) Supabase select into.
type ChangeRow = {
  summary: string | null;
  detected_at: string;
  excerpt_before: string | null;
  excerpt_after: string | null;
  page_id: string;
  source: string | null;
  compared_from_at: string | null;
  from_snapshot: { fetched_at: string } | null;
  pages: { label: string; page_type: string | null; url: string; competitors: { name: string } | null } | null;
};

function realIgnoredNote(n: number): string {
  if (n <= 0) return "";
  return `${n} other edit${n === 1 ? "" : "s"} on this page ${n === 1 ? "was" : "were"} ignored as boilerplate.`;
}

// Resolve a change detail by id from whichever source owns it — the display-only
// demo feed (demo- ids) or the real DB. Shared by the full page and the modal so
// the demo/real branch lives in one place.
export async function getChangeDetail(id: string, now: number): Promise<ChangeDetail | null> {
  return id.startsWith("demo-") ? getDemoChangeDetail(id, now) : await getRealChangeDetail(id);
}

// One meaningful change, by id, for the signed-in user. RLS scopes the read to
// the caller's own data, so an unowned or missing id simply returns null → 404.
export async function getRealChangeDetail(changeId: string): Promise<ChangeDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("changes")
    .select(
      "summary, detected_at, excerpt_before, excerpt_after, page_id, source, compared_from_at, from_snapshot:snapshots!from_snapshot_id ( fetched_at ), pages ( label, page_type, url, competitors ( name ) )",
    )
    .eq("id", changeId)
    .eq("is_meaningful", true)
    .single();

  if (error || !data) return null;
  const row = data as unknown as ChangeRow;
  if (!row.pages) return null;

  // How many trivial edits on the same page the filter dropped.
  const { count } = await supabase
    .from("changes")
    .select("id", { count: "exact", head: true })
    .eq("page_id", row.page_id)
    .eq("is_meaningful", false);

  return {
    competitorName: row.pages.competitors?.name ?? "Competitor",
    // The page's display name is its type (no free text) — mirror the
    // dashboard/detail rule: prefer the stored type, fall back to label-derived.
    pageLabel: pageTypeLabel(
      row.pages.page_type && row.pages.page_type !== "other" ? row.pages.page_type : labelToType(row.pages.label),
    ),
    url: row.pages.url,
    domain: domainOf(row.pages.url),
    summary: row.summary ?? "Meaningful change detected.",
    detectedDate: formatFullDate(row.detected_at),
    // Archive rows have no snapshot; their before-date is carried on the row.
    beforeDate: row.compared_from_at
      ? formatShortDate(row.compared_from_at)
      : row.from_snapshot
        ? formatShortDate(row.from_snapshot.fetched_at)
        : "—",
    afterDate: formatShortDate(row.detected_at),
    before: row.excerpt_before ?? "",
    after: row.excerpt_after ?? "",
    ignoredNote: realIgnoredNote(count ?? 0),
    provenanceNote:
      row.source === "archive"
        ? "Reconstructed from the Wayback Machine, so the exact wording may differ from the live page."
        : "",
    isArchive: row.source === "archive",
  };
}
