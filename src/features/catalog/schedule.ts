import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { CATALOG_CONFIG } from "./config";
import { runCatalogCheck, type CatalogCheckResult } from "./runCatalogCheck";

const minutesFromNow = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

/**
 * Take a store for checking if it's due. The conditional update is the lock:
 * under concurrent runners (overlapping ticks, or a tick racing the add-flow
 * check) Postgres re-evaluates `next_check_at <= now` after the row lock, so
 * exactly one runner wins. The lease pushes next_check_at out so a runner that
 * dies mid-check just makes the store due again later.
 */
async function claim(service: SupabaseClient, storeId: string): Promise<boolean> {
  const { data, error } = await service
    .from("stores")
    .update({ next_check_at: minutesFromNow(CATALOG_CONFIG.claimLeaseMinutes) })
    .eq("id", storeId)
    .lte("next_check_at", new Date().toISOString())
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** Claim → check → schedule the next check. Null if the store wasn't due. */
export async function checkStoreIfDue(
  storeId: string,
  service: SupabaseClient = createServiceClient(),
): Promise<CatalogCheckResult | null> {
  if (!(await claim(service, storeId))) return null;

  let result: CatalogCheckResult;
  try {
    result = await runCatalogCheck(service, storeId);
  } catch (err) {
    result = { status: "error", message: err instanceof Error ? err.message : String(err) };
    await service
      .from("stores")
      .update({ check_status: "error", check_error: result.message })
      .eq("id", storeId);
  }

  const next =
    result.status === "error"
      ? minutesFromNow(CATALOG_CONFIG.errorRetryMinutes)
      : minutesFromNow(CATALOG_CONFIG.defaultCheckIntervalHours * 60);
  await service.from("stores").update({ next_check_at: next }).eq("id", storeId);
  return result;
}

export type CatalogTickResult = {
  checked: number;
  changed: number;
  events: number;
  errors: number;
  // Due stores left for the next tick (budget ran out).
  remaining: boolean;
};

/**
 * The frequent tick (pg_cron → /api/cron/catalog): check due stores, oldest
 * first, until the time budget runs out. Only stores someone follows are
 * crawled — an unfollowed store costs nothing.
 */
export async function runCatalogTick(budgetMs: number = CATALOG_CONFIG.tickBudgetMs): Promise<CatalogTickResult> {
  const service = createServiceClient();
  const deadline = Date.now() + budgetMs;
  const totals: CatalogTickResult = { checked: 0, changed: 0, events: 0, errors: 0, remaining: false };

  while (Date.now() < deadline) {
    const { data: due, error } = await service
      .from("stores")
      .select("id, competitors!inner(id)")
      .lte("next_check_at", new Date().toISOString())
      .order("next_check_at", { ascending: true })
      .limit(CATALOG_CONFIG.tickBatchSize);
    if (error) throw error;
    if (!due || due.length === 0) return totals;

    for (const { id } of due) {
      if (Date.now() >= deadline) return { ...totals, remaining: true };
      const result = await checkStoreIfDue(id, service);
      if (!result) continue; // another runner took it
      totals.checked += 1;
      if (result.status === "error") totals.errors += 1;
      if (result.status === "changed") {
        totals.changed += 1;
        totals.events += result.events;
      }
    }
  }
  return { ...totals, remaining: true };
}
