import { canonicalStoreHost } from "@/features/stores/domain";
import type { Competitor } from "./types";

// In-app suggestions (onboarding step 2, Add competitor modal): the finder runs
// on the user's own store and its result is cached on their users row.

export type Suggestion = { name: string; domain: string; why: string };

export const SUGGEST_CONFIG = {
  // A cached result is reused for this long...
  cacheDays: 7,
  // ...and "Find more" can refresh it at most this often.
  refreshCooldownMs: 60_000,
  // Suggestions shown at once.
  shown: 4,
};

/** The finder's result as stored: one row per Shopify store, by bare host. */
export function toSuggestions(competitors: Competitor[]): Suggestion[] {
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const c of competitors) {
    const domain = canonicalStoreHost(c.url);
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    out.push({ name: c.name.trim() || domain, domain, why: c.why.trim() });
  }
  return out;
}

/** Pure: what to show, skipping the user's own store and stores they already follow. */
export function pickSuggestions(all: Suggestion[], exclude: string[], n = SUGGEST_CONFIG.shown): Suggestion[] {
  const skip = new Set(exclude.map((d) => canonicalStoreHost(d) ?? d));
  return all.filter((s) => !skip.has(s.domain)).slice(0, n);
}

/** Pure: is the cached result still good for this store? */
export function cacheIsFresh(
  cached: { store: string | null; at: string | null },
  ownDomain: string,
  now = Date.now(),
): boolean {
  if (!cached.at || cached.store !== ownDomain) return false;
  return now - new Date(cached.at).getTime() < SUGGEST_CONFIG.cacheDays * 24 * 60 * 60 * 1000;
}
