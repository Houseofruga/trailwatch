// Store categories (DESIGN 13-Categories): every knob in one place.

export const CATEGORIES_CONFIG = {
  // Read once a day, with the rest of the store's daily reads.
  everyHours: 24,
  // Categories read per store: the menu's largest collections (or its first
  // ones, when the store doesn't publish sizes).
  maxCategories: 16,
  // Products read per category to count what's on sale (250 a page). A bigger
  // category keeps its product count but shows no on-sale count: never a partial one.
  pageSize: 250,
  maxPagesPerCategory: 2,
  // Pages of the store's public collections list (names and product counts).
  maxListPages: 4,
  // Catch-all and theme-default collections: not categories.
  notCategories: ["all", "frontpage", "all-products", "shop-all"],
};
