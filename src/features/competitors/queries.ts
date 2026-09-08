import { createClient } from "@/lib/supabase/server";
import { labelToType, type PageType } from "./pageTypes";

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
  // The dashboard grouping key — pages of the same type across competitors share
  // a card. Distinct from `label` (the free-text page name).
  pageType: PageType;
  // When the page was first added — the "Tracking since" line on the detail view.
  createdAt: string;
  // All-time meaningful changes for this page (live + archive-backfilled) — the
  // "N changes since adding" / "since watching" metric. Derived from the fetched
  // rows, so no extra query.
  meaningfulTotal: number;
  isActive: boolean;
  lastCheckedAt: string | null;
  // Last check outcome — 'broken' (a 4xx, usually a wrong/404 URL), 'error' (a
  // transient failure), 'ok', or null (never checked). Drives the "can't reach
  // this page" state on the dashboard and Competitors board.
  lastCheckStatus: "ok" | "broken" | "error" | null;
  lastCheckError: string | null;
  // When the page's Wayback history was reconstructed (null = not yet). Lets the
  // dashboard tell "no notable change found" apart from "haven't checked yet".
  backfilledAt: string | null;
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
      // page_type (migration 0008) is the dashboard grouping key, written by the
      // add/edit forms. Requires 0008 applied to the DB; falls back to the label-
      // derived type below for any row still on the default.
      "id, name, created_at, pages ( id, url, label, page_type, is_active, last_checked_at, last_check_status, last_check_error, backfilled_at, created_at, changes ( id, summary, is_meaningful, detected_at, source ) )",
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
      // The stored type (0008); older rows on the 'other' default fall back to the
      // label-derived type so grouping stays sensible until they're re-typed.
      pageType:
        ((p as { page_type?: string }).page_type as PageType | undefined) &&
        (p as { page_type?: string }).page_type !== "other"
          ? ((p as { page_type: string }).page_type as PageType)
          : labelToType(p.label),
      createdAt: p.created_at,
      // Every meaningful change ever recorded for this page (live + archive).
      meaningfulTotal: (p.changes ?? []).filter((ch) => ch.is_meaningful).length,
      isActive: p.is_active,
      lastCheckedAt: p.last_checked_at,
      lastCheckStatus: (p.last_check_status as PageRow["lastCheckStatus"]) ?? null,
      lastCheckError: p.last_check_error ?? null,
      backfilledAt: p.backfilled_at ?? null,
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
