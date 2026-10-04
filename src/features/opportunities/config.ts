// Opportunities (matching prompt Part B): every knob in one place.

export const OPPORTUNITIES_CONFIG = {
  // ------------------------------------------------ B1: Best Sellers
  // Collections we accept as the store's own best-seller list, in order of
  // preference. Campaign, test and data collections ("summer-sale-best-sellers",
  // "collection-data-best-sellers") are never used.
  bestsellerHandles: [
    "best-sellers",
    "bestsellers",
    "best-seller",
    "bestseller",
    "best-selling",
    "top-sellers",
    "most-popular",
    "shop-best-sellers",
  ],
  // Also accepted when none of the above exist (e.g. men's and women's lists).
  bestsellerHandlePattern: /^(mens|womens|men|women)-best-?sellers?$/,
  // Members kept per read (top N).
  bestsellerTopN: 50,
  // Positions are used only when the store's page lists at least this share of
  // the collection, or at least `rankedMinListed` of its products. Otherwise
  // it's membership only: we never guess a position.
  rankedMinShare: 0.8,
  rankedMinListed: 12,
  // Read once a day; a store with no usable collection is looked at again weekly.
  bestsellerEveryHours: 24,
  unavailableRecheckDays: 7,
  // Detection: the top of the list, a fast climb (places within a week), and a
  // launch reaching the top within this many days of being published.
  topPositions: 10,
  climbPlaces: 10,
  climbWindowDays: 7,
  launchWindowDays: 14,

  // ------------------------------------------------ B2: demand
  // Sold-out → restocked cycles over 90 days that count as repeated demand.
  restockCycles: 2,
  demandWindowDays: 90,
  // A launch selling out within this many days.
  launchSoldOutDays: 7,
  // Featured on the homepage for at least this long.
  featuredDays: 21,

  // ------------------------------------------------ B3: gaps
  // A gap needs at least this many competitors, or this share of the ones you
  // track (whichever is lower), selling something you don't.
  gapMinCompetitors: 2,
  gapMinShare: 0.4,
  // Only gaps inside the categories you already sell in (a bedding brand isn't
  // told to sell dog food).
  gapSameCategoryOnly: true,
  // Pack types that count as a format.
  gapFormats: ["bundle", "kit", "travel size", "subscription"],
  // Price tiers: an entry product below this price.
  entryPriceUsd: 25,

  // ------------------------------------------------ ranking and output
  // Signal-strength weights (B3 ranking).
  weights: {
    competitor: 2,
    bestseller: 3,
    recentLaunch: 1,
    demand: 2,
    rising: 4,
  },
  // Launches count as "recent" for this many days.
  recentLaunchDays: 30,
  // Briefing: at most this many, normal severity (briefing only, no alerts).
  briefingItems: 3,
  severity: "normal" as const,
  // Once in a briefing, an opportunity isn't repeated there for this long.
  briefingRepeatDays: 28,
  // A dismissed opportunity comes back only when its score grows this much.
  resurfaceScoreRatio: 1.5,
  // Kept per user (the app view); the briefing takes the top ones.
  keepPerUser: 20,
  // Refreshed once a day per user, inside the cron tick's time.
  refreshEveryHours: 24,
  tickBudgetMs: 30_000,
};
