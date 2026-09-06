"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { backfillPage } from "./backfill";
import { getPageHistory } from "./queries";
import type { PageHistoryState } from "./types";

/**
 * Load a page's Wayback history for the HistoryPanel. Lazy + cached, like the
 * Phase-1 baseline: if the page has already been backfilled, read the stored
 * rows; otherwise run the backfill once (guarded by pages.backfilled_at, which
 * is stamped *before* the work so a double-invoke can't double-run it) and then
 * read them. Any error degrades to "unavailable" so the panel just hides.
 *
 * Ownership: the initial read uses the RLS-scoped user client, so an unowned
 * pageId is simply not found — the service client is only used for the
 * backfilled_at stamp and the inserts inside backfillPage.
 */
export async function loadPageHistory(pageId: string): Promise<PageHistoryState> {
  if (typeof pageId !== "string" || !pageId) return { status: "not-found" };

  try {
    const user = await createClient();
    const { data: page } = await user
      .from("pages")
      .select("id, url, label, backfilled_at")
      .eq("id", pageId)
      .single();
    if (!page) return { status: "not-found" };

    if (!page.backfilled_at) {
      // Stamp first (optimistic guard), then do the work.
      const service = createServiceClient();
      await service
        .from("pages")
        .update({ backfilled_at: new Date().toISOString() })
        .eq("id", pageId);
      await backfillPage(pageId, { url: page.url, label: page.label });
    }

    const items = await getPageHistory(pageId);
    return items.length > 0 ? { status: "ready", items } : { status: "empty" };
  } catch {
    return { status: "unavailable" };
  }
}
