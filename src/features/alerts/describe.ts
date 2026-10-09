import { money } from "@/features/email/shell";
import type { EventType } from "@/features/events/types";
import { unitPriceText } from "@/features/matching/units";

type Payload = Record<string, unknown>;

const str = (v: unknown, fallback = "") => (typeof v === "string" && v.trim() ? v.trim() : fallback);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * One plain-English sentence per event, for alerts and the briefing's
 * per-competitor sections. Catalog events are described from their numbers
 * (no AI); page events carry the classifier's summary.
 */
export function describeEvent(type: EventType, payload: Payload, storeName: string): string {
  const title = str(payload.title, "a product");
  switch (type) {
    case "product_launched": {
      const price = num(payload.price);
      return `${storeName} launched ${title}${price !== null ? ` at ${money(price)}` : ""}.`;
    }
    case "product_removed":
      return `${storeName} removed ${title} from its store.`;
    case "price_changed": {
      const from = num(payload.oldPrice);
      const to = num(payload.newPrice);
      const pct = num(payload.pctChange);
      if (from === null || to === null) return `${storeName} changed the price of ${title}.`;
      const verb = to < from ? "cut" : "raised";
      const pctText = pct !== null ? ` (${pct > 0 ? "+" : ""}${pct}%)` : "";
      return `${storeName} ${verb} ${title} from ${money(from)} to ${money(to)}${pctText}.`;
    }
    case "sale_started": {
      const pct = num(payload.pctOff);
      const price = num(payload.salePrice);
      const was = num(payload.compareAtPrice);
      const detail =
        price !== null && was !== null ? `: ${money(price)}, down from ${money(was)}${pct ? ` (${pct}% off)` : ""}` : "";
      return `${storeName} put ${title} on sale${detail}.`;
    }
    case "sale_ended": {
      const price = num(payload.newPrice);
      return `${storeName} ended the sale on ${title}${price !== null ? ` (back to ${money(price)})` : ""}.`;
    }
    case "sold_out":
      return `${storeName}'s ${title} sold out.`;
    case "restocked":
      return `${storeName} restocked ${title}.`;
    case "sitewide_sale_detected": {
      const count = num(payload.productsDiscounted);
      const share = num(payload.shareDiscounted);
      const avg = num(payload.avgPctOff);
      const parts = [
        count !== null ? `${count} products newly discounted` : null,
        share !== null ? `${share}% of what's in stock` : null,
        avg !== null ? `${avg}% off on average` : null,
      ].filter(Boolean);
      return `${storeName} is running a sitewide sale${parts.length ? `: ${parts.join(", ")}` : ""}.`;
    }
    case "price_position_change": {
      // "Luna Skin's new Vitamin C Serum (30ml) is $38, or $1.27/ml. Your Radiance Serum is $1.47/ml."
      const theirs = num(payload.competitorPrice);
      const own = str(payload.ownTitle, "your comparable product");
      const isNew = payload.trigger === "product_launched" ? "new " : "";
      const theirSize = str(payload.competitorSize);
      const ownSize = str(payload.ownSize);
      const unit = (["ml", "g", "count"] as const).find((u) => u === payload.unit) ?? null;
      const tu = num(payload.competitorUnitPrice);
      const ou = num(payload.ownUnitPrice);
      const pct = num(payload.pctBelow);
      const name = `${storeName}'s ${isNew}${title}${theirSize ? ` (${theirSize})` : ""}`;
      if (theirs === null) return `${name} is now priced below your ${own}.`;
      if (payload.basis === "unit" && tu !== null && ou !== null) {
        return `${name} is ${money(theirs)}, or ${unitPriceText(tu, unit)}. Your ${own}${ownSize ? ` (${ownSize})` : ""} is ${unitPriceText(ou, unit)}${pct !== null ? `, so theirs is ${Math.round(pct)}% less` : ""}.`;
      }
      const ours = num(payload.ownPrice);
      // Same named size or one-size items: "…(Queen) is $249, 11% below your Core Sheet Set (Queen) at $279."
      const yours = `your ${own}${ownSize ? ` (${ownSize})` : ""}${ours !== null ? ` at ${money(ours)}` : ""}`;
      return `${name} is ${money(theirs)}, ${pct !== null ? `${Math.round(pct)}% ` : ""}below ${yours}.`;
    }
    default:
      // Page events: the classifier's one-sentence summary.
      return str(payload.summary, `${storeName} changed its ${str(payload.pageKind, "site").replace(/_/g, " ")}.`);
  }
}

export type BriefingCategory = "launches" | "pricing" | "stock" | "positioning";

// Where an event sits in the briefing's per-competitor breakdown (SPEC.md §5
// Phase 4: launches, pricing/promos, stock, positioning/policy).
export const CATEGORY: Record<EventType, BriefingCategory | null> = {
  product_launched: "launches",
  product_removed: "launches",
  price_changed: "pricing",
  sale_started: "pricing",
  sale_ended: "pricing",
  sitewide_sale_detected: "pricing",
  promo_launched: "pricing",
  price_position_change: "pricing",
  sold_out: "stock",
  restocked: "stock",
  positioning_shift: "positioning",
  policy_change: "positioning",
  cosmetic: null,
};

export const CATEGORY_LABEL: Record<BriefingCategory, string> = {
  launches: "Launches",
  pricing: "Pricing & promos",
  stock: "Stock",
  positioning: "Positioning & policy",
};

// Which event leads a bundled alert (and supplies its suggested move).
const LEAD_ORDER: EventType[] = [
  "sitewide_sale_detected",
  "promo_launched",
  "price_position_change",
  "sale_started",
  "sold_out",
  "product_launched",
];

export function leadEvent<T extends { type: EventType }>(events: T[]): T {
  const rank = (t: EventType) => {
    const i = LEAD_ORDER.indexOf(t);
    return i === -1 ? LEAD_ORDER.length : i;
  };
  return events.reduce((best, e) => (rank(e.type) < rank(best.type) ? e : best));
}

/**
 * The one suggested action on an instant alert. Templated per event type —
 * alerts are frequent and short, so this costs no AI call; the Monday
 * briefing is where the model interprets.
 */
export function suggestedAction(type: EventType, payload: Payload): string {
  const title = str(payload.title, "it");
  const pct = num(payload.pctOff) ?? num(payload.discountPct) ?? num(payload.avgPctOff);
  switch (type) {
    case "sitewide_sale_detected":
    case "promo_launched":
      return `Their ${pct ? `${pct}%-off ` : ""}promotion is live now; consider a counter-offer to your email list before the weekend, or lean on bundles or free shipping if you'd rather not discount.`;
    case "price_position_change":
      return `Decide whether to match on ${str(payload.ownTitle, "your product")}, or defend the price with a bundle, a gift with purchase, or a sharper reason to pay more.`;
    case "sale_started":
      return `If ${title} competes with one of your products, decide now whether to match, bundle, or hold your price.`;
    case "sold_out":
      return `${title} is unavailable, so shoppers looking for it are up for grabs; consider search ads or an email featuring your closest alternative.`;
    case "product_launched":
      return `Compare ${title} with your closest product on price, claims and reviews, and sharpen your product page if they're positioning against you.`;
    default:
      return "Worth a look before your next promo planning.";
  }
}
