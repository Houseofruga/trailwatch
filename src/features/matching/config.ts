// Comparable-product matching: every knob in one place (matching prompt, Part A).

export const MATCHING_CONFIG = {
  // A3 candidate filter: a competitor product's typical size must be within
  // this range of yours (0.5 = half, 2 = double) when both sizes are known.
  sizeRangeMin: 0.5,
  sizeRangeMax: 2,
  // Pairs sent to the model per competitor product (best lexical fits first).
  shortlistPerProduct: 3,
  // Model confidence (0–1). High = an active match (context, alerts, briefing);
  // medium = a "possible match" the user can confirm; below = discarded.
  highConfidence: 0.8,
  mediumConfidence: 0.55,
  // price_position_change fires when a matched competitor product's unit price
  // is at least this far below yours (percent).
  pricePositionPct: 10,
  // Products with no readable size are compared item for item. A gap above
  // this (percent) is more likely a single against a set than a real undercut,
  // so it isn't reported.
  itemGapMaxPct: 50,
  // A newly matched competitor product counts as a launch for this many days
  // after it was published.
  launchWindowDays: 14,
  // Model batches: products per classification call, pairs per judgement call.
  // Sized to the matching model's free-tier output cap (1,000 tokens a minute):
  // about 40 output tokens per product, 25 per pair.
  classifyBatch: 15,
  judgeBatch: 15,
  // Description text sent to the classifier, only when there's no product type.
  descriptionChars: 160,
  // Tokens matching may use per UTC day, so it stays on Groq's free tier
  // (200K/day for the matching model). Past it, work resumes tomorrow.
  dailyTokenBudget: Number(process.env.MATCHING_DAILY_TOKENS) || 150_000,
  // Room kept for one more call before the budget, so a batch can't overshoot.
  callTokenReserve: 6_000,
  // Time the cron tick gives matching work; the rest resumes next tick.
  tickBudgetMs: 60_000,
  // Own-store products we never price-compare: clearance stock isn't your price.
  clearancePattern: /\b(last call|clearance|final sale|outlet|seconds)\b/i,
};
