import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchRobotsTxt, robotsAllows } from "@/features/checks/fetchPage";
import { CATALOG_CONFIG } from "./config";
import { diffCatalogs } from "./diff";
import { catalogPageFetcher, fetchShopifyCatalog, realSleep, type FetchCatalogResult } from "./fetchCatalog";
import { catalogStats } from "./firstReport";
import { hashCatalog } from "./normalize";
import { downloadSnapshot, uploadSnapshot } from "./snapshots";
import { fetchSitemapCatalog } from "./sitemapFallback";
import { recordEvents } from "@/features/events/record";
import { hasBestsellerTag, severityFor } from "@/features/events/severity.config";
import type { NewEvent } from "@/features/events/types";
import { annotateFollowers } from "@/features/matching/annotate";
import { recordFetches } from "@/features/usage/record";

export type CatalogCheckResult =
  | { status: "skipped"; reason: string }
  | { status: "error"; message: string }
  | { status: "unchanged" }
  | { status: "baseline"; products: number }
  | { status: "changed"; products: number; events: number };

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
    .select(
      "id, domain, platform, products_json_available, catalog_hash, catalog_source, latest_snapshot_id, featured_handles",
    )
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
  let fetched: FetchCatalogResult = useProductsJson
    ? await fetchShopifyCatalog(base, net)
    : await fetchSitemapCatalog(base, robots, net);
  // Headless storefronts (e.g. Hydrogen on www.) can 404 /products.json while
  // the bare domain the probe checked still serves it.
  const bare = `https://${store.domain}`;
  if (!fetched.ok && useProductsJson && bare !== base) {
    await recordFetches(service, storeId, "catalog", fetched.pages);
    fetched = await fetchShopifyCatalog(bare, net);
  }

  await recordFetches(service, storeId, "catalog", fetched.pages);
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
  // at the old snapshot, so the next check re-derives the same events (a
  // repeat that reaches alerts is caught by the routing dedupe).
  const featured = new Set<string>(store.featured_handles ?? []);
  const byId = new Map(catalog.products.map((p) => [p.id, p]));

  // For followers who've added their own store, tie each product event to
  // their matched product and flag price moves below theirs. Best-effort —
  // matching trouble must never cost the store's own events.
  let annotations: Awaited<ReturnType<typeof annotateFollowers>> = { positions: [], contextFor: () => null };
  try {
    annotations = await annotateFollowers(service, storeId, events, catalog.products, previous?.products ?? []);
  } catch (err) {
    console.error(`Own-store matching failed for store ${storeId}:`, err);
  }

  const catalogEvents: NewEvent[] = events.map((e) => {
    const product = e.productId ? byId.get(e.productId) : undefined;
    const isTopProduct = !!product && (featured.has(product.handle.toLowerCase()) || hasBestsellerTag(product.tags));
    return {
      type: e.type,
      severity: severityFor({ type: e.type, payload: e.payload, isTopProduct }),
      source: "catalog",
      productId: e.productId,
      storePageId: null,
      payload: e.payload,
      snapshotId: snapshot.id,
    };
  });
  // Catalog events first, so contextFor's indexes line up with `events`.
  const positions = annotations.positions.map((u) => ({ ...u, snapshotId: snapshot.id }));
  await recordEvents(service, storeId, [...catalogEvents, ...positions], annotations.contextFor);

  await mark({
    check_status: "ok",
    check_error: null,
    catalog_hash: hash,
    catalog_source: catalog.source,
    catalog_stats: catalogStats(catalog.products),
    latest_snapshot_id: snapshot.id,
  });

  return previous
    ? { status: "changed", products: catalog.products.length, events: events.length + positions.length }
    : { status: "baseline", products: catalog.products.length };
}
