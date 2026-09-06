import type { PricingTier } from "@/features/competitorTeardown";

// The cached baseline profile for one watched page — a page-focused description
// of what THAT page currently shows (the "what we're now watching" card). Unlike
// the company-level teardown, this is about the single page in front of the user.
export type PageProfile = {
  summary: string; // 1-2 sentences on what this specific page presents right now
  pricingTiers: PricingTier[] | null; // only when this page actually has pricing
};

// What the client renders. Only "ready" carries a profile; the rest are quiet
// states (skeleton done, hide, or a soft "not yet" note).
export type PageInsightState =
  | { status: "ready"; profile: PageProfile }
  | { status: "pending" } // baseline snapshot not captured yet — analyze after first check
  | { status: "unavailable" } // no provider key, generation declined, or a transient error
  | { status: "not-found" }; // page missing / not owned

// Provider seam for generating a page-focused profile (Groq → Anthropic → null),
// mirroring the summaries/teardown seams. The single swap point is
// `getInsightProvider()` in ./provider.
export type InsightInput = {
  competitorName: string;
  label: string;
  url: string;
  text: string;
};

export type InsightOutcome =
  | { ok: true; profile: PageProfile; provider: string }
  | { ok: false; reason: string };

export interface InsightProvider {
  analyzePage(input: InsightInput): Promise<InsightOutcome>;
}
