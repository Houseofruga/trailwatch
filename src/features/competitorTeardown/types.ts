// Types for the AI Competitor Teardown free tool (/tools/competitor-teardown).
// The extractor turns a URL into readable page text; a provider (Groq or
// Anthropic, same seam as src/features/summaries) turns that into a structured,
// plain-English teardown. The provider interface is the single swap point.

export type PricingTier = { name: string; price: string; notes: string | null };

/** The finished teardown shown on the results card. */
export type TeardownResult = {
  url: string; // final (post-redirect) homepage URL
  title: string;
  positioning: string; // 1–2 sentences
  pricingTiers: PricingTier[] | null; // null when no pricing was found in the text
  whatToWatch: string[]; // 3–5 short bullets
  provider: string; // "groq" | "anthropic" (for debugging/attribution)
};

/** What the extractor produces and a provider consumes. */
export type ExtractedSite = {
  url: string;
  title: string;
  pages: Array<{ label: string; text: string }>;
};

/** A provider either produces a teardown or declines with a human reason. */
export type ProviderOutcome =
  | { ok: true; result: TeardownResult }
  | { ok: false; reason: string };

export interface TeardownProvider {
  analyze(site: ExtractedSite): Promise<ProviderOutcome>;
}
