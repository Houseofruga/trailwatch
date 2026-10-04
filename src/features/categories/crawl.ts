import type { SupabaseClient } from "@supabase/supabase-js";
import { CATALOG_CONFIG } from "@/features/catalog/config";
import { realSleep } from "@/features/catalog/fetchCatalog";
import { fetchRobotsTxt, robotsAllows } from "@/features/checks/fetchPage";
import { safeFetch } from "@/features/lastUpdated/fetch";
import { menuCollections } from "@/features/stores/discoverPages";
import { recordFetches } from "@/features/usage/record";
import { CATEGORIES_CONFIG as C } from "./config";
import { categoryTitle, countPage, parseCollectionsList, pickMenu, sharedPrefix, sortCategories, type StoreCategory } from "./summarize";

// The daily read of a store's categories: the collections its own menu links
// to, each with a product count and how many are on sale. Part of the shared
// crawl (one read per store). Public pages only, robots.txt honoured, polite
// delay between requests.

export type CategoriesCrawl = { status: "skipped" | "saved"; requests: number; categories: number };

type StoreRow = { id: string; domain: string; platform: string | null; categories_checked_at: string | null };

export function categoriesDue(checkedAt: string | null, now: number): boolean {
  const last = Date.parse(checkedAt ?? "");
  return !Number.isFinite(last) || now - last >= C.everyHours * 3_600_000;
}

export async function crawlCategories(service: SupabaseClient, storeId: string, now = Date.now()): Promise<CategoriesCrawl> {
  const { data: store } = await service
    .from("stores")
    .select("id, domain, platform, categories_checked_at")
    .eq("id", storeId)
    .single<StoreRow>();
  if (!store || store.platform !== "shopify" || !categoriesDue(store.categories_checked_at, now)) {
    return { status: "skipped", requests: 0, categories: 0 };
  }

  const { data: home } = await service.from("store_pages").select("url").eq("store_id", storeId).eq("kind", "homepage").maybeSingle();
  const base = home?.url ? new URL(home.url).origin : `https://${store.domain}`;
  const robots = await fetchRobotsTxt(base);
  let requests = 0;
  const get = async (path: string) => {
    if (!robotsAllows(robots, path)) return null;
    if (requests > 0) await realSleep(CATALOG_CONFIG.pageDelayMs);
    requests += 1;
    const res = await safeFetch(base + path, { maxBytes: CATALOG_CONFIG.pageMaxBytes, timeoutMs: 30_000 });
    return res.ok ? res.html : null;
  };

  // 1. The menu: collections the homepage links to.
  const homepage = await get("/");
  const links = homepage ? menuCollections(homepage, base, C.notCategories) : [];

  // 2. Their names and sizes, from the store's public collections list (when it has one).
  const listed = new Map<string, { title: string; products: number | null }>();
  if (links.length) {
    for (let page = 1; page <= C.maxListPages; page++) {
      const text = await get(`/collections.json?limit=250&page=${page}`);
      const rows = text ? parseCollectionsList(text) : [];
      for (const r of rows) listed.set(r.handle, r);
      if (rows.length < 250) break;
    }
  }

  // 3. The largest of them, each read: it has to exist and hold products.
  const menu = pickMenu(links, listed, C.maxCategories);
  const prefix = sharedPrefix(menu.flatMap((m) => listed.get(m.handle)?.title || []));
  const categories: StoreCategory[] = [];
  for (const m of menu) {
    let products = 0;
    let onSale = 0;
    let complete = false;
    for (let page = 1; page <= C.maxPagesPerCategory; page++) {
      const text = await get(`/collections/${encodeURIComponent(m.handle)}/products.json?limit=${C.pageSize}&page=${page}`);
      const counted = text ? countPage(text) : null;
      if (!counted) break;
      products += counted.products;
      onSale += counted.onSale;
      if (counted.products < C.pageSize) {
        complete = true;
        break;
      }
    }
    if (products === 0) continue;
    const known = listed.get(m.handle);
    categories.push({
      handle: m.handle,
      title: categoryTitle(known?.title, prefix, m.label, m.handle),
      // A category bigger than we read keeps the store's own count, and no on-sale count.
      products: complete ? products : Math.max(products, known?.products ?? 0),
      onSale: complete ? onSale : null,
    });
  }

  await service
    .from("stores")
    .update({ categories: sortCategories(categories), categories_checked_at: new Date(now).toISOString() })
    .eq("id", storeId);
  await recordFetches(service, storeId, "catalog", requests);
  return { status: "saved", requests, categories: categories.length };
}
