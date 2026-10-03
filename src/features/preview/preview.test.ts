import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { CatalogProduct } from "@/features/catalog/types";
import { canonicalStoreHost } from "@/features/stores/domain";
import { summarizeLookups } from "@/features/usage/report";
import { buildPreview, teaserOf, type FullPreview } from "./compute";
import { PREVIEW_CONFIG } from "./config";
import { ipVerdict, isFresh, newPreviewId, underGlobalCap } from "./guard";
import { lookupPreview, type Work } from "./run";

// The real fresh read (resolveStore → Supabase) is replaced per test below.
vi.mock("@/features/stores/resolveStore", () => ({ resolveStore: async () => ({ ok: false, code: "invalid", message: "" }) }));

// Fictional brands only: Dewlane, Hearth & Pine, Northknot.

const NOW = new Date("2026-10-04T12:00:00Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
let id = 1;
const product = (title: string, opts: { price?: number; compareAt?: number | null; available?: boolean; published?: string } = {}): CatalogProduct => ({
  id: String(id++),
  handle: title.toLowerCase().replace(/\W+/g, "-"),
  title,
  productType: "",
  tags: [],
  vendor: "Dewlane",
  createdAt: opts.published ?? daysAgo(200),
  publishedAt: opts.published ?? daysAgo(200),
  image: null,
  variants: [{ id: String(id++), title: "Default Title", sku: null, price: opts.price ?? 5000, compareAtPrice: opts.compareAt ?? null, available: opts.available ?? true }],
});

describe("domain input", () => {
  it("normalizes protocol, www, paths, queries and case", () => {
    expect(canonicalStoreHost("HTTPS://WWW.Dewlane.com/collections/all?ref=x")).toBe("dewlane.com");
    expect(canonicalStoreHost("dewlane.com/")).toBe("dewlane.com");
    expect(canonicalStoreHost("not a domain")).toBeNull();
    expect(canonicalStoreHost("localhost")).toBeNull();
  });
});

describe("teaser", () => {
  const products = [
    product("Linen Sheet Set", { published: daysAgo(3) }),
    product("Waffle Robe", { published: daysAgo(10) }),
    product("Quilt", { price: 7000, compareAt: 10000 }),
    product("Throw", { price: 4500, compareAt: 5000 }),
    product("Old Pillow", { available: false }),
    product("Shipping Protection", { price: 200 }),
  ];
  const full = buildPreview({ domain: "dewlane.com", name: "Dewlane", products, complete: true, now: NOW });

  it("counts launches in the last 30 days, sales right now and sold-out products", () => {
    expect(full.productCount).toBe(5); // the shipping-protection add-on isn't merchandise
    expect(full.launched.count).toBe(2);
    expect(full.launched.items[0].title).toBe("Linen Sheet Set");
    expect(full.onSale).toMatchObject({ count: 2, avgPctOff: 20, maxPctOff: 30 });
    expect(full.soldOut.count).toBe(1);
  });

  it("says state, not change, with one example product per finding", () => {
    const teaser = teaserOf(full);
    expect(teaser.findings.map((f) => f.text)).toEqual([
      "Launched 2 products in the last 30 days",
      "2 products on sale right now · up to 30% off",
      "1 product sold out right now",
    ]);
    expect(teaser.findings.map((f) => f.example?.title)).toEqual(["Linen Sheet Set", "Quilt", "Old Pillow"]);
    expect(teaser.findings[1].example).toMatchObject({ price: 7000, compareAtPrice: 10000 });
    expect(JSON.stringify(teaser)).not.toContain("Waffle Robe"); // only the top example
    expect(teaser.priceChanges).toBeUndefined();
  });

  it("shows price changes only when real tracked events exist", () => {
    expect(teaserOf(full, { count: 0, example: null }).priceChanges).toBeUndefined();
    expect(teaserOf(full, { count: 12, example: { title: "Quilt", oldPrice: 12900, newPrice: 14500 } }).priceChanges?.count).toBe(12);
  });

  it("skips empty groups", () => {
    const quiet = buildPreview({ domain: "northknot.com", name: "Northknot", products: [product("Beanie")], complete: true, now: NOW });
    expect(teaserOf(quiet).findings).toEqual([]);
    const oneSale = buildPreview({ domain: "northknot.com", name: "Northknot", products: [product("Scarf", { price: 4000, compareAt: 5000 })], complete: true, now: NOW });
    expect(teaserOf(oneSale).findings).toEqual([
      { kind: "on_sale", count: 1, text: "1 product on sale right now · 20% off", example: { title: "Scarf", price: 4000, compareAtPrice: 5000, image: null } },
    ]);
  });
});

describe("guardrails", () => {
  const at = (secondsAgo: number) => new Date(NOW.getTime() - secondsAgo * 1000);
  it("allows 3 lookups per IP per day, at least 10 seconds apart", () => {
    expect(ipVerdict([], NOW)).toEqual({ ok: true });
    expect(ipVerdict([at(5)], NOW)).toEqual({ ok: false, reason: "per_ip_gap" });
    expect(ipVerdict([at(60), at(600)], NOW)).toEqual({ ok: true });
    expect(ipVerdict([at(60), at(600), at(3600)], NOW)).toEqual({ ok: false, reason: "per_ip_daily" });
    expect(ipVerdict([at(90_000), at(90_100), at(90_200)], NOW)).toEqual({ ok: true }); // older than a day
  });

  it("caps fresh reads per day and reuses snapshots under 24 hours old", () => {
    expect(underGlobalCap(PREVIEW_CONFIG.freshPerDay - 1)).toBe(true);
    expect(underGlobalCap(PREVIEW_CONFIG.freshPerDay)).toBe(false);
    expect(isFresh(daysAgo(0.5), NOW)).toBe(true);
    expect(isFresh(daysAgo(1.5), NOW)).toBe(false);
    expect(isFresh(null, NOW)).toBe(false);
  });

  it("makes unguessable preview ids", () => {
    const a = newPreviewId();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(newPreviewId()).not.toBe(a);
  });

  it("summarises lookups per day for the admin view", () => {
    const rows = [
      { created_at: "2026-10-04T10:00:00Z", cached: true, status: "ready", duration_ms: 300, products: 400 },
      { created_at: "2026-10-04T11:00:00Z", cached: false, status: "ready", duration_ms: 5700, products: 1000 },
      { created_at: "2026-10-03T11:00:00Z", cached: false, status: "invalid_domain", duration_ms: 10, products: null },
    ];
    expect(summarizeLookups(rows)).toEqual([
      { day: "2026-10-04", lookups: 2, cached: 1, fresh: 1, products: 1000, avgMs: 3000 },
      { day: "2026-10-03", lookups: 1, cached: 0, fresh: 0, products: 0, avgMs: 10 },
    ]);
  });
});

// A tiny in-memory stand-in for the two tables lookupPreview touches.
function fakeDb(seed: { lookups?: { ip_hash: string; created_at: string; status: string; cached: boolean }[] } = {}) {
  const tables: Record<string, Record<string, unknown>[]> = { preview_lookups: [...(seed.lookups ?? [])], previews: [] };
  const from = (table: string) => {
    const filters: ((r: Record<string, unknown>) => boolean)[] = [];
    const q = {
      select: () => q,
      eq: (k: string, v: unknown) => (filters.push((r) => r[k] === v), q),
      in: (k: string, v: unknown[]) => (filters.push((r) => v.includes(r[k])), q),
      gte: (k: string, v: string) => (filters.push((r) => String(r[k]) >= v), q),
      order: () => q,
      limit: () => q,
      insert: (row: Record<string, unknown>) => {
        tables[table].push({ created_at: new Date().toISOString(), ...row });
        return Promise.resolve({ error: null });
      },
      then: (resolve: (v: unknown) => void) => {
        const rows = tables[table].filter((r) => filters.every((f) => f(r)));
        resolve({ data: rows, count: rows.length, error: null });
      },
    };
    return q;
  };
  return { db: { from } as unknown as SupabaseClient, tables };
}

const FULL: FullPreview = buildPreview({ domain: "dewlane.com", name: "Dewlane", products: [product("Quilt", { price: 7000, compareAt: 10000 })], complete: true, now: NOW });
const none = async () => null;

describe("lookupPreview", () => {
  it("rejects invalid domains and marketplaces before anything else", async () => {
    const { db } = fakeDb();
    expect((await lookupPreview(db, "not a store", "1.1.1.1", () => {})).status).toBe("invalid_domain");
    expect((await lookupPreview(db, "amazon.com/stores/Dewlane", "1.1.1.1", () => {})).status).toBe("marketplace_blocked");
  });

  it("serves a cached result without a fresh read", async () => {
    const { db, tables } = fakeDb();
    let fresh = 0;
    const res = await lookupPreview(db, "dewlane.com", "1.1.1.1", () => {}, {
      cachedPreview: async () => ({ full: FULL, storeId: null, snapshotId: null }),
      freshRead: async () => ((fresh += 1), { status: "error", reason: "x", message: "x" } as Work),
      syncBudgetMs: 1000,
    });
    expect(res.status).toBe("ready");
    expect(res.teaser?.findings[0].text).toBe("1 product on sale right now · 30% off");
    expect(fresh).toBe(0);
    expect(tables.preview_lookups.at(-1)).toMatchObject({ status: "ready", cached: true });
    expect(tables.previews[0]).toMatchObject({ status: "ready", domain: "dewlane.com" });
  });

  it("reads fresh on a cache miss", async () => {
    const { db, tables } = fakeDb();
    const res = await lookupPreview(db, "www.dewlane.com", "1.1.1.1", () => {}, {
      cachedPreview: none,
      freshRead: async () => ({ status: "ready", full: FULL, products: 1, storeId: null }) as Work,
      syncBudgetMs: 1000,
    });
    expect(res).toMatchObject({ status: "ready", domain: "dewlane.com" });
    expect(tables.preview_lookups.at(-1)).toMatchObject({ status: "ready", cached: false, products: 1 });
  });

  it("returns processing for a slow read and finishes it in the background", async () => {
    const { db } = fakeDb();
    let deferred: (() => Promise<unknown>) | null = null;
    let release: (w: Work) => void = () => {};
    const slow = new Promise<Work>((r) => (release = r));
    const res = await lookupPreview(db, "hearthandpine.com", "1.1.1.1", (w) => (deferred = w), {
      cachedPreview: none,
      freshRead: () => slow,
      syncBudgetMs: 10,
    });
    expect(res.status).toBe("processing");
    expect(res.previewId).toMatch(/^[0-9a-f]{32}$/);
    expect(deferred).not.toBeNull();
    release({ status: "ready", full: FULL, products: 1, storeId: null });
    await deferred!();
  });

  it("rate-limits an IP and stops fresh reads at the daily cap", async () => {
    const { hashIp } = await import("./guard");
    const recent = (s: number) => ({ ip_hash: hashIp("2.2.2.2"), created_at: new Date(Date.now() - s * 1000).toISOString(), status: "ready", cached: true });
    const limited = fakeDb({ lookups: [recent(60), recent(120), recent(180)] });
    const deps = { cachedPreview: none, freshRead: async () => ({ status: "ready", full: FULL, products: 1, storeId: null }) as Work, syncBudgetMs: 1000 };
    expect(await lookupPreview(limited.db, "dewlane.com", "2.2.2.2", () => {}, deps)).toMatchObject({ status: "rate_limited", reason: "per_ip_daily" });

    const busy = fakeDb({
      lookups: Array.from({ length: PREVIEW_CONFIG.freshPerDay }, () => ({ ip_hash: "other", created_at: new Date().toISOString(), status: "ready", cached: false })),
    });
    expect(await lookupPreview(busy.db, "dewlane.com", "3.3.3.3", () => {}, deps)).toMatchObject({ status: "rate_limited", reason: "global" });
  });
});
