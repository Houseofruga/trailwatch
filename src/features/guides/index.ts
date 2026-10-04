import type { Guide, GuideGroup } from "./types";
import { trackBlackFridaySales } from "./content/track-black-friday-sales";

// Every published guide, newest first within its group.
export const GUIDES: Guide[] = [trackBlackFridaySales];

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
