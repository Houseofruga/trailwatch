import { after } from "next/server";
import { getOrCreatePageInsight } from "@/features/insights/generate";
import { loadPageHistory } from "@/features/backfill/actions";

// Bound the post-response work so warming can't blow the function budget. Any
// pages beyond this stay cold and fall back to lazy-on-view loading, which is
// always available. Backfill (Wayback fetch + a few LLM summaries) dominates the
// per-page cost, so this is deliberately small.
const MAX_WARM_PAGES = 6;

/**
 * Day-0 warming (owner ask): after the add/onboarding response is sent, pre-build
 * each new page's baseline profile and reconstruct its Wayback history — so the
 * adaptive dashboard already has value on the user's first visit, instead of every
 * quiet card lazy-loading. Runs via Next's `after()` (post-response, same
 * invocation, respects the route's maxDuration).
 *
 * Best-effort and safe by construction: both calls are idempotent and cached
 * (`getOrCreatePageInsight` upserts; `loadPageHistory` guards on
 * `pages.backfilled_at`), each is wrapped so one failure never aborts the rest,
 * and the lazy-on-view path stays the fallback if the budget runs out first.
 */
export function warmPages(pageIds: string[]): void {
  const ids = pageIds.slice(0, MAX_WARM_PAGES);
  if (ids.length === 0) return;

  after(async () => {
    for (const id of ids) {
      // Baseline first — it's the cheaper call and the primary quiet-card value.
      try {
        await getOrCreatePageInsight(id);
      } catch {
        // ignore — the dashboard card will lazy-load it
      }
      try {
        await loadPageHistory(id);
      } catch {
        // ignore — the HistoryPanel / "last notable change" will lazy-load it
      }
    }
  });
}
