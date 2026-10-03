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
  // A newly matched competitor product counts as a launch for this many days
  // after it was published.
  launchWindowDays: 14,
  // Model batches: products per classification call, pairs per judgement call.
  classifyBatch: 20,
  judgeBatch: 10,
  // Description text sent to the classifier.
  descriptionChars: 240,
  // Time the cron tick gives matching work; the rest resumes next tick.
  tickBudgetMs: 60_000,
  // Own-store products we never price-compare: clearance stock isn't your price.
  clearancePattern: /\b(last call|clearance|final sale|outlet|seconds)\b/i,
};
