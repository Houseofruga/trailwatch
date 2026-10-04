import type { Guide, GuideGroup } from "./types";
import { blackFridayChecklist } from "./content/black-friday-checklist";
import { competitorOutOfStock } from "./content/competitor-out-of-stock";
import { dtcCompetitiveAnalysisTemplate } from "./content/dtc-competitive-analysis-template";
import { findCompetitorBestSellers } from "./content/find-competitor-best-sellers";
import { findShopifyStoreCompetitors } from "./content/find-shopify-store-competitors";
import { realPriceCutVsFakeSale } from "./content/real-price-cut-vs-fake-sale";
import { seeCompetitorNewProducts } from "./content/see-competitor-new-products";
import { trackBlackFridaySales } from "./content/track-black-friday-sales";
import { trackCompetitorPrices } from "./content/track-competitor-prices";

// Every published guide, in the order the hub shows them within each group.
export const GUIDES: Guide[] = [
  trackBlackFridaySales,
  blackFridayChecklist,
  realPriceCutVsFakeSale,
  trackCompetitorPrices,
  seeCompetitorNewProducts,
  findCompetitorBestSellers,
  competitorOutOfStock,
  findShopifyStoreCompetitors,
  dtcCompetitiveAnalysisTemplate,
];

export const GUIDE_GROUPS: { id: GuideGroup; title: string; lead: string }[] = [
  { id: "black-friday", title: "Black Friday", lead: "Get ready for the busiest month of the year." },
  { id: "evergreen", title: "Evergreen", lead: "Useful any time of year." },
];

export const getGuide = (slug: string): Guide | undefined => GUIDES.find((g) => g.slug === slug);

/** "Oct 2, 2026" from an ISO date, the same everywhere a guide's date shows. */
export const guideDate = (iso: string): string =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** The "On this page" entries: every h2, plus the FAQ. */
export function tableOfContents(guide: Guide): { id: string; text: string }[] {
  const sections = guide.blocks.flatMap((b) => (b.type === "h2" ? [{ id: b.id, text: b.text }] : []));
  return guide.faq.length ? [...sections, { id: "faq", text: "Questions" }] : sections;
}

/** Other published guides to show under an article: its `related` list first, then the newest. */
export function relatedGuides(guide: Guide, max = 3): Guide[] {
  const named = guide.related.flatMap((slug) => GUIDES.find((g) => g.slug === slug && g.slug !== guide.slug) ?? []);
  const rest = GUIDES.filter((g) => g.slug !== guide.slug && !named.includes(g)).sort((a, b) => b.date.localeCompare(a.date));
  return [...named, ...rest].slice(0, max);
}
