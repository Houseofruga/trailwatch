import type { CatalogProduct } from "@/features/catalog/types";
import type { ProductClass } from "./classify";
import { MATCHING_CONFIG } from "./config";
import { PACK_GROUP } from "./taxonomy.config";
import { typicalQuantity } from "./units";

// A3 step 1 and the match rules, all pure: which pairs are worth asking the
// model about, and what a judged pair means for one user.

export type Classified = { product: CatalogProduct; cls: ProductClass };
export type Candidate = { own: Classified; comp: Classified };

const words = (c: Classified) =>
  new Set(
    `${c.cls.use} ${c.cls.attributes.join(" ")} ${c.product.title}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2),
  );

function overlap(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared += 1;
  return shared / Math.max(1, Math.min(a.size, b.size));
}

/** Same category and subcategory, compatible pack type, size within range (when both are known). */
export function compatible(own: Classified, comp: Classified, cfg = MATCHING_CONFIG): boolean {
  if (own.cls.category === "other" || comp.cls.category === "other") return false;
  if (own.cls.category !== comp.cls.category || own.cls.subcategory !== comp.cls.subcategory) return false;
  if (PACK_GROUP[own.cls.packType] !== PACK_GROUP[comp.cls.packType]) return false;
  const oq = typicalQuantity(own.product);
  const cq = typicalQuantity(comp.product);
  if (oq && cq && oq.unit === cq.unit) {
    const ratio = cq.amount / oq.amount;
    if (ratio < cfg.sizeRangeMin || ratio > cfg.sizeRangeMax) return false;
  }
  return true;
}

/** For each competitor product, its few most plausible counterparts in your catalog. */
export function shortlist(own: Classified[], comp: Classified[], cfg = MATCHING_CONFIG): Candidate[] {
  const bySub = new Map<string, Classified[]>();
  for (const o of own) {
    const key = `${o.cls.category}/${o.cls.subcategory}`;
    bySub.set(key, [...(bySub.get(key) ?? []), o]);
  }
  const out: Candidate[] = [];
  for (const c of comp) {
    const pool = (bySub.get(`${c.cls.category}/${c.cls.subcategory}`) ?? []).filter((o) => compatible(o, c, cfg));
    if (pool.length === 0) continue;
    const cw = words(c);
    pool
      .map((o) => ({ o, score: overlap(words(o), cw) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, cfg.shortlistPerProduct)
      .forEach(({ o }) => out.push({ own: o, comp: c }));
  }
  return out;
}

export type Verdict = "confirmed" | "rejected";
export type MatchStatus = "active" | "possible" | "discarded" | "rejected";

/** What a pair means for one user: their own verdict always wins over the model. */
export function matchStatus(confidence: number | null, verdict?: Verdict | null, cfg = MATCHING_CONFIG): MatchStatus {
  if (verdict === "rejected") return "rejected";
  if (verdict === "confirmed") return "active";
  if (confidence === null) return "discarded";
  if (confidence >= cfg.highConfidence) return "active";
  if (confidence >= cfg.mediumConfidence) return "possible";
  return "discarded";
}

export type PairRow = { ownProductId: string; compProductId: string; confidence: number | null; reason: string };

/**
 * For one user: each competitor product's active match (the best one), with
 * their confirmations, rejections and manual links applied. A manual link is a
 * confirmation of a pair the model never judged.
 */
export function activeMatches(pairs: PairRow[], verdicts: Map<string, Verdict>): Map<string, PairRow> {
  const key = (p: { ownProductId: string; compProductId: string }) => `${p.ownProductId}:${p.compProductId}`;
  const all = new Map(pairs.map((p) => [key(p), p]));
  for (const [k, v] of verdicts) {
    if (v !== "confirmed" || all.has(k)) continue;
    const [ownProductId, compProductId] = k.split(":");
    all.set(k, { ownProductId, compProductId, confidence: null, reason: "Linked by you" });
  }
  const best = new Map<string, PairRow>();
  for (const p of all.values()) {
    const verdict = verdicts.get(key(p)) ?? null;
    if (matchStatus(p.confidence, verdict) !== "active") continue;
    const strength = verdict === "confirmed" ? 2 : (p.confidence ?? 0);
    const current = best.get(p.compProductId);
    const currentStrength = current
      ? verdicts.get(key(current)) === "confirmed"
        ? 2
        : (current.confidence ?? 0)
      : -1;
    if (strength > currentStrength) best.set(p.compProductId, p);
  }
  return best;
}

export const verdictKey = (ownProductId: string, compProductId: string) => `${ownProductId}:${compProductId}`;
