// Catalog-tracking knobs (pivot Phase 2). One place to tune crawl politeness,
// size caps and the sitewide-sale rule.
export const CATALOG_CONFIG = {
  // /products.json paging. 250 is Shopify's max page size.
  pageSize: 250,
  // Pause between catalog pages so we never hammer a store.
  pageDelayMs: 1_000,
  // Hard ceiling: 100 pages = 25,000 products. Beyond it the fetch is marked
  // truncated, so removals aren't inferred from products we never saw.
  maxPages: 100,
  // A full page of 250 products is ~1.8 MB (allbirds, 2026-09-30); the shared
  // fetcher's 2 MB default is too tight.
  pageMaxBytes: 8_000_000,
  // Retries per page on 429/5xx, with exponential backoff from this base.
  maxRetries: 3,
  retryBaseMs: 2_000,
  // Large catalogs: launches/removals are tracked across every product, but
  // per-variant price/stock history only for this many (most recently published).
  priceTrackCap: 5_000,
  // Sitemap fallback (products.json locked down): product pages whose JSON-LD
  // we read per check, most recently modified first.
  sitemapDetailCap: 60,
  // Sitewide sale: at least this share of in-stock products newly discounted
  // in one check...
  sitewideSaleShare: 0.3,
  // ...and at least this many of them, so a 3-product store putting one item
  // on sale doesn't read as "sitewide".
  sitewideSaleMinProducts: 5,
  // First report: what counts as "recently launched", and how many items per section.
  firstReportRecentDays: 30,
  firstReportLimit: 8,
  // Fallback cadence if the per-plan lookup fails (normal cadence comes from
  // the followers' plans — see plan/limits.ts storeCheckIntervalHours).
  defaultCheckIntervalHours: 24,
  // After a failed check, try again sooner than the normal interval.
  errorRetryMinutes: 60,
  // A claimed store is leased for this long; if the runner dies mid-check the
  // store becomes due again once the lease lapses.
  claimLeaseMinutes: 30,
  // Per tick: stores claimed per batch, and the time budget (the cron route has
  // 300s; leave headroom for the in-flight check to finish).
  tickBatchSize: 25,
  tickBudgetMs: 200_000,
};
