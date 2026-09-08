// The fixed set of page types. This is the dashboard's grouping key: pages of the
// same type across competitors sit in one card ("all pricing pages", "all
// homepages"). Kept as one source of truth for the pickers, the grouping, and the
// migration backfill. `label` is a free-text page name; `pageType` is this closed
// set — the two travel together but are distinct.

export const PAGE_TYPE_VALUES = [
  "homepage",
  "pricing",
  "product",
  "blog",
  "changelog",
  "other",
] as const;

export type PageType = (typeof PAGE_TYPE_VALUES)[number];

export const PAGE_TYPES: { value: PageType; label: string }[] = [
  { value: "homepage", label: "Homepage" },
  { value: "pricing", label: "Pricing" },
  { value: "product", label: "Product" },
  { value: "blog", label: "Blog" },
  { value: "changelog", label: "Changelog" },
  { value: "other", label: "Other" },
];

// Exact-match hints from free-text labels to a type. Kept in sync with the SQL
// backfill in migration 0008; anything unmatched falls through to the substring
// checks below, then "other".
const LABEL_MAP: Record<string, PageType> = {
  home: "homepage",
  homepage: "homepage",
  "home page": "homepage",
  pricing: "pricing",
  plans: "pricing",
  price: "pricing",
  product: "product",
  products: "product",
  features: "product",
  integrations: "product",
  blog: "blog",
  news: "blog",
  changelog: "changelog",
  releases: "changelog",
  "release notes": "changelog",
  updates: "changelog",
};

/** Best-effort map a free-text page label to a page type (used to backfill and to
 *  pre-select a type when a name is typed). Never throws; defaults to "other". */
export function labelToType(label: string): PageType {
  const key = label.trim().toLowerCase();
  if (key in LABEL_MAP) return LABEL_MAP[key];
  if (key.includes("pricing") || key.includes("plans")) return "pricing";
  if (key.includes("changelog") || key.includes("release")) return "changelog";
  if (key.includes("blog")) return "blog";
  if (key.includes("home")) return "homepage";
  return "other";
}

/** Display label for a stored page-type value. */
export function pageTypeLabel(value: string): string {
  return PAGE_TYPES.find((t) => t.value === value)?.label ?? "Other";
}
