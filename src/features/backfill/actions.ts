"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { backfillPage } from "./backfill";
import { getPageHistory } from "./queries";
import type { PageHistoryState } from "./types";

/**
 * Load a page's Wayback history for the HistoryPanel. Lazy + cached, like the
 * Phase-1 baseline: if the page has already been backfilled, read the stored
 * rows; otherwise run the backfill once and then read them. Any error degrades to
 * "unavailable" so the panel just hides.
 *
 * `backfilled_at` is stamped *before* the work as a double-run guard (a concurrent
 * invoke sees it set and skips). But if the archive was merely unreachable, we
 * CLEAR the stamp again so the page is retried on a later view or the daily cron —
 * otherwise a transient Wayback failure would cache a permanent, wrong "no
 * history" and leave the day-0 dashboard emptier than it should be. A genuinely
 * thin archive (reached, no usable diffs) keeps the stamp — that's a real result.
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
      const service = createServiceClient();
      // Stamp first (double-run guard), then do the work.
      await service
        .from("pages")
        .update({ backfilled_at: new Date().toISOString() })
        .eq("id", pageId);
      const result = await backfillPage(pageId, { url: page.url, label: page.label }).catch(() => ({
        ok: false as const,
        rows: 0,
      }));
      if (!result.ok) {
        // Archive unreachable — clear the guard so we retry instead of caching a
        // false "no history", and surface a retryable state now.
        await service.from("pages").update({ backfilled_at: null }).eq("id", pageId);
        return { status: "unavailable" };
      }
    }

    const items = await getPageHistory(pageId);
    return items.length > 0 ? { status: "ready", items } : { status: "empty" };
  } catch {
    return { status: "unavailable" };
  }
}
