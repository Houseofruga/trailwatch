import { createClient } from "@/lib/supabase/server";

export type ChangeRow = {
  id: string;
  summary: string | null;
  isMeaningful: boolean;
  detectedAt: string;
};

export type PageRow = {
  id: string;
  url: string;
  label: string;
  isActive: boolean;
  lastCheckedAt: string | null;
  // Newest first. Includes trivial (filtered) changes so the dashboard can
  // count "trivial edits filtered" without a second query.
  changes: ChangeRow[];
  // The most recent archive-backfilled ("last notable change") row, if this page
  // has been backfilled. Kept out of `changes` (the "this week" feed) but surfaced
  // on a quiet page's dashboard card as a "last notable change" link. Null until
  // the page's history has been reconstructed — the dashboard never triggers that.
  lastArchived: ChangeRow | null;
};

export type CompetitorRow = {
  id: string;
  name: string;
  createdAt: string;
  pages: PageRow[];
};

// Shared by the manage screen and the dashboard — both need "my competitors,
// each with their pages, newest competitor first." Pages carry their recent
// changes so the dashboard can render summaries; the manage screen ignores them.
export async function getCompetitorsWithPages(): Promise<CompetitorRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("competitors")
    .select(
      "id, name, created_at, pages ( id, url, label, is_active, last_checked_at, created_at, changes ( id, summary, is_meaningful, detected_at, source ) )",
    )
    .order("created_at", { ascending: false })
    .order("created_at", { ascending: true, referencedTable: "pages" })
    .order("detected_at", { ascending: false, referencedTable: "pages.changes" });

  if (error) throw error;

  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    createdAt: c.created_at,
    pages: (c.pages ?? []).map((p) => ({
      id: p.id,
      url: p.url,
      label: p.label,
      isActive: p.is_active,
      lastCheckedAt: p.last_checked_at,
      // Archive-backfilled changes live only in the per-page HistoryPanel and
      // change-detail — never in the "this week" dashboard feed.
      changes: (p.changes ?? [])
        .filter((ch) => (ch as { source?: string }).source !== "archive")
        .map((ch) => ({
          id: ch.id,
          summary: ch.summary,
          isMeaningful: ch.is_meaningful,
          detectedAt: ch.detected_at,
        })),
      // Rows are ordered detected_at desc, so the first archive row is the most
      // recent backfilled change — the "last notable change" a quiet page shows.
      lastArchived: (() => {
        const a = (p.changes ?? []).find(
          (ch) => (ch as { source?: string }).source === "archive",
        );
        return a
          ? { id: a.id, summary: a.summary, isMeaningful: a.is_meaningful, detectedAt: a.detected_at }
          : null;
      })(),
    })),
  }));
}
