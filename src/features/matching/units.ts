import type { CatalogProduct, CatalogVariant } from "@/features/catalog/types";
import { MATCHING_CONFIG } from "./config";

// Sizes and unit prices (matching prompt A1–A2). Pure code, no model: sizes
// come from variant and product titles, and an unreadable size stays unknown.

export type Unit = "ml" | "g" | "count";
export type Quantity = { amount: number; unit: Unit };

const n = String.raw`(\d+(?:[.,]\d+)?)`;
// Longest spellings first so "fl oz" wins over "oz" and "ml" over "l".
const MEASURES: [string, Unit, number][] = [
  [String.raw`fl\.?\s*oz|fluid\s*ounces?`, "ml", 29.5735],
  [String.raw`ml|millilit(?:er|re)s?`, "ml", 1],
  [String.raw`l|lit(?:er|re)s?`, "ml", 1000],
  // Plain ounces are weight. Liquids are usually labelled "fl oz".
  [String.raw`oz|ounces?`, "g", 28.3495],
  [String.raw`kg|kilograms?`, "g", 1000],
  [String.raw`lbs?|pounds?`, "g", 453.592],
  [String.raw`g|grams?|gr`, "g", 1],
];
const COUNT_WORDS = String.raw`count|ct|capsules?|caps|tablets?|tabs|gummies|softgels?|chews|pieces|pcs|pods|sachets|stick\s*packs?|servings|bars|pairs?`;

const num = (s: string) => Number.parseFloat(s.replace(",", "."));

/** A size written in text ("30ml", "1.7 fl oz", "2 x 30ml", "60 capsules", "Set of 4"), or null. */
export function parseQuantity(text: string): Quantity | null {
  // "400 thread count" is a fabric spec, not a quantity.
  const t = text.toLowerCase().replace(/\b\d+\s*-?\s*(?:thread[- ]?count|tc)\b/g, " ");
  for (const [pattern, unit, factor] of MEASURES) {
    // "2 x 30ml" / "3×50 g": a multipack of a measured size.
    const multi = new RegExp(String.raw`\b(\d+)\s*[x×]\s*${n}\s*(?:${pattern})(?![a-z])`).exec(t);
    if (multi) return { amount: round(num(multi[1]) * num(multi[2]) * factor), unit };
    const single = new RegExp(String.raw`(?:^|[^a-z0-9.,])${n}\s*(?:${pattern})(?![a-z])`).exec(t);
    if (single && num(single[1]) > 0) return { amount: round(num(single[1]) * factor), unit };
  }
  const count =
    new RegExp(String.raw`\b(\d+)\s*-?\s*(?:${COUNT_WORDS})\b`).exec(t) ??
    /\b(?:pack|set|box|bundle) of (\d+)\b/.exec(t) ??
    /\b(\d+)\s*-?\s*(?:pack|pk|piece|pc)\b/.exec(t);
  if (count && Number(count[1]) > 0) return { amount: Number(count[1]), unit: "count" };
  // "Hand Towels (Pair)": two, even with no number written.
  if (/\bpair\b/.test(t)) return { amount: 2, unit: "count" };
  return null;
}

const round = (x: number) => Math.round(x * 100) / 100;

// Named sizes, compared like for like (Queen with Queen). Order = preference
// when several are shared: the most common size first.
export const SIZE_LABELS = [
  "queen", "king", "full/queen", "full", "twin", "twin xl", "cal king", "split king",
  "m", "s", "l", "xs", "xl", "xxl",
] as const;
const LABEL_PATTERNS: [RegExp, string][] = [
  [/\b(california|cal\.?) king\b/, "cal king"],
  [/\bsplit king\b/, "split king"],
  [/\bfull\s*\/\s*queen\b|\bf\/q\b/, "full/queen"],
  [/\bking\b/, "king"],
  [/\bqueen\b/, "queen"],
  [/\btwin\s*xl\b/, "twin xl"],
  [/\btwin\b/, "twin"],
  [/\b(full|double)\b/, "full"],
];
const APPAREL: Record<string, string> = {
  xxs: "xs", xs: "xs", "x-small": "xs", "extra small": "xs", s: "s", small: "s", m: "m", medium: "m",
  l: "l", large: "l", xl: "xl", "x-large": "xl", "extra large": "xl", xxl: "xxl", "2xl": "xxl", "xx-large": "xxl",
};

/** A named size in a variant title ("Queen / White" → "queen", "M / Black" → "m"), or null. */
export function sizeLabel(variantTitle: string): string | null {
  const t = variantTitle.toLowerCase();
  for (const [re, label] of LABEL_PATTERNS) if (re.test(t)) return label;
  // Apparel sizes only as a whole option ("M", not the m in "Mint").
  for (const part of t.split("/").map((p) => p.trim())) if (APPAREL[part]) return APPAREL[part];
  return null;
}

/** A variant's size: its own title first, else the product title (one-size products). */
export function variantQuantity(product: CatalogProduct, variant: CatalogVariant): Quantity | null {
  return parseQuantity(variant.title) ?? parseQuantity(product.title);
}

/** Price per ml, g or item, in cents. Null when the size is unknown. */
export function unitPrice(price: number, q: Quantity | null): number | null {
  return q && q.amount > 0 ? price / q.amount : null;
}

/** The size most shoppers see: the cheapest variant's. Used by the candidate filter. */
export function typicalQuantity(product: CatalogProduct): Quantity | null {
  const cheapest = [...product.variants].sort((a, b) => a.price - b.price)[0];
  return cheapest ? variantQuantity(product, cheapest) : parseQuantity(product.title);
}

export function isClearance(product: CatalogProduct): boolean {
  return MATCHING_CONFIG.clearancePattern.test(product.title) || product.tags.some((t) => MATCHING_CONFIG.clearancePattern.test(t));
}

export type PriceSide = { title: string; price: number; unitPrice: number; variant: string; size: string | null };
export type PricePosition = {
  /** How the two were compared: per ml/g/item, same named size, or one-size items. */
  basis: "unit" | "size" | "item";
  unit: Unit | null;
  theirs: PriceSide;
  ours: PriceSide;
  /** How far below yours their unit price is (negative: above). */
  pctBelow: number;
};

const inStock = (vs: CatalogVariant[]) => vs.filter((v) => v.available);
const fmtQty = (q: Quantity) => `${round(q.amount)}${q.unit === "count" ? " ct" : q.unit}`;

/**
 * Their product's price against yours, like for like (A2–A4). Tries, in order:
 * unit price (both sizes known in the same unit, within the size range), the
 * same named size (Queen vs Queen), then one-size items. Null when there's no
 * fair basis, their product is sold out, or yours is clearance stock.
 */
export function pricePosition(theirs: CatalogProduct, ours: CatalogProduct, cfg = MATCHING_CONFIG): PricePosition | null {
  if (isClearance(ours)) return null;
  const tv = inStock(theirs.variants);
  const ov = inStock(ours.variants).length ? inStock(ours.variants) : ours.variants;
  if (tv.length === 0 || ov.length === 0) return null;

  const side = (p: CatalogProduct, v: CatalogVariant, per: number, size: string | null): PriceSide => ({
    title: p.title,
    price: v.price,
    unitPrice: per,
    variant: v.title,
    size,
  });
  const result = (basis: PricePosition["basis"], unit: Unit | null, t: PriceSide, o: PriceSide): PricePosition => ({
    basis,
    unit,
    theirs: t,
    ours: o,
    pctBelow: Math.round(((o.unitPrice - t.unitPrice) / o.unitPrice) * 1000) / 10,
  });

  // 1. Unit price: the closest-sized pair of variants in the same unit.
  let best: { t: CatalogVariant; o: CatalogVariant; tq: Quantity; oq: Quantity; gap: number } | null = null;
  for (const o of ov) {
    const oq = variantQuantity(ours, o);
    if (!oq) continue;
    for (const t of tv) {
      const tq = variantQuantity(theirs, t);
      if (!tq || tq.unit !== oq.unit) continue;
      const ratio = tq.amount / oq.amount;
      if (ratio < cfg.sizeRangeMin || ratio > cfg.sizeRangeMax) continue;
      const gap = Math.abs(Math.log(ratio));
      if (!best || gap < best.gap || (gap === best.gap && t.price / tq.amount < best.t.price / best.tq.amount)) {
        best = { t, o, tq, oq, gap };
      }
    }
  }
  if (best) {
    return result(
      "unit",
      best.tq.unit,
      side(theirs, best.t, best.t.price / best.tq.amount, fmtQty(best.tq)),
      side(ours, best.o, best.o.price / best.oq.amount, fmtQty(best.oq)),
    );
  }

  // 2. Same named size (Queen vs Queen), cheapest variant of that size on each side.
  const labelled = (vs: CatalogVariant[]) => {
    const m = new Map<string, CatalogVariant>();
    for (const v of vs) {
      const l = sizeLabel(v.title);
      if (l && (!m.has(l) || v.price < m.get(l)!.price)) m.set(l, v);
    }
    return m;
  };
  const tl = labelled(tv);
  const ol = labelled(ov);
  const shared = SIZE_LABELS.find((l) => tl.has(l) && ol.has(l));
  if (shared) {
    const t = tl.get(shared)!;
    const o = ol.get(shared)!;
    return result("size", null, side(theirs, t, t.price, shared), side(ours, o, o.price, shared));
  }

  // 3. One-size items: neither side has sizes at all, so item vs item is fair.
  const sized = (p: CatalogProduct) => p.variants.some((v) => variantQuantity(p, v) || sizeLabel(v.title));
  if (!sized(theirs) && !sized(ours) && tl.size === 0 && ol.size === 0) {
    const t = tv.reduce((a, b) => (b.price < a.price ? b : a));
    const o = ov.reduce((a, b) => (b.price < a.price ? b : a));
    const pos = result("item", null, side(theirs, t, t.price, null), side(ours, o, o.price, null));
    // With no sizes to check, a huge gap usually means one of them is a set.
    return pos.pctBelow > cfg.itemGapMaxPct ? null : pos;
  }
  return null;
}

/** A product's headline price: its cheapest in-stock variant (else cheapest overall). */
export function headlinePrice(p: CatalogProduct): number | null {
  const pool = p.variants.some((v) => v.available) ? p.variants.filter((v) => v.available) : p.variants;
  return pool.length ? Math.min(...pool.map((v) => v.price)) : null;
}

/** "$1.27/ml", "$3.10 per 100g", "$12.50 each": a unit price for people. */
export function unitPriceText(centsPerUnit: number, unit: Unit | null): string {
  const dollars = (c: number) => `$${(c / 100).toFixed(2)}`;
  if (unit === "count") return `${dollars(centsPerUnit)} each`;
  if (unit === "ml" || unit === "g") {
    // Fractions of a cent per gram read badly: switch to per 100.
    return centsPerUnit < 5 ? `${dollars(centsPerUnit * 100)} per 100${unit}` : `${dollars(centsPerUnit)}/${unit}`;
  }
  return dollars(centsPerUnit);
}
