import { createClient } from "@/lib/supabase/server";
import type { PageHistoryItem } from "./types";

// A page's full change history, newest first — both live-detected changes and
// archive-reconstructed ones, so the most recent change always appears at the
// top (not just the Wayback backfill). RLS-scoped to the caller via the existing
// "read own changes" policy, so an unowned page returns nothing.
export async function getPageHistory(pageId: string): Promise<PageHistoryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("changes")
    .select("id, summary, detected_at, source")
    .eq("page_id", pageId)
    .eq("is_meaningful", true)
    .order("detected_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((c) => ({
    id: c.id as string,
    summary: (c.summary as string | null) ?? "Meaningful change detected.",
    detectedAt: c.detected_at as string,
    isArchive: (c.source as string | null) === "archive",
  }));
}
