import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchRobotsTxt, robotsAllows } from "@/features/checks/fetchPage";
import { CATALOG_CONFIG } from "@/features/catalog/config";
import { fetchShopifyCatalog } from "@/features/catalog/fetchCatalog";
import { catalogStats } from "@/features/catalog/firstReport";
import { hashCatalog } from "@/features/catalog/normalize";
import { downloadSnapshot, uploadSnapshot } from "@/features/catalog/snapshots";
import { canonicalStoreHost } from "@/features/stores/domain";
import { isMarketplace } from "@/features/stores/denylist.config";
import { resolveStore } from "@/features/stores/resolveStore";
import { recordFetches } from "@/features/usage/record";
import { buildPreview, teaserOf, type FullPreview, type PriceChanges, type Teaser } from "./compute";
import { PREVIEW_CONFIG } from "./config";
import { hashIp, ipVerdict, isFresh, newPreviewId, underGlobalCap } from "./guard";

// POST /api/preview (widget prompt Part 1): a competitor's public catalog,
// summarised for an anonymous visitor. Cached per domain for a day; fresh
// reads are capped at 1,000 products and saved to the normal snapshot store.

export type PreviewStatus =
  | "ready"
  | "processing"
  | "instant_not_supported"
  | "marketplace_blocked"
  | "invalid_domain"
  | "rate_limited"
  | "error";

export type PreviewResponse = {
  status: PreviewStatus;
  domain?: string;
  previewId?: string;
  teaser?: Teaser;
  /** Why, for statuses with more than one cause (e.g. rate_limited: per_ip_daily | per_ip_gap | global). */
  reason?: string;
  message?: string;
};

export type Work = { status: "ready"; full: FullPreview; products: number; storeId: string | null } | { status: "instant_not_supported" | "error"; reason: string; message: string };

const MESSAGES = {
  invalid: "Enter a store's website, like dewlane.com.",
  marketplace: "That's a marketplace. Add the brand's own website instead.",
  ratePerIp: "You've tried a few stores today. Join the beta to track as many as your plan allows.",
  rateGap: "One moment: try again in a few seconds.",
  global: "Lots of people are trying this right now. Try again later, or join the beta.",
  notShopify: "We can't read this store's catalog instantly.",
  hidden: "This store keeps its catalog private, so we can't read it instantly.",
  error: "We couldn't read that store just now. Try again in a minute.",
};

async function logLookup(
  service: SupabaseClient,
  row: { ipHash: string; domain: string | null; status: string; cached: boolean; started: number; products?: number | null },
) {
  const { error } = await service.from("preview_lookups").insert({
    ip_hash: row.ipHash,
    domain: row.domain,
    status: row.status,
    cached: row.cached,
    duration_ms: Date.now() - row.started,
    products: row.products ?? null,
  });
  if (error) console.error(`Couldn't log a preview lookup: ${error.message}`);
}

/** Price changes we actually recorded for a tracked store in the last 30 days, or undefined. */
async function trackedPriceChanges(service: SupabaseClient, storeId: string | null): Promise<PriceChanges | undefined> {
  if (!storeId) return undefined;
  const since = new Date(Date.now() - PREVIEW_CONFIG.recentDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, count } = await service
    .from("events")
    .select("payload", { count: "exact" })
    .eq("store_id", storeId)
    .eq("type", "price_changed")
    .gte("detected_at", since)
    .order("detected_at", { ascending: false })
    .limit(1);
  if (!count) return undefined;
  const p = (data?.[0]?.payload ?? {}) as { title?: unknown; oldPrice?: unknown; newPrice?: unknown };
  const example =
    typeof p.title === "string" && typeof p.oldPrice === "number" && typeof p.newPrice === "number"
      ? { title: p.title, oldPrice: p.oldPrice, newPrice: p.newPrice }
      : null;
  return { count, example };
}

const expiresAt = () => new Date(Date.now() + PREVIEW_CONFIG.ttlDays * 24 * 60 * 60 * 1000).toISOString();

/** A fresh-enough result for this domain, without fetching: a recent preview, or the store's own recent snapshot. */
async function cachedPreview(service: SupabaseClient, domain: string): Promise<{ full: FullPreview; storeId: string | null; snapshotId: string | null } | { notSupported: string } | null> {
  const since = new Date(Date.now() - PREVIEW_CONFIG.cacheHours * 60 * 60 * 1000).toISOString();
  const { data: recent } = await service
    .from("previews")
    .select("status, reason, result, store_id, snapshot_id")
    .eq("domain", domain)
    .in("status", ["ready", "instant_not_supported"])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent?.status === "instant_not_supported") return { notSupported: recent.reason ?? "not_shopify" };
  if (recent?.result) return { full: recent.result as FullPreview, storeId: recent.store_id, snapshotId: recent.snapshot_id };

  // A store we already track: its latest snapshot is current if it was checked today
  // (snapshots are only written on change, so check time is what counts).
  const { data: store } = await service
    .from("stores")
    .select("id, name, platform, latest_snapshot_id, last_checked_at, check_status")
    .eq("domain", domain)
    .maybeSingle();
  if (!store?.latest_snapshot_id || store.platform !== "shopify") return null;
  const { data: snap } = await service
    .from("catalog_snapshots")
    .select("storage_path, fetched_at")
    .eq("id", store.latest_snapshot_id)
    .single();
  const readAt = store.check_status === "ok" && store.last_checked_at ? store.last_checked_at : snap?.fetched_at;
  if (!snap || !isFresh(readAt)) return null;
  const catalog = await downloadSnapshot(service, snap.storage_path);
  if (!catalog) return null;
  return {
    full: buildPreview({ domain, name: store.name, products: catalog.products, complete: catalog.complete }),
    storeId: store.id,
    snapshotId: store.latest_snapshot_id,
  };
}

/** Read the catalog (capped), save it as a snapshot, and fill in the preview row. */
async function freshRead(service: SupabaseClient, previewId: string, domain: string): Promise<Work> {
  const finish = async (work: Work, extra: Record<string, unknown> = {}) => {
    await service
      .from("previews")
      .update(
        work.status === "ready"
          ? { status: "ready", result: work.full, ...extra }
          : { status: work.status, reason: work.reason, ...extra },
      )
      .eq("id", previewId);
    return work;
  };
  try {
    // Shopify detection and the shared store row (one per domain).
    const resolved = await resolveStore(domain);
    if (!resolved.ok) {
      return finish(
        resolved.code === "not_shopify"
          ? { status: "instant_not_supported", reason: "not_shopify", message: MESSAGES.notShopify }
          : { status: "error", reason: resolved.code, message: resolved.message },
      );
    }
    const store = resolved.store;
    const { data: row } = await service
      .from("stores")
      .select("products_json_available, latest_snapshot_id")
      .eq("id", store.id)
      .single();
    const { data: home } = await service.from("store_pages").select("url").eq("store_id", store.id).eq("kind", "homepage").maybeSingle();
    const base = home?.url ? new URL(home.url).origin : `https://${domain}`;
    const robots = await fetchRobotsTxt(base);
    if (!row?.products_json_available || !robotsAllows(robots, `/products.json?limit=${CATALOG_CONFIG.pageSize}&page=1`)) {
      return finish({ status: "instant_not_supported", reason: "catalog_hidden", message: MESSAGES.hidden }, { store_id: store.id });
    }

    const fetched = await fetchShopifyCatalog(base, { config: { maxPages: PREVIEW_CONFIG.maxPages } });
    await recordFetches(service, store.id, "catalog", fetched.pages);
    if (!fetched.ok) return finish({ status: "error", reason: "fetch_failed", message: MESSAGES.error }, { store_id: store.id });
    const { catalog } = fetched;

    // Save to the normal snapshot store. A complete read also becomes the
    // store's baseline if it has none; a capped one never does (a later full
    // check would read every product past the cap as a launch).
    const path = await uploadSnapshot(service, store.id, catalog);
    const hash = hashCatalog(catalog.products);
    const { data: snapshot } = await service
      .from("catalog_snapshots")
      .insert({
        store_id: store.id,
        source: catalog.source,
        product_count: catalog.products.length,
        complete: catalog.complete,
        content_hash: hash,
        storage_path: path,
      })
      .select("id")
      .single();
    if (snapshot && catalog.complete && !row.latest_snapshot_id) {
      await service
        .from("stores")
        .update({
          latest_snapshot_id: snapshot.id,
          catalog_hash: hash,
          catalog_source: catalog.source,
          catalog_stats: catalogStats(catalog.products),
          last_checked_at: new Date().toISOString(),
          check_status: "ok",
          check_error: null,
        })
        .eq("id", store.id);
    }

    const full = buildPreview({ domain, name: store.name, products: catalog.products, complete: catalog.complete });
    return finish({ status: "ready", full, products: catalog.products.length, storeId: store.id }, { store_id: store.id, snapshot_id: snapshot?.id ?? null });
  } catch (err) {
    console.error(`Preview for ${domain} failed:`, err);
    return finish({ status: "error", reason: "exception", message: MESSAGES.error });
  }
}

/**
 * One anonymous lookup. `defer` keeps a slow read running after the response
 * (the route passes Next's `after`), so the client can poll by preview id.
 */
export async function lookupPreview(
  service: SupabaseClient,
  input: string,
  ip: string,
  defer: (work: () => Promise<unknown>) => void,
  deps = { cachedPreview, freshRead, syncBudgetMs: PREVIEW_CONFIG.syncBudgetMs },
): Promise<PreviewResponse> {
  const started = Date.now();
  const ipHash = hashIp(ip);
  const domain = typeof input === "string" && input.length <= 300 ? canonicalStoreHost(input) : null;
  const log = (status: string, cached = false, products?: number | null) =>
    logLookup(service, { ipHash, domain, status, cached, started, products });

  if (!domain) {
    await log("invalid_domain");
    return { status: "invalid_domain", message: MESSAGES.invalid };
  }
  if (isMarketplace(domain)) {
    await log("marketplace_blocked");
    return { status: "marketplace_blocked", domain, message: MESSAGES.marketplace };
  }

  const { data: recent } = await service
    .from("preview_lookups")
    .select("created_at")
    .eq("ip_hash", ipHash)
    // Typos and marketplaces cost nothing, so they don't use up the day.
    .in("status", ["ready", "processing", "instant_not_supported", "error"])
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(PREVIEW_CONFIG.perIpPerDay + 1);
  const verdict = ipVerdict((recent ?? []).map((r) => new Date(r.created_at)));
  if (!verdict.ok) {
    // Not logged as a lookup, so waiting out the gap doesn't use up the day.
    return {
      status: "rate_limited",
      domain,
      reason: verdict.reason,
      message: verdict.reason === "per_ip_gap" ? MESSAGES.rateGap : MESSAGES.ratePerIp,
    };
  }

  const previewId = newPreviewId();
  const cached = await deps.cachedPreview(service, domain);
  if (cached && "notSupported" in cached) {
    await service.from("previews").insert({ id: previewId, domain, status: "instant_not_supported", reason: cached.notSupported, expires_at: expiresAt() });
    await log("instant_not_supported", true);
    return { status: "instant_not_supported", domain, previewId, reason: cached.notSupported, message: cached.notSupported === "catalog_hidden" ? MESSAGES.hidden : MESSAGES.notShopify };
  }
  if (cached) {
    await service.from("previews").insert({
      id: previewId,
      domain,
      store_id: cached.storeId,
      snapshot_id: cached.snapshotId,
      status: "ready",
      result: cached.full,
      expires_at: expiresAt(),
    });
    await log("ready", true, cached.full.productCount);
    return { status: "ready", domain, previewId, teaser: teaserOf(cached.full, await trackedPriceChanges(service, cached.storeId)) };
  }

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count: freshToday } = await service
    .from("preview_lookups")
    .select("id", { count: "exact", head: true })
    .eq("cached", false)
    .in("status", ["ready", "processing", "instant_not_supported", "error"])
    .gte("created_at", dayStart.toISOString());
  if (!underGlobalCap(freshToday ?? 0)) {
    await log("rate_limited");
    return { status: "rate_limited", domain, reason: "global", message: MESSAGES.global };
  }

  await service.from("previews").insert({ id: previewId, domain, status: "processing", expires_at: expiresAt() });
  const work = deps.freshRead(service, previewId, domain);
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), deps.syncBudgetMs));
  const done = await Promise.race([work, timeout]);

  if (!done) {
    defer(async () => {
      const w = await work;
      await log(w.status, false, w.status === "ready" ? w.products : null);
    });
    return { status: "processing", domain, previewId };
  }
  await log(done.status, false, done.status === "ready" ? done.products : null);
  if (done.status === "ready") return { status: "ready", domain, previewId, teaser: teaserOf(done.full, await trackedPriceChanges(service, done.storeId)) };
  if (done.status === "instant_not_supported") return { status: done.status, domain, previewId, reason: done.reason, message: done.message };
  return {
    status: done.reason === "invalid" || done.reason === "unreachable" || done.reason === "not_store" ? "invalid_domain" : "error",
    domain,
    reason: done.reason,
    message: done.message,
  };
}

/** GET /api/preview/:id — the teaser for a preview (polling), never the full snapshot. */
export async function readPreview(service: SupabaseClient, id: string): Promise<PreviewResponse | null> {
  if (!/^[0-9a-f]{32}$/.test(id)) return null;
  const { data } = await service.from("previews").select("domain, status, reason, result, expires_at, store_id").eq("id", id).maybeSingle();
  if (!data || Date.parse(data.expires_at) < Date.now()) return null;
  if (data.status === "ready" && data.result) {
    return { status: "ready", domain: data.domain, previewId: id, teaser: teaserOf(data.result as FullPreview, await trackedPriceChanges(service, data.store_id)) };
  }
  if (data.status === "instant_not_supported") {
    return { status: data.status, domain: data.domain, previewId: id, reason: data.reason ?? undefined, message: data.reason === "catalog_hidden" ? MESSAGES.hidden : MESSAGES.notShopify };
  }
  if (data.status === "processing") return { status: "processing", domain: data.domain, previewId: id };
  return { status: "error", domain: data.domain, message: MESSAGES.error };
}
