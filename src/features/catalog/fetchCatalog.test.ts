import { describe, expect, it, vi } from "vitest";
import { fetchShopifyCatalog, type PageResponse } from "./fetchCatalog";

const BASE = "https://www.dewlane.com";

function rawProduct(id: number) {
  return {
    id,
    handle: `p-${id}`,
    title: `P ${id}`,
    product_type: "Skincare",
    vendor: "Dewlane",
    tags: ["a"],
    created_at: "2026-01-01T00:00:00Z",
    published_at: "2026-01-01T00:00:00Z",
    images: [],
    variants: [{ id: id * 10, title: "Default", sku: null, price: "48.00", compare_at_price: null, available: true }],
  };
}

const page = (ids: number[]): PageResponse => ({ ok: true, body: JSON.stringify({ products: ids.map(rawProduct) }) });
const noSleep = vi.fn(async () => {});

function fetcherFrom(responses: Record<number, PageResponse | PageResponse[]>) {
  const calls: string[] = [];
  const queues = new Map(Object.entries(responses).map(([k, v]) => [Number(k), Array.isArray(v) ? [...v] : [v]]));
  const fetchPage = async (url: string) => {
    calls.push(url);
    const n = Number(new URL(url).searchParams.get("page"));
    const q = queues.get(n);
    if (!q || q.length === 0) return page([]);
    return q.length > 1 ? q.shift()! : q[0];
  };
  return { fetchPage, calls };
}

describe("fetchShopifyCatalog", () => {
  it("paginates until an empty page and requests 250 per page", async () => {
    const { fetchPage, calls } = fetcherFrom({ 1: page([1, 2]), 2: page([3]) });
    const result = await fetchShopifyCatalog(BASE, { fetchPage, sleep: noSleep });
    expect(result.ok && result.catalog.products.map((p) => p.id)).toEqual(["1", "2", "3"]);
    expect(result.ok && result.catalog.complete).toBe(true);
    expect(result.ok && result.catalog.source).toBe("products.json");
    expect(calls).toEqual([
      `${BASE}/products.json?limit=250&page=1`,
      `${BASE}/products.json?limit=250&page=2`,
      `${BASE}/products.json?limit=250&page=3`,
    ]);
  });

  it("pauses between pages (politeness)", async () => {
    const sleep = vi.fn(async () => {});
    const { fetchPage } = fetcherFrom({ 1: page([1]), 2: page([2]) });
    await fetchShopifyCatalog(BASE, { fetchPage, sleep, config: { pageDelayMs: 1234 } });
    expect(sleep).toHaveBeenCalledWith(1234);
    expect(sleep).toHaveBeenCalledTimes(2); // before page 2 and page 3
  });

  it("retries a 429 with exponential backoff, then continues", async () => {
    const sleep = vi.fn(async () => {});
    const rateLimited: PageResponse = { ok: false, status: 429, message: "HTTP 429" };
    const { fetchPage } = fetcherFrom({ 1: [rateLimited, rateLimited, page([1])] });
    const result = await fetchShopifyCatalog(BASE, { fetchPage, sleep, config: { retryBaseMs: 100 } });
    expect(result.ok).toBe(true);
    expect(sleep.mock.calls.map((c) => (c as unknown[])[0])).toEqual([100, 200, 1000]);
  });

  it("fails the whole fetch when a page keeps failing (a partial catalog would look like removals)", async () => {
    const down: PageResponse = { ok: false, status: 503, message: "HTTP 503" };
    const { fetchPage } = fetcherFrom({ 1: page([1]), 2: down });
    const result = await fetchShopifyCatalog(BASE, { fetchPage, sleep: noSleep, config: { maxRetries: 2 } });
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining("page 2") });
  });

  it("does not retry a 404", async () => {
    const fetchPage = vi.fn(async (): Promise<PageResponse> => ({ ok: false, status: 404, message: "HTTP 404" }));
    const result = await fetchShopifyCatalog(BASE, { fetchPage, sleep: noSleep });
    expect(result.ok).toBe(false);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("fails on a truncated (invalid JSON) page", async () => {
    const { fetchPage } = fetcherFrom({ 1: { ok: true, body: '{"products":[{"id":1,' } });
    expect(await fetchShopifyCatalog(BASE, { fetchPage, sleep: noSleep })).toMatchObject({ ok: false });
  });

  it("stops at the page ceiling and marks the catalog incomplete", async () => {
    const { fetchPage } = fetcherFrom({ 1: page([1]), 2: page([2]), 3: page([3]) });
    const result = await fetchShopifyCatalog(BASE, { fetchPage, sleep: noSleep, config: { maxPages: 2 } });
    expect(result.ok && result.catalog.complete).toBe(false);
    expect(result.ok && result.catalog.products).toHaveLength(2);
  });

  it("de-duplicates products repeated across pages and skips malformed ones", async () => {
    const { fetchPage } = fetcherFrom({
      1: page([1, 2]),
      2: { ok: true, body: JSON.stringify({ products: [rawProduct(2), { id: 9 }, rawProduct(3)] }) },
    });
    const result = await fetchShopifyCatalog(BASE, { fetchPage, sleep: noSleep });
    expect(result.ok && result.catalog.products.map((p) => p.id)).toEqual(["1", "2", "3"]);
  });

  it("applies the price-tracking cap: only the newest products keep variants", async () => {
    const older = { ...rawProduct(1), published_at: "2025-01-01T00:00:00Z" };
    const newer = { ...rawProduct(2), published_at: "2026-06-01T00:00:00Z" };
    const { fetchPage } = fetcherFrom({ 1: { ok: true, body: JSON.stringify({ products: [older, newer] }) } });
    const result = await fetchShopifyCatalog(BASE, { fetchPage, sleep: noSleep, config: { priceTrackCap: 1 } });
    const byId = Object.fromEntries((result.ok ? result.catalog.products : []).map((p) => [p.id, p.variants.length]));
    expect(byId).toEqual({ "1": 0, "2": 1 });
  });
});
