// Turns a user's event rows into the "moves" the app shows (Home feed,
// competitor timeline). Pure: summaries, kinds and bundling are tested.

import type { EventType, Severity } from "@/features/events/types";
import { unitPriceText } from "@/features/matching/units";
import { money } from "./format";
import type { BundleItem, Move, MoveKind } from "./types";

export type FeedRow = {
  eventId: string;
  storeId: string;
  competitorId: string;
  competitorName: string;
  competitorDomain?: string;
  type: EventType;
  severity: Severity;
  payload: Record<string, unknown>;
  detectedAt: string;
  snapshotId: string | null;
  meaning: string | null;
  /** user_events.context (Phase 5): the reader's comparable product. */
  ownMatch: { title: string; price: number | null } | null;
};

const KIND: Record<EventType, MoveKind> = {
  product_launched: "launch",
  product_removed: "launch",
  price_changed: "price",
  sale_started: "sale",
  sale_ended: "sale",
  sitewide_sale_detected: "sale",
  sold_out: "stock",
  restocked: "stock",
  promo_launched: "promo",
  positioning_shift: "promo",
  policy_change: "page",
  cosmetic: "page",
  price_position_change: "undercut",
};

export const kindOf = (type: EventType): MoveKind => KIND[type];

const str = (v: unknown, fallback = "") => (typeof v === "string" && v.trim() ? v.trim() : fallback);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
// Feed prices drop ".00": "$99", "$13.35", "$77.40".
const price = (cents: number | null) => money(cents, { whole: true });

/** One line per move, written for the feed (the competitor has its own column). */
export function moveSummary(type: EventType, payload: Record<string, unknown>): string {
  const title = str(payload.title, "A product");
  switch (type) {
    case "product_launched": {
      const p = num(payload.price);
      return `Launched ${title}${p !== null ? ` at ${price(p)}` : ""}`;
    }
    case "product_removed":
      return `Removed ${title} from the store`;
    case "price_changed": {
      const from = num(payload.oldPrice);
      const to = num(payload.newPrice);
      return from !== null && to !== null ? `Price change: ${title} ${price(from)} → ${price(to)}` : `Price change: ${title}`;
    }
    case "sale_started": {
      const was = num(payload.compareAtPrice);
      const now = num(payload.salePrice);
      const pct = num(payload.pctOff);
      return was !== null && now !== null
        ? `${title}: ${price(was)} → ${price(now)}${pct ? ` (−${pct}%)` : ""}`
        : `Sale started: ${title}`;
    }
    case "sale_ended": {
      const p = num(payload.newPrice);
      return `Sale ended: ${title}${p !== null ? `, back to ${price(p)}` : ""}`;
    }
    case "sitewide_sale_detected": {
      const share = num(payload.shareDiscounted);
      const max = num(payload.maxPctOff) ?? num(payload.avgPctOff);
      return `Sitewide sale: ${share !== null ? `${share}% of products discounted` : "most products discounted"}${max ? `, up to −${max}%` : ""}`;
    }
    case "sold_out":
      return `${title} sold out`;
    case "restocked":
      return `Back in stock: ${title}`;
    case "price_position_change": {
      const theirs = num(payload.competitorPrice);
      const ours = num(payload.ownPrice);
      const pct = num(payload.pctBelow);
      const size = str(payload.competitorSize);
      const named = `${title}${size ? ` (${size})` : ""}`;
      if (theirs === null || ours === null) return `Cheaper than you: ${named}`;
      // Name the product it was compared with, and the size when they differ.
      const own = str(payload.ownTitle);
      const ownSize = str(payload.ownSize);
      const yours = `${own ? `your ${own}` : "yours"}${ownSize && ownSize !== size ? ` (${ownSize})` : ""}`;
      const tu = num(payload.competitorUnitPrice);
      const ou = num(payload.ownUnitPrice);
      const unit = (["ml", "g", "count"] as const).find((u) => u === payload.unit) ?? null;
      // Different sizes: the fair comparison is the price per ml, g or item.
      if (payload.basis === "unit" && tu !== null && ou !== null) {
        return `Cheaper than you: ${named} is ${price(theirs)} (${unitPriceText(tu, unit)}), ${yours} is ${price(ours)} (${unitPriceText(ou, unit)})`;
      }
      return `Cheaper than you: ${named} is ${price(theirs)}, ${pct !== null ? `${Math.round(pct)}% less than ${yours} at` : `${yours} is`} ${price(ours)}`;
    }
    default:
      // Page events carry the classifier's one sentence.
      return str(payload.summary, "Changed a watched page").replace(/\.$/, "");
  }
}

function comparedWithYours(r: FeedRow): string | undefined {
  if (!r.ownMatch || r.type === "price_position_change") return undefined; // an undercut already says it
  const theirs = num(r.payload.salePrice) ?? num(r.payload.newPrice) ?? num(r.payload.price);
  const ours = r.ownMatch.price;
  if (theirs === null || ours === null) return `Your ${r.ownMatch.title} is the closest match.`;
  const diff = ours - theirs;
  if (diff === 0) return `Your ${r.ownMatch.title} is the same price, ${price(ours)}.`;
  return `Your ${r.ownMatch.title} is ${price(ours)}, ${price(Math.abs(diff))} ${diff > 0 ? "more" : "less"}.`;
}

// Catalog moves of one kind at one store on the same day (UTC) are one move
// ("Launched 5 products", "Cut prices on 66 products"), however many checks
// they were found in, as in the alerts and the Monday briefing. Price changes
// split by direction: cuts and rises.
const BUNDLED: EventType[] = ["product_launched", "sale_started", "sale_ended", "price_changed", "sold_out", "restocked", "product_removed"];
const RANK: Record<Severity, number> = { high: 2, normal: 1, low: 0 };

/** Which move an event belongs to: its store, kind and day for catalog moves, else itself. */
export function bundleKey(e: {
  type: EventType;
  storeId: string;
  snapshotId: string | null;
  payload: Record<string, unknown>;
  eventId: string;
  detectedAt: string;
}): string {
  // Catalog events carry the snapshot they were found in; page events don't and stay single.
  if (!BUNDLED.includes(e.type) || !e.snapshotId) return e.eventId;
  const direction = e.type === "price_changed" ? ((num(e.payload.pctChange) ?? 0) < 0 ? ":down" : ":up") : "";
  return `${e.storeId}|${e.type}${direction}|${e.detectedAt.slice(0, 10)}`;
}

function bundleSummary(type: EventType, rows: FeedRow[]): string {
  const titles = rows.map((r) => str(r.payload.title, "a product"));
  // "Boucle Ball Pillow (Ink), (Tobacco)", "Sheet Set - Olive, Plum": repeat names collapse to their variant.
  const base = titles[0].replace(/\s*(\([^)]*\)|-\s[^-]+)\s*$/, "");
  const short = titles
    .slice(0, 2)
    .map((t, i) => (i > 0 && t.startsWith(base) && t !== base ? t.slice(base.length).replace(/^\s*-\s*/, "").trim() : t));
  const more = rows.length - short.length;
  const list = `${short.join(", ")}${more > 0 ? `, +${more}` : ""}`;
  const n = rows.length;
  const lead = rows[0];
  switch (type) {
    case "product_launched":
      return `Launched ${n} products: ${list}`;
    case "price_changed": {
      const from = num(lead.payload.oldPrice);
      const to = num(lead.payload.newPrice);
      const verb = (num(lead.payload.pctChange) ?? 0) < 0 ? "Cut" : "Raised";
      const leadText = from !== null && to !== null ? `${titles[0]} ${price(from)} → ${price(to)}` : titles[0];
      return `${verb} prices on ${n} products: ${leadText}, +${n - 1}`;
    }
    case "sale_ended":
      return `Sale ended on ${n} products: ${list}`;
    case "sold_out":
      return `${n} products sold out: ${list}`;
    case "restocked":
      return `${n} products back in stock: ${list}`;
    case "product_removed":
      return `Removed ${n} products from the store: ${list}`;
  }
  const was = num(lead.payload.compareAtPrice);
  const now = num(lead.payload.salePrice);
  const leadText = was !== null && now !== null ? `${titles[0]} ${price(was)} → ${price(now)}` : titles[0];
  return `Sale started on ${rows.length} products: ${leadText}${rows.length > 1 ? `, +${rows.length - 1}` : ""}`;
}

/** Rows newest first → moves newest first, with same-read launches/sales bundled. */
export function toMoves(rows: FeedRow[]): Move[] {
  const groups = new Map<string, FeedRow[]>();
  const order: string[] = [];
  for (const r of rows) {
    const key = bundleKey(r);
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(r);
  }

  return order.map((key) => {
    const group = groups.get(key)!;
    // Lead with the most important row (a high-priority one, if any).
    const lead = [...group].sort((a, b) => RANK[b.severity] - RANK[a.severity])[0];
    const bundled = group.length > 1;
    const bundle: BundleItem[] | undefined = bundled
      ? group.map((r) => ({
          title: str(r.payload.title, "A product"),
          price: num(r.payload.salePrice) ?? num(r.payload.newPrice) ?? num(r.payload.price),
        }))
      : undefined;
    return {
      id: lead.eventId,
      competitorId: lead.competitorId,
      competitorName: lead.competitorName,
      competitorDomain: lead.competitorDomain,
      kind: kindOf(lead.type),
      priority: group.some((r) => r.severity === "high") ? "high" : lead.severity,
      summary: bundled ? bundleSummary(lead.type, group) : moveSummary(lead.type, lead.payload),
      at: group[0].detectedAt,
      bundle,
      meaning: lead.meaning ?? undefined,
      comparedWithYours: comparedWithYours(lead),
    };
  });
}
