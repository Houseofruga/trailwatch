import { createServiceClient } from "@/lib/supabase/service";
import { runCheckForPage } from "./runCheck";
import { backfillPage } from "@/features/backfill/backfill";

export type DailyCheckResult = {
  pages: number;
  changesRecorded: number;
  errors: number;
  backfilled: number;
};

// Cap the per-run backfill sweep so the heavy archive work (multiple Wayback
// fetches + summaries per page) stays well within the cron's 5-min budget. It's
// guarded/once-per-page, so any remainder is picked up on the next daily run.
const MAX_BACKFILL_PER_RUN = 8;

// The daily check job (SPEC.md F3 / build-order slice 7). Runs the check engine
// across every active page. No logged-in user here, so reads go through the
// service client. One page's failure — a fetch timeout, a bad URL — must not
// stop the batch, so each check is isolated.
export async function runDailyChecks(): Promise<DailyCheckResult> {
  const service = createServiceClient();

  const { data: pages, error } = await service
    .from("pages")
    .select("id, url, label, backfilled_at")
    .eq("is_active", true);
  if (error) throw error;

  let changesRecorded = 0;
  let errors = 0;

  for (const page of pages ?? []) {
    try {
      const result = await runCheckForPage(page.id, service);
      if (result.status === "recorded" && result.meaningful) changesRecorded += 1;
    } catch (err) {
      errors += 1;
      console.error(`Daily check failed for page ${page.id}:`, err);
    }
  }

  // Background warming: reconstruct Wayback history for pages that have never been
  // backfilled, so the dashboard's "Last notable change" fills in across all pages
  // over time — not just ones the user has added since, or clicked into. Guarded by
  // backfilled_at (stamped before the work → runs at most once per page) and bounded
  // per run; sequential to avoid hammering the archive.
  let backfilled = 0;
  const needsBackfill = (pages ?? [])
    .filter((p) => !p.backfilled_at)
    .slice(0, MAX_BACKFILL_PER_RUN);
  for (const page of needsBackfill) {
    try {
      await service.from("pages").update({ backfilled_at: new Date().toISOString() }).eq("id", page.id);
      const n = await backfillPage(page.id, { url: page.url, label: page.label });
      if (n > 0) backfilled += 1;
    } catch (err) {
      console.error(`Backfill warming failed for page ${page.id}:`, err);
    }
  }

  return { pages: pages?.length ?? 0, changesRecorded, errors, backfilled };
}
