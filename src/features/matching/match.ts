import type { CatalogProduct } from "@/features/catalog/types";

// Simple, explainable matching (SPEC.md §5 Phase 5: "title/product_type
// similarity; start simple, embeddings later").
export const MATCH_CONFIG = {
  // Minimum score for "comparable product" (context: "vs your X").
  minScore: 0.5,
  // Stricter bar for an undercut — it's a high-severity alert, so a wrong one
  // costs more than a missed one. "Shower Curtain Liner" vs "Linen Shower
  // Curtain" scored 0.65 against real catalogs (Parachute vs Brooklinen).
  undercutMinScore: 0.75,
  // Same non-empty product_type: a nudge up; different ones: a nudge down.
  sameTypeBonus: 0.15,
  differentTypePenalty: 0.2,
  // A competitor is "undercutting" when its price is at least this far below yours.
  undercutPct: 5,
};

// Words that describe packaging/size/marketing, not what the product is.
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "for", "with", "of", "in", "by", "to", "your", "our", "new",
  "set", "pack", "bundle", "kit", "size", "mini", "travel", "full", "refill", "limited", "edition",
  "oz", "fl", "ml", "g", "kg", "lb", "lbs", "ct", "count", "piece", "pieces", "pc", "pcs", "x",
  "last", "call", "sale", "womens", "mens", "unisex",
]);

/**
 * The part of a title that names the product: drops a trailing "- Pebble
 * Stripe" / "| King" variant suffix and any "(Thyme)" parenthetical. Color and
 * variant words otherwise dilute the similarity of the same product.
 */
export function baseTitle(title: string): string {
  return title
    .replace(/\([^)]*\)/g, " ")
    .split(/\s[-–—|]\s/)[0]
    .trim();
}

/** Title → comparable tokens: lowercase words, minus brand, sizes, numbers, stopwords. */
export function titleTokens(title: string, brand = ""): Set<string> {
  const brandWords = new Set(brand.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  const words = baseTitle(title)
    .toLowerCase()
    .replace(/[’']/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !/^\d/.test(w) && !STOPWORDS.has(w) && !brandWords.has(w))
    // Light plural folding so "creams" meets "cream".
    .map((w) => (w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w));
  return new Set(words);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  return shared / (a.size + b.size - shared);
}

export function similarity(a: CatalogProduct, b: CatalogProduct, cfg = MATCH_CONFIG): number {
  let score = jaccard(titleTokens(a.title, a.vendor), titleTokens(b.title, b.vendor));
  const ta = a.productType.trim().toLowerCase();
  const tb = b.productType.trim().toLowerCase();
  if (ta && tb) score += ta === tb ? cfg.sameTypeBonus : -cfg.differentTypePenalty;
  return Math.max(0, Math.min(1, score));
}

export type OwnMatch = { product: CatalogProduct; score: number };

/**
 * An index over the user's own catalog for fast "which of my products is this
 * like?" lookups: candidates share at least one title token, so a competitor
 * product is only scored against plausible matches, not the whole catalog.
 */
export function buildOwnIndex(own: CatalogProduct[]) {
  const byToken = new Map<string, number[]>();
  own.forEach((p, i) => {
    for (const t of titleTokens(p.title, p.vendor)) {
      const list = byToken.get(t);
      if (list) list.push(i);
      else byToken.set(t, [i]);
    }
  });

  return function bestMatch(competitor: CatalogProduct, cfg = MATCH_CONFIG): OwnMatch | null {
    const candidates = new Set<number>();
    for (const t of titleTokens(competitor.title, competitor.vendor)) {
      for (const i of byToken.get(t) ?? []) candidates.add(i);
    }
    let best: OwnMatch | null = null;
    for (const i of candidates) {
      const score = similarity(competitor, own[i], cfg);
      if (score >= cfg.minScore && (!best || score > best.score)) best = { product: own[i], score };
    }
    return best;
  };
}

// A product's headline price: its cheapest in-stock variant (else cheapest overall).
export function headlinePrice(p: CatalogProduct): number | null {
  const pool = p.variants.some((v) => v.available) ? p.variants.filter((v) => v.available) : p.variants;
  return pool.length ? Math.min(...pool.map((v) => v.price)) : null;
}

/**
 * How a product is packaged, from its full title: a multi-unit set/bundle/pack
 * (with its count when stated) or a mini/travel size. Similarity ignores these
 * words on purpose, so prices must only be compared when packaging agrees —
 * one $14 towel vs a $59 towel set is not an undercut.
 */
export function packaging(title: string): { multi: boolean; count: number | null; mini: boolean } {
  const t = title.toLowerCase();
  const count =
    Number(/\bset of (\d+)\b/.exec(t)?.[1] ?? /\b(\d+)[- ]?(?:pack|pk|piece|pc|count|ct)\b/.exec(t)?.[1] ?? NaN) || null;
  return {
    multi: count !== null ? count > 1 : /\b(set|bundle|pack|pair|kit|collection|duo|trio)\b/.test(t),
    count,
    mini: /\b(mini|travel|sample|trial)\b/.test(t),
  };
}

function samePackaging(a: string, b: string): boolean {
  const pa = packaging(a);
  const pb = packaging(b);
  if (pa.mini !== pb.mini || pa.multi !== pb.multi) return false;
  return pa.count === null || pb.count === null || pa.count === pb.count;
}

export type Undercut = { competitorPrice: number; ownPrice: number; pctBelow: number };

/**
 * Is the competitor's comparable product priced meaningfully below the user's?
 * Pass the match score: undercuts need a stronger match than context does, and
 * the same packaging on both sides.
 */
export function undercut(competitor: CatalogProduct, own: CatalogProduct, score: number, cfg = MATCH_CONFIG): Undercut | null {
  if (score < cfg.undercutMinScore || !samePackaging(competitor.title, own.title)) return null;
  const theirs = headlinePrice(competitor);
  const ours = headlinePrice(own);
  if (theirs === null || ours === null || ours <= 0) return null;
  if (!competitor.variants.some((v) => v.available)) return null; // can't undercut while sold out
  const pctBelow = Math.round(((ours - theirs) / ours) * 1000) / 10;
  return pctBelow >= cfg.undercutPct ? { competitorPrice: theirs, ownPrice: ours, pctBelow } : null;
}
