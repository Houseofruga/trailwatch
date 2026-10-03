// Turns a user's event rows into the "moves" the app shows (Home feed,
// competitor timeline). Pure: summaries, kinds and bundling are tested.

import type { EventType, Severity } from "@/features/events/types";
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
      return theirs !== null && ours !== null
        ? `Cheaper than you: ${named} is ${price(theirs)}${pct !== null ? `, ${pct}% below yours like for like` : `, yours is ${price(ours)}`}`
        : `Cheaper than you: ${named}`;
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

// Launches and sale starts found in the same catalog read are one move
// ("Launched 5 products"), like the bundled alert.
const BUNDLED: EventType[] = ["product_launched", "sale_started"];
const RANK: Record<Severity, number> = { high: 2, normal: 1, low: 0 };

function bundleSummary(type: EventType, rows: FeedRow[]): string {
  const titles = rows.map((r) => str(r.payload.title, "a product"));
  // "Boucle Ball Pillow (Ink), (Tobacco)" — repeat names collapse to their variant.
  const base = titles[0].replace(/\s*\([^)]*\)\s*$/, "");
  const short = titles.slice(0, 2).map((t, i) => (i > 0 && t.startsWith(base) && t !== base ? t.slice(base.length).trim() : t));
  const more = rows.length - short.length;
  const list = `${short.join(", ")}${more > 0 ? `, +${more}` : ""}`;
  if (type === "product_launched") return `Launched ${rows.length} products: ${list}`;
  const lead = rows[0];
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
    const key = BUNDLED.includes(r.type) && r.snapshotId ? `${r.storeId}|${r.type}|${r.snapshotId}` : r.eventId;
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
          price: num(r.payload.salePrice) ?? num(r.payload.price),
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
