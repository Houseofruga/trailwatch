import { OPPORTUNITIES_CONFIG as C } from "./config";

// B1, pure parts: which collection is the store's Best Sellers list, what's in
// it, which positions we can trust, and what moved. No I/O.

export type BestsellerSnapshot = {
  members: string[];
  // The first rankedCount members are in the store's page order; 0 = membership only.
  rankedCount: number;
  fetchedAt: string;
};

/** The store's own best-seller collections among its collection handles, most preferred first. */
export function bestsellerCandidates(handles: string[]): string[] {
  const set = new Set(handles.map((h) => h.toLowerCase()));
  return [...C.bestsellerHandles.filter((h) => set.has(h)), ...[...set].filter((h) => C.bestsellerHandlePattern.test(h))];
}

export const pickBestsellerCollection = (handles: string[]): string | null => bestsellerCandidates(handles)[0] ?? null;

/** Product handles from a collection's products.json, or null when it isn't one. */
export function handlesFromProductsJson(text: string): string[] | null {
  try {
    const products = (JSON.parse(text) as { products?: { handle?: unknown }[] }).products;
    if (!Array.isArray(products)) return null;
    return products.map((p) => (typeof p.handle === "string" ? p.handle.toLowerCase() : "")).filter(Boolean);
  } catch {
    return null;
  }
}

/** The collection's products in the order its page links to them (first link wins). */
export function listedOrder(html: string, members: string[]): string[] {
  const wanted = new Set(members);
  const seen = new Set<string>();
  for (const m of html.matchAll(/\/products\/([a-z0-9][a-z0-9-]*)/gi)) {
    const handle = m[1].toLowerCase();
    if (wanted.has(handle)) seen.add(handle);
  }
  return [...seen];
}

/**
 * One read of the list. Positions come from the page only when it lists enough
 * of the collection to trust the order; otherwise membership only.
 */
export function readBestsellers(jsonMembers: string[], pageOrder: string[], fetchedAt: string): BestsellerSnapshot {
  const enough = pageOrder.length >= Math.min(C.rankedMinListed, Math.ceil(jsonMembers.length * C.rankedMinShare));
  const ranked = enough && pageOrder.length > 0 ? pageOrder : [];
  const rest = jsonMembers.filter((h) => !ranked.includes(h));
  const members = [...ranked, ...rest].slice(0, C.bestsellerTopN);
  return { members, rankedCount: Math.min(ranked.length, members.length), fetchedAt };
}

/** 1-based position, or null when the product isn't listed or positions aren't known. */
export function positionOf(s: BestsellerSnapshot, handle: string): number | null {
  const i = s.members.indexOf(handle);
  return i >= 0 && i < s.rankedCount ? i + 1 : null;
}

export type BestsellerSignal = {
  handle: string;
  kind: "launch_top" | "entered_top" | "climbed" | "joined";
  position: number | null;
  from: number | null;
};

const PRIORITY: BestsellerSignal["kind"][] = ["launch_top", "entered_top", "climbed", "joined"];

/**
 * What moved between an earlier read (about a week ago, or null on the first
 * read) and now: a recent launch already near the top, a product entering the
 * top, a fast climb, or (membership-only lists) a product added to the list.
 * One signal per product, the strongest.
 */
export function bestsellerSignals(
  prev: BestsellerSnapshot | null,
  curr: BestsellerSnapshot,
  publishedAt: Map<string, string | null>,
  now: number,
): BestsellerSignal[] {
  const out = new Map<string, BestsellerSignal>();
  const add = (s: BestsellerSignal) => {
    const had = out.get(s.handle);
    if (!had || PRIORITY.indexOf(s.kind) < PRIORITY.indexOf(had.kind)) out.set(s.handle, s);
  };
  const launchCutoff = now - C.launchWindowDays * 86_400_000;
  for (const handle of curr.members) {
    const pos = positionOf(curr, handle);
    const before = prev ? positionOf(prev, handle) : null;
    const top = pos !== null && pos <= C.topPositions;
    const published = Date.parse(publishedAt.get(handle) ?? "");
    // A launch near the top (or, without positions, already on the list).
    if (Number.isFinite(published) && published >= launchCutoff && (top || curr.rankedCount === 0)) {
      add({ handle, kind: "launch_top", position: pos, from: before });
    }
    if (!prev) continue;
    if (top && (before === null || before > C.topPositions) && prev.rankedCount > 0) {
      add({ handle, kind: "entered_top", position: pos, from: before });
    }
    if (pos !== null && before !== null && before - pos >= C.climbPlaces) add({ handle, kind: "climbed", position: pos, from: before });
    if (!prev.members.includes(handle)) add({ handle, kind: "joined", position: pos, from: null });
  }
  return [...out.values()];
}
