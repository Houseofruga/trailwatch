import { createClient } from "@/lib/supabase/server";
import type { PageHistoryItem } from "./types";

// A page's reconstructed history, newest first. RLS-scoped to the caller via the
// existing "read own changes" policy, so an unowned page returns nothing.
export async function getPageHistory(pageId: string): Promise<PageHistoryItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("changes")
    .select("id, summary, detected_at")
    .eq("page_id", pageId)
    .eq("source", "archive")
    .eq("is_meaningful", true)
    .order("detected_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((c) => ({
    id: c.id as string,
    summary: (c.summary as string | null) ?? "Meaningful change detected.",
    detectedAt: c.detected_at as string,
  }));
}
