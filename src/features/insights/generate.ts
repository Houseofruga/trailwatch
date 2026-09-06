import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getInsightProvider } from "./provider";
import type { PageInsightState, PageProfile } from "./types";

/**
 * Return the cached baseline profile for a page, generating (and caching) it once
 * from the page's first snapshot if absent. Reuses the competitor-teardown AI
 * (positioning / pricing / what-to-watch) on the snapshot text we already store
 * on add — no re-fetch. Reads are RLS-scoped to the caller (an unowned pageId
 * simply isn't found); the write uses the service client, like the check engine.
 *
 * Fully defensive: any DB/model error (incl. the page_insights table not existing
 * yet before the migration is applied) resolves to a quiet "unavailable" so the
 * UI just hides the card rather than throwing.
 */
export async function getOrCreatePageInsight(pageId: string): Promise<PageInsightState> {
  try {
    const user = await createClient();

    const { data: page } = await user
      .from("pages")
      .select("id, url, label, latest_snapshot_id, competitors(name)")
      .eq("id", pageId)
      .single();
    if (!page) return { status: "not-found" };

    // The parent competitor's name (a to-one relation may come back as an object
    // or a single-element array depending on the client) — a hint for the prompt.
    const rel = page.competitors as { name?: string } | { name?: string }[] | null;
    const competitorName = (Array.isArray(rel) ? rel[0]?.name : rel?.name) ?? "";

    // Cached?
    const { data: cached } = await user
      .from("page_insights")
      .select("profile")
      .eq("page_id", pageId)
      .maybeSingle();
    if (cached?.profile) return { status: "ready", profile: cached.profile as PageProfile };

    // Need the baseline snapshot text to analyze.
    if (!page.latest_snapshot_id) return { status: "pending" };
    const { data: snap } = await user
      .from("snapshots")
      .select("content_text")
      .eq("id", page.latest_snapshot_id)
      .single();
    const text = snap?.content_text?.trim();
    if (!text) return { status: "pending" };

    const outcome = await getInsightProvider().analyzePage({
      competitorName,
      label: page.label,
      url: page.url,
      text,
    });
    if (!outcome.ok) return { status: "unavailable" };

    const profile: PageProfile = outcome.profile;

    // Persist via service role (RLS has no insert policy — same pattern as snapshots).
    const service = createServiceClient();
    await service
      .from("page_insights")
      .upsert(
        { page_id: pageId, profile, model: outcome.provider },
        { onConflict: "page_id" },
      );

    return { status: "ready", profile };
  } catch {
    return { status: "unavailable" };
  }
}
