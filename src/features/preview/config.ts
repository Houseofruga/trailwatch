// Homepage competitor previews: limits and caps in one place (widget prompt Part 1).
export const PREVIEW_CONFIG = {
  // Catalog pages read for a fresh preview: 4 × 250 = the first 1,000 products.
  maxPages: 4,
  // A stored snapshot younger than this is reused instead of fetching.
  cacheHours: 24,
  // How long a preview id can be claimed after sign-up.
  ttlDays: 7,
  // Anonymous lookups per IP: per rolling day, and the minimum gap between two.
  perIpPerDay: Number(process.env.PREVIEW_PER_IP_PER_DAY) || 3,
  perIpGapSeconds: 10,
  // Fresh (uncached) fetches across everyone per UTC day.
  freshPerDay: Number(process.env.PREVIEW_FRESH_PER_DAY) || 300,
  // Answer within this; slower lookups return `processing` and finish in the background.
  syncBudgetMs: 9_000,
  // "Launched in the last N days" and the examples per finding.
  recentDays: 30,
  examples: 3,
};
