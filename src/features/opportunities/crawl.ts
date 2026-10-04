import type { SupabaseClient } from "@supabase/supabase-js";
import { realSleep } from "@/features/catalog/fetchCatalog";
import { CATALOG_CONFIG } from "@/features/catalog/config";
import { fetchRobotsTxt, robotsAllows } from "@/features/checks/fetchPage";
import { safeFetch } from "@/features/lastUpdated/fetch";
import { recordFetches } from "@/features/usage/record";
import { bestsellerCandidates, handlesFromProductsJson, listedOrder, readBestsellers } from "./bestsellers";
import { OPPORTUNITIES_CONFIG as C } from "./config";

// B1, the daily read: part of the shared crawl (one read per store, shared by
// everyone who follows it). Public pages only, robots.txt honoured, polite
// delay between requests.

export type BestsellerCrawl = { status: "skipped" | "unavailable" | "saved"; requests: number };

type StoreRow = {
  id: string;
  domain: string;
  platform: string | null;
  bestseller_collection: string | null;
  bestseller_status: string | null;
  bestseller_checked_at: string | null;
};

const HOUR = 3_600_000;

/** Whether the store's list is due: daily, or weekly while it's unavailable. */
export function bestsellersDue(s: Pick<StoreRow, "bestseller_status" | "bestseller_checked_at">, now: number): boolean {
  const last = Date.parse(s.bestseller_checked_at ?? "");
  if (!Number.isFinite(last)) return true;
  const every = s.bestseller_status === "unavailable" ? C.unavailableRecheckDays * 24 : C.bestsellerEveryHours;
  return now - last >= every * HOUR;
}

export async function crawlBestsellers(service: SupabaseClient, storeId: string, now = Date.now()): Promise<BestsellerCrawl> {
  const { data: store } = await service
    .from("stores")
    .select("id, domain, platform, bestseller_collection, bestseller_status, bestseller_checked_at")
    .eq("id", storeId)
    .single<StoreRow>();
  if (!store || store.platform !== "shopify" || !bestsellersDue(store, now)) return { status: "skipped", requests: 0 };

  const { data: home } = await service.from("store_pages").select("url").eq("store_id", storeId).eq("kind", "homepage").maybeSingle();
  const base = home?.url ? new URL(home.url).origin : `https://${store.domain}`;
  const robots = await fetchRobotsTxt(base);
  let requests = 0;
  const get = async (path: string) => {
    if (!robotsAllows(robots, path)) return null;
    if (requests > 0) await realSleep(CATALOG_CONFIG.pageDelayMs);
    requests += 1;
    const res = await safeFetch(base + path);
    return res.ok ? res.html : null;
  };
  const finish = async (fields: Record<string, unknown>, status: BestsellerCrawl["status"]) => {
    await service.from("stores").update({ bestseller_checked_at: new Date(now).toISOString(), ...fields }).eq("id", storeId);
    await recordFetches(service, storeId, "catalog", requests);
    return { status, requests };
  };

  // 1. Find the collection (kept once found; looked for again if it empties or disappears).
  let collection = store.bestseller_collection;
  let members = collection ? await membersOf(get, collection) : null;
  if (!members?.length) ({ collection, members } = await findCollection(get));
  if (!collection || !members?.length) {
    return finish({ bestseller_status: "unavailable", bestseller_collection: null }, "unavailable");
  }

  // 2. Positions from the store's own page, when it lists enough of them.
  const page = await get(`/collections/${collection}`);
  const read = readBestsellers(members, page ? listedOrder(page, members) : [], new Date(now).toISOString());
  const { error } = await service.from("bestseller_snapshots").insert({
    store_id: storeId,
    collection,
    members: read.members,
    ranked_count: read.rankedCount,
    fetched_at: read.fetchedAt,
  });
  if (error) throw new Error(`Couldn't save the Best Sellers read: ${error.message}`);
  return finish({ bestseller_status: "available", bestseller_collection: collection }, "saved");
}

type Get = (path: string) => Promise<string | null>;

async function membersOf(get: Get, collection: string): Promise<string[] | null> {
  const text = await get(`/collections/${collection}/products.json?limit=${C.bestsellerTopN}`);
  return text ? handlesFromProductsJson(text) : null;
}

/**
 * The first accepted collection that has products, from the public collections
 * list; when that's hidden, the common handles. (Some stores' main list is
 * built by script and empty as JSON.)
 */
async function findCollection(get: Get): Promise<{ collection: string | null; members: string[] | null }> {
  const handles: string[] = [];
  for (let page = 1; page <= 4; page++) {
    const text = await get(`/collections.json?limit=250&page=${page}`);
    if (!text) break;
    let list: { handle?: unknown }[] = [];
    try {
      list = (JSON.parse(text) as { collections?: { handle?: unknown }[] }).collections ?? [];
    } catch {
      break;
    }
    handles.push(...list.map((c) => (typeof c.handle === "string" ? c.handle : "")).filter(Boolean));
    if (list.length < 250) break;
  }
  const candidates = handles.length ? bestsellerCandidates(handles).slice(0, 3) : C.bestsellerHandles.slice(0, 2);
  for (const collection of candidates) {
    const members = await membersOf(get, collection);
    if (members?.length) return { collection, members };
  }
  return { collection: null, members: null };
}
