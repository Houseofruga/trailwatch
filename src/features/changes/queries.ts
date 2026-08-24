import { createClient } from "@/lib/supabase/server";
import { domainOf, formatFullDate, formatShortDate } from "@/app/(app)/dashboard/dashboardFeed";

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
};

// Shape we cast the (untyped) Supabase select into.
type ChangeRow = {
  summary: string | null;
  detected_at: string;
  excerpt_before: string | null;
  excerpt_after: string | null;
  page_id: string;
  from_snapshot: { fetched_at: string } | null;
  pages: { label: string; url: string; competitors: { name: string } | null } | null;
};

function realIgnoredNote(n: number): string {
  if (n <= 0) return "";
  return `${n} other edit${n === 1 ? "" : "s"} on this page ${n === 1 ? "was" : "were"} ignored as boilerplate.`;
}

// One meaningful change, by id, for the signed-in user. RLS scopes the read to
// the caller's own data, so an unowned or missing id simply returns null → 404.
export async function getRealChangeDetail(changeId: string): Promise<ChangeDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("changes")
    .select(
      "summary, detected_at, excerpt_before, excerpt_after, page_id, from_snapshot:snapshots!from_snapshot_id ( fetched_at ), pages ( label, url, competitors ( name ) )",
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
    pageLabel: row.pages.label,
    url: row.pages.url,
    domain: domainOf(row.pages.url),
    summary: row.summary ?? "Meaningful change detected.",
    detectedDate: formatFullDate(row.detected_at),
    beforeDate: row.from_snapshot ? formatShortDate(row.from_snapshot.fetched_at) : "—",
    afterDate: formatShortDate(row.detected_at),
    before: row.excerpt_before ?? "",
    after: row.excerpt_after ?? "",
    ignoredNote: realIgnoredNote(count ?? 0),
  };
}
