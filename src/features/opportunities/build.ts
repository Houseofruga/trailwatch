import { money } from "@/features/appData/format";
import type { CatalogProduct } from "@/features/catalog/types";
import type { Classified } from "@/features/matching/candidates";
import type { ProductClass } from "@/features/matching/classify";
import { isClearance } from "@/features/matching/units";
import { positionOf, type BestsellerSignal, type BestsellerSnapshot } from "./bestsellers";
import { OPPORTUNITIES_CONFIG as C } from "./config";
import type { DemandSignal } from "./demand";

// B3 + B4: assortment gaps, competitor momentum and demand, ranked by signal
// strength, each with what we noticed, the evidence and one suggested action.
// Pure and template-based: every fact comes from the data, and nothing is
// presented as sales figures ("in their Best Sellers", never "sells X").

export type OpportunityKind = "category_gap" | "format_gap" | "price_tier_gap" | "rising_product" | "demand";

/** A catalog product, with its class once the classifier has reached it. */
export type Item = { product: CatalogProduct; cls: ProductClass | null };

export type CompetitorSignals = {
  storeId: string;
  storeName: string;
  // Every product: Best Sellers and demand signals don't need a class; gaps do.
  products: Item[];
  /** Latest Best Sellers read; null when unavailable or not read yet. */
  bestsellers: BestsellerSnapshot | null;
  rising: BestsellerSignal[];
  demand: DemandSignal[];
  /** handle → days on the homepage, for long-featured products. */
  featured: Map<string, number>;
};

export type EvidenceProduct = {
  title: string;
  handle: string;
  price: number | null;
  bestsellerPosition: number | null;
  inBestsellers: boolean;
  launchedDaysAgo: number | null;
  restocks90: number;
  soldOutAfterDays: number | null;
  featuredDays: number | null;
};

export type Evidence = {
  competitors: { storeId: string; storeName: string; products: EvidenceProduct[] }[];
  /** Short facts, e.g. "3 of 5 competitors", "#4 in Fernwood's Best Sellers". */
  signals: string[];
};

export type Opportunity = {
  key: string;
  kind: OpportunityKind;
  score: number;
  noticed: string;
  action: string;
  evidence: Evidence;
};

const DAY = 86_400_000;
const FORMAT_LABEL: Record<string, string> = {
  bundle: "bundles",
  kit: "kits",
  "travel size": "travel sizes",
  subscription: "subscriptions",
};
const FORMAT_ACTION: Record<string, string> = {
  bundle: "Consider a bundle of products your customers already buy together.",
  kit: "Consider a kit built around your best-selling product.",
  "travel size": "Consider testing a travel-size version of your best-seller, for trial or gifting.",
  subscription: "Consider subscribe-and-save on the products people reorder.",
};

/** The everyday price: the regular price when on sale, cheapest variant. */
export function regularPrice(c: Item): number | null {
  const v = c.product.variants;
  return v.length ? Math.min(...v.map((x) => Math.max(x.price, x.compareAtPrice ?? 0))) : null;
}

function evidenceFor(c: Item, s: CompetitorSignals, now: number): EvidenceProduct {
  const p = c.product;
  const handle = p.handle.toLowerCase();
  const published = Date.parse(p.publishedAt ?? p.createdAt ?? "");
  const demand = s.demand.find((d) => d.productId === p.id);
  return {
    title: p.title,
    handle,
    price: regularPrice(c),
    bestsellerPosition: s.bestsellers ? positionOf(s.bestsellers, handle) : null,
    inBestsellers: !!s.bestsellers?.members.includes(handle),
    launchedDaysAgo: Number.isFinite(published) ? Math.floor((now - published) / DAY) : null,
    restocks90: demand?.restocks90 ?? 0,
    soldOutAfterDays: demand?.soldOutAfterDays ?? null,
    featuredDays: s.featured.get(handle) ?? null,
  };
}

/** A product's demand and recent-launch signals. */
function extras(e: EvidenceProduct): number {
  return (
    (e.restocks90 >= C.restockCycles || e.soldOutAfterDays !== null ? C.weights.demand : 0) +
    (e.launchedDaysAgo !== null && e.launchedDaysAgo <= C.recentLaunchDays ? C.weights.recentLaunch : 0)
  );
}

/** How strong one product's own signals are (bestseller, demand, recent launch). */
const strength = (e: EvidenceProduct) => (e.inBestsellers ? C.weights.bestseller : 0) + extras(e);

/** "#4 in Fernwood's Best Sellers" or "in Fernwood's Best Sellers" ("their" once the store is named). */
function bestsellerPhrase(e: EvidenceProduct, store: string | null): string | null {
  const whose = store ? `${store}'s` : "their";
  if (e.bestsellerPosition) return `#${e.bestsellerPosition} in ${whose} Best Sellers`;
  return e.inBestsellers ? `in ${whose} Best Sellers` : null;
}

const competitorsWord = (n: number) => (n === 1 ? "competitor" : "competitors");

/** Competitors needed for a gap: the lower of the count and the share rules (at least 1). */
export function gapThreshold(tracked: number): number {
  return Math.max(1, Math.min(C.gapMinCompetitors, Math.ceil(tracked * C.gapMinShare)));
}

type Hit = { s: CompetitorSignals; items: { c: Classified; e: EvidenceProduct }[] };

/** Score and evidence for a set of competitor products that make up one gap. */
function gapFrom(hits: Hit[], tracked: number): { score: number; evidence: Evidence; lead: { store: string; e: EvidenceProduct } } {
  const competitors = hits.map((h) => {
    const items = [...h.items].sort((a, b) => strength(b.e) - strength(a.e) || (a.e.bestsellerPosition ?? 999) - (b.e.bestsellerPosition ?? 999));
    return { storeId: h.s.storeId, storeName: h.s.storeName, products: items.slice(0, 3).map((i) => i.e) };
  });
  const all = competitors.flatMap((c) => c.products.map((e) => ({ store: c.storeName, e })));
  const bestsellerStores = competitors.filter((c) => c.products.some((e) => e.inBestsellers)).length;
  const launches = Math.min(3, all.filter(({ e }) => e.launchedDaysAgo !== null && e.launchedDaysAgo <= C.recentLaunchDays).length);
  const demand = Math.min(3, all.filter(({ e }) => e.restocks90 >= C.restockCycles || e.soldOutAfterDays !== null).length);
  const score =
    hits.length * C.weights.competitor + bestsellerStores * C.weights.bestseller + launches * C.weights.recentLaunch + demand * C.weights.demand;
  const lead = [...all].sort((a, b) => strength(b.e) - strength(a.e) || (a.e.bestsellerPosition ?? 999) - (b.e.bestsellerPosition ?? 999))[0];
  const signals = [`${hits.length} of ${tracked} ${competitorsWord(tracked)}`];
  for (const { store, e } of all) {
    const b = bestsellerPhrase(e, store);
    if (b) signals.push(`${e.title}: ${b}`);
  }
  if (launches) signals.push(`${launches} launched in the last ${C.recentLaunchDays} days`);
  return { score, evidence: { competitors, signals: signals.slice(0, 5) }, lead };
}

function leadSentence(lead: { store: string; e: EvidenceProduct }): string {
  const b = bestsellerPhrase(lead.e, null);
  return b ? ` ${lead.store}'s ${lead.e.title} is ${b}.` : "";
}

/** B3: what competitors sell (in your categories) that you don't. Needs your classified store. */
export function assortmentGaps(own: Classified[], competitors: CompetitorSignals[], now: number): Opportunity[] {
  const mine = own.filter((c) => c.cls.category !== "other" && !isClearance(c.product));
  if (mine.length === 0 || competitors.length === 0) return [];
  const ownCats = new Set(mine.map((c) => c.cls.category));
  const ownSubs = new Set(mine.map((c) => `${c.cls.category}/${c.cls.subcategory}`));
  const ownFormats = new Set(mine.map((c) => c.cls.packType));
  const ownMin = Math.min(...mine.map((c) => regularPrice(c) ?? Infinity));
  const tracked = competitors.length;
  const need = gapThreshold(tracked);
  const inScope = (c: Classified) => c.cls.category !== "other" && (!C.gapSameCategoryOnly || ownCats.has(c.cls.category));

  const classified = (s: CompetitorSignals) => s.products.filter((c): c is Classified => c.cls !== null);
  const collect = (match: (c: Classified) => boolean): Hit[] =>
    competitors.flatMap((s) => {
      const items = classified(s).filter((c) => inScope(c) && match(c)).map((c) => ({ c, e: evidenceFor(c, s, now) }));
      return items.length ? [{ s, items }] : [];
    });

  const out: Opportunity[] = [];

  // Category gaps: subcategories you don't sell.
  const subs = new Set(competitors.flatMap((s) => classified(s).filter(inScope).map((c) => `${c.cls.category}/${c.cls.subcategory}`)));
  for (const sub of subs) {
    if (ownSubs.has(sub)) continue;
    const hits = collect((c) => `${c.cls.category}/${c.cls.subcategory}` === sub);
    if (hits.length < need) continue;
    const name = sub.split("/")[1];
    const { score, evidence, lead } = gapFrom(hits, tracked);
    out.push({
      key: `category_gap:${sub}`,
      kind: "category_gap",
      score,
      noticed: `${hits.length} of your ${tracked} ${competitorsWord(tracked)} sell ${name}, and you don't.${leadSentence(lead)}`,
      action: `Consider whether ${name} could fit your range. ${lead.store}'s ${lead.e.title}${lead.e.price ? ` at ${money(lead.e.price, { whole: true })}` : ""} is a reference point.`,
      evidence,
    });
  }

  // Format gaps: pack types you don't offer.
  for (const format of C.gapFormats) {
    if (ownFormats.has(format as Classified["cls"]["packType"])) continue;
    const hits = collect((c) => c.cls.packType === format);
    if (hits.length < need) continue;
    const { score, evidence, lead } = gapFrom(hits, tracked);
    out.push({
      key: `format_gap:${format}`,
      kind: "format_gap",
      score,
      noticed: `${hits.length} of your ${tracked} ${competitorsWord(tracked)} offer ${FORMAT_LABEL[format]}, and you don't.${leadSentence(lead)}`,
      action: FORMAT_ACTION[format],
      evidence,
    });
  }

  // Price tier: an entry product below the threshold, when your cheapest isn't.
  const entry = C.entryPriceUsd * 100;
  if (ownMin >= entry) {
    const hits = collect((c) => c.cls.packType === "single" && !isClearance(c.product) && (regularPrice(c) ?? Infinity) < entry);
    if (hits.length >= need) {
      const { score, evidence, lead } = gapFrom(hits, tracked);
      out.push({
        key: "price_tier_gap:entry",
        kind: "price_tier_gap",
        score,
        noticed: `${hits.length} of your ${tracked} ${competitorsWord(tracked)} have products under ${money(entry, { whole: true })}; your lowest regular price is ${money(ownMin, { whole: true })}.${leadSentence(lead)}`,
        action: `Consider an entry product under ${money(entry, { whole: true })} to lower the cost of a first order.`,
        evidence,
      });
    }
  }
  return out;
}

/** B1 + B2: competitor products gaining ground or showing demand. */
export function momentum(own: Classified[] | null, competitors: CompetitorSignals[], now: number): Opportunity[] {
  const ownCats = own ? new Set(own.filter((c) => c.cls.category !== "other").map((c) => c.cls.category)) : null;
  const ownSubs = own ? new Set(own.map((c) => `${c.cls.category}/${c.cls.subcategory}`)) : null;
  // Without your store, or before a product is classified, we can't tell
  // what's relevant, so it counts.
  const relevant = (c: Item) => !c.cls || !ownCats || ownCats.size === 0 || !C.gapSameCategoryOnly || ownCats.has(c.cls.category);
  const comparable = (c: Item) => !!c.cls && !!ownSubs?.has(`${c.cls.category}/${c.cls.subcategory}`);
  const out: Opportunity[] = [];

  for (const s of competitors) {
    const byHandle = new Map(s.products.map((c) => [c.product.handle.toLowerCase(), c]));
    const byId = new Map(s.products.map((c) => [c.product.id, c]));
    const covered = new Set<string>();

    for (const sig of s.rising) {
      const c = byHandle.get(sig.handle);
      if (!c || !relevant(c)) continue;
      // "Added to the list" only means something when there are no positions.
      if (sig.kind === "joined" && s.bestsellers?.rankedCount) continue;
      const e = evidenceFor(c, s, now);
      const where = sig.position ? `#${sig.position} in their Best Sellers` : "in their Best Sellers";
      const noticed =
        sig.kind === "launch_top"
          ? `${s.storeName}'s new ${c.product.title}${e.launchedDaysAgo !== null ? `, launched ${e.launchedDaysAgo} days ago,` : ""} is already ${where}.`
          : sig.kind === "entered_top"
            ? `${s.storeName}'s ${c.product.title} moved into the top ${C.topPositions} of their Best Sellers (#${sig.position}${sig.from ? `, from #${sig.from}` : ""}).`
            : sig.kind === "climbed"
              ? `${s.storeName}'s ${c.product.title} climbed from #${sig.from} to #${sig.position} in their Best Sellers this week.`
              : `${s.storeName} added ${c.product.title} to their Best Sellers.`;
      covered.add(c.product.id);
      out.push({
        key: `rising_product:${s.storeId}:${c.product.id}`,
        kind: "rising_product",
        score: C.weights.rising + (sig.kind === "joined" ? 0 : C.weights.bestseller) + extras(e),
        noticed,
        action: comparable(c)
          ? `Check how your comparable ${c.cls!.subcategory} compare on price and product page; this is the one ${s.storeName} is pushing.`
          : `Worth a look at what's working for it: price, positioning and timing${own && c.cls ? `. You don't sell ${c.cls.subcategory} yet` : ""}.`,
        evidence: { competitors: [{ storeId: s.storeId, storeName: s.storeName, products: [e] }], signals: [noticed] },
      });
    }

    const featuredOnly = [...s.featured.keys()].map((h) => byHandle.get(h)).filter((c): c is Item => !!c);
    const demandProducts = new Map<string, Item>();
    for (const d of s.demand) {
      const c = byId.get(d.productId);
      if (c) demandProducts.set(c.product.id, c);
    }
    for (const c of featuredOnly) demandProducts.set(c.product.id, c);

    for (const c of demandProducts.values()) {
      if (covered.has(c.product.id) || !relevant(c)) continue;
      const e = evidenceFor(c, s, now);
      const facts: string[] = [];
      if (e.restocks90 >= C.restockCycles) facts.push(`sold out and was restocked ${e.restocks90} times in the last ${C.demandWindowDays} days`);
      if (e.soldOutAfterDays !== null) facts.push(`sold out ${e.soldOutAfterDays === 0 ? "the day it launched" : `${e.soldOutAfterDays} days after launch`}`);
      if (e.featuredDays !== null) facts.push(`has been on their homepage for ${e.featuredDays} days`);
      if (facts.length === 0) continue;
      const stockSignal = e.restocks90 >= C.restockCycles || e.soldOutAfterDays !== null;
      const b = bestsellerPhrase(e, null);
      const noticed = `${s.storeName}'s ${c.product.title} ${facts.join(", and ")}.${b ? ` It's ${b}.` : ""}`;
      out.push({
        key: `demand:${s.storeId}:${c.product.id}`,
        kind: "demand",
        score: (stockSignal ? C.weights.demand : 0) + (e.featuredDays !== null ? C.weights.demand / 2 : 0) + (e.inBestsellers ? C.weights.bestseller : 0),
        noticed,
        action: comparable(c)
          ? stockSignal
            ? `Make sure your comparable ${c.cls!.subcategory} are in stock and easy to find; there's demand ${s.storeName} can't always meet.`
            : `Check your comparable ${c.cls!.subcategory} against it: it's the product ${s.storeName} keeps putting first.`
          : `Worth checking whether a comparable product fits your range.`,
        evidence: { competitors: [{ storeId: s.storeId, storeName: s.storeName, products: [e] }], signals: facts },
      });
    }
  }
  return out;
}

/** All of a user's opportunities, strongest first. */
export function buildOpportunities(own: Classified[] | null, competitors: CompetitorSignals[], now: number): Opportunity[] {
  const gaps = own?.length ? assortmentGaps(own, competitors, now) : [];
  return [...gaps, ...momentum(own, competitors, now)]
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
    .slice(0, C.keepPerUser);
}

/** One line of evidence for the briefing: who, and the strongest signals. */
export function evidenceLine(e: Evidence): string {
  const names = e.competitors.map((c) => c.storeName);
  const facts = e.signals.filter((s) => !/^\d+ of \d+ competitors?$/.test(s) && !names.some((n) => s.startsWith(`${n}'s`)));
  return [names.join(", "), ...facts.slice(0, 2)].filter(Boolean).join(" · ");
}

// ------------------------------------------------------------- dismissal

export type StoredOpportunity = { key: string; status: "open" | "dismissed" | "not_relevant"; dismissedScore: number | null };

/**
 * What to write for today's opportunities, given what the user has seen:
 * new ones open; dismissed ones stay dismissed unless the evidence got a lot
 * stronger; "not relevant" ones stay away; open ones that no longer hold go.
 */
export function mergeOpportunities(
  fresh: Opportunity[],
  stored: StoredOpportunity[],
): { upsert: (Opportunity & { status: StoredOpportunity["status"]; dismissedScore: number | null })[]; remove: string[] } {
  const byKey = new Map(stored.map((s) => [s.key, s]));
  const upsert = fresh.map((o) => {
    const had = byKey.get(o.key);
    if (!had || had.status === "open") return { ...o, status: "open" as const, dismissedScore: null };
    if (had.status === "dismissed" && had.dismissedScore !== null && o.score >= had.dismissedScore * C.resurfaceScoreRatio) {
      return { ...o, status: "open" as const, dismissedScore: null };
    }
    return { ...o, status: had.status, dismissedScore: had.dismissedScore };
  });
  const freshKeys = new Set(fresh.map((o) => o.key));
  const remove = stored.filter((s) => s.status === "open" && !freshKeys.has(s.key)).map((s) => s.key);
  return { upsert, remove };
}
