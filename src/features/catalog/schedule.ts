import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/service";
import { CATALOG_CONFIG } from "./config";
import { runCatalogCheck, type CatalogCheckResult } from "./runCatalogCheck";
import { checkStorePages, type StorePagesResult } from "@/features/stores/checkStorePages";

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

export type StoreCheckResult = { catalog: CatalogCheckResult; pages: StorePagesResult | null };

/**
 * Claim → check the store's pages, then its catalog → schedule the next check.
 * Null if the store wasn't due. Pages go first so the homepage's featured
 * products (the top-product signal) are fresh when catalog events get their
 * severity. A page-check failure doesn't block the catalog check.
 */
export async function checkStoreIfDue(
  storeId: string,
  service: SupabaseClient = createServiceClient(),
): Promise<StoreCheckResult | null> {
  if (!(await claim(service, storeId))) return null;

  // Pages are only watched for stores someone follows as a competitor; a store
  // that's only someone's own store (Phase 5) needs its catalog, not page
  // classification — that would spend AI calls on news nobody receives.
  const { count: followers } = await service
    .from("competitors")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);
  let pages: StorePagesResult | null = null;
  if (followers) {
    try {
      pages = await checkStorePages(service, storeId);
    } catch (err) {
      console.error(`Page checks failed for store ${storeId}:`, err);
    }
  }

  let catalog: CatalogCheckResult;
  try {
    catalog = await runCatalogCheck(service, storeId);
  } catch (err) {
    catalog = { status: "error", message: err instanceof Error ? err.message : String(err) };
    await service
      .from("stores")
      .update({ check_status: "error", check_error: catalog.message })
      .eq("id", storeId);
  }

  const next =
    catalog.status === "error"
      ? minutesFromNow(CATALOG_CONFIG.errorRetryMinutes)
      : minutesFromNow(CATALOG_CONFIG.defaultCheckIntervalHours * 60);
  await service.from("stores").update({ next_check_at: next }).eq("id", storeId);
  return { catalog, pages };
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
 * Due stores, oldest first: ones someone follows, plus ones that are someone's
 * own store (their catalog is the matching baseline). A store nobody uses is
 * never crawled.
 */
async function dueStores(service: SupabaseClient): Promise<{ id: string; next_check_at: string }[]> {
  const now = new Date().toISOString();
  const due = (columns: string) =>
    service
      .from("stores")
      .select(columns)
      .lte("next_check_at", now)
      .order("next_check_at", { ascending: true })
      .limit(CATALOG_CONFIG.tickBatchSize)
      .returns<{ id: string; next_check_at: string }[]>();
  const [followed, owned] = await Promise.all([
    due("id, next_check_at, competitors!inner(id)"),
    due("id, next_check_at, users!inner(id)"),
  ]);
  if (followed.error) throw followed.error;
  if (owned.error) throw owned.error;
  const byId = new Map<string, { id: string; next_check_at: string }>();
  for (const s of [...(followed.data ?? []), ...(owned.data ?? [])]) byId.set(s.id, { id: s.id, next_check_at: s.next_check_at });
  return [...byId.values()]
    .sort((a, b) => Date.parse(a.next_check_at) - Date.parse(b.next_check_at))
    .slice(0, CATALOG_CONFIG.tickBatchSize);
}

/**
 * The frequent tick (pg_cron → /api/cron/catalog): check due stores, oldest
 * first, until the time budget runs out.
 */
export async function runCatalogTick(budgetMs: number = CATALOG_CONFIG.tickBudgetMs): Promise<CatalogTickResult> {
  const service = createServiceClient();
  const deadline = Date.now() + budgetMs;
  const totals: CatalogTickResult = { checked: 0, changed: 0, events: 0, errors: 0, remaining: false };

  while (Date.now() < deadline) {
    const due = await dueStores(service);
    if (due.length === 0) return totals;

    for (const { id } of due) {
      if (Date.now() >= deadline) return { ...totals, remaining: true };
      const result = await checkStoreIfDue(id, service);
      if (!result) continue; // another runner took it
      const { catalog, pages } = result;
      totals.checked += 1;
      if (catalog.status === "error") totals.errors += 1;
      if (catalog.status === "changed") {
        totals.changed += 1;
        totals.events += catalog.events;
      }
      if (pages) {
        totals.changed += pages.changed;
        totals.events += pages.events;
        totals.errors += pages.errors;
      }
    }
  }
  return { ...totals, remaining: true };
}
