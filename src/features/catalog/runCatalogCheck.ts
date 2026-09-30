import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchRobotsTxt, robotsAllows } from "@/features/checks/fetchPage";
import { CATALOG_CONFIG } from "./config";
import { diffCatalogs } from "./diff";
import { catalogPageFetcher, fetchShopifyCatalog, realSleep, type FetchCatalogResult } from "./fetchCatalog";
import { catalogStats } from "./firstReport";
import { hashCatalog } from "./normalize";
import { downloadSnapshot, uploadSnapshot } from "./snapshots";
import { fetchSitemapCatalog } from "./sitemapFallback";

export type CatalogCheckResult =
  | { status: "skipped"; reason: string }
  | { status: "error"; message: string }
  | { status: "unchanged" }
  | { status: "baseline"; products: number }
  | { status: "changed"; products: number; events: number };

const EVENT_INSERT_CHUNK = 500;
const net = { fetchPage: catalogPageFetcher, sleep: realSleep };

/**
 * One catalog check for one store (SPEC.md §5 Phase 2): fetch → hash → diff
 * against the latest snapshot → save snapshot + events. Unchanged catalogs
 * cost one hash and no writes beyond a timestamp. Scheduling (claiming the
 * store, next_check_at) is the caller's job — see schedule.ts.
 */
export async function runCatalogCheck(service: SupabaseClient, storeId: string): Promise<CatalogCheckResult> {
  const { data: store, error } = await service
    .from("stores")
    .select("id, domain, platform, products_json_available, catalog_hash, catalog_source, latest_snapshot_id")
    .eq("id", storeId)
    .single();
  if (error || !store) throw new Error(`Store ${storeId} not found.`);

  const mark = (fields: Record<string, unknown>) =>
    service
      .from("stores")
      .update({ last_checked_at: new Date().toISOString(), ...fields })
      .eq("id", storeId);

  // Non-Shopify stores have no readable catalog; their pages are watched instead (Phase 3).
  if (store.platform !== "shopify") {
    await mark({ check_status: "skipped", check_error: null });
    return { status: "skipped", reason: "not a Shopify store" };
  }

  // Crawl the origin the store's homepage settled on (usually www.), so each
  // catalog page doesn't pay for a redirect.
  const { data: home } = await service
    .from("store_pages")
    .select("url")
    .eq("store_id", storeId)
    .eq("kind", "homepage")
    .maybeSingle();
  const base = home?.url ? new URL(home.url).origin : `https://${store.domain}`;

  const robots = await fetchRobotsTxt(base);
  const useProductsJson =
    store.products_json_available && robotsAllows(robots, `/products.json?limit=${CATALOG_CONFIG.pageSize}&page=1`);
  const fetched: FetchCatalogResult = useProductsJson
    ? await fetchShopifyCatalog(base, net)
    : await fetchSitemapCatalog(base, robots, net);

  if (!fetched.ok) {
    await mark({ check_status: "error", check_error: fetched.message });
    return { status: "error", message: fetched.message };
  }
  const { catalog } = fetched;
  const hash = hashCatalog(catalog.products);

  if (hash === store.catalog_hash && catalog.source === store.catalog_source) {
    await mark({ check_status: "ok", check_error: null });
    return { status: "unchanged" };
  }

  // The baseline to diff against. A switch of source (products.json ↔
  // sitemap) changes product ids, so it starts a fresh baseline instead.
  let previous = null;
  if (store.latest_snapshot_id && store.catalog_source === catalog.source) {
    const { data: snap } = await service
      .from("catalog_snapshots")
      .select("storage_path")
      .eq("id", store.latest_snapshot_id)
      .single();
    previous = snap ? await downloadSnapshot(service, snap.storage_path) : null;
  }

  const events = previous
    ? diffCatalogs(previous.products, catalog.products, { complete: catalog.complete && previous.complete })
    : [];

  const storagePath = await uploadSnapshot(service, storeId, catalog);
  const { data: snapshot, error: snapError } = await service
    .from("catalog_snapshots")
    .insert({
      store_id: storeId,
      source: catalog.source,
      product_count: catalog.products.length,
      complete: catalog.complete,
      content_hash: hash,
      storage_path: storagePath,
    })
    .select("id")
    .single();
  if (snapError || !snapshot) throw new Error(`Couldn't record the snapshot: ${snapError?.message}`);

  // Events before moving the baseline: if this throws, the store still points
  // at the old snapshot, so the next check re-derives the same events.
  const rows = events.map((e) => ({
    store_id: storeId,
    type: e.type,
    source: "catalog",
    product_id: e.productId,
    payload: e.payload,
    snapshot_id: snapshot.id,
  }));
  for (let i = 0; i < rows.length; i += EVENT_INSERT_CHUNK) {
    const { error: eventsError } = await service.from("events").insert(rows.slice(i, i + EVENT_INSERT_CHUNK));
    if (eventsError) throw new Error(`Couldn't save events: ${eventsError.message}`);
  }

  await mark({
    check_status: "ok",
    check_error: null,
    catalog_hash: hash,
    catalog_source: catalog.source,
    catalog_stats: catalogStats(catalog.products),
    latest_snapshot_id: snapshot.id,
  });

  return previous
    ? { status: "changed", products: catalog.products.length, events: events.length }
    : { status: "baseline", products: catalog.products.length };
}
