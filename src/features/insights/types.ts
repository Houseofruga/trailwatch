import type { PricingTier } from "@/features/competitorTeardown";

// The cached "baseline profile" for one watched page — a subset of the teardown
// result, reused as the day-0 value card on the Competitors page.
export type PageProfile = {
  title: string;
  positioning: string;
  pricingTiers: PricingTier[] | null;
};

// What the client renders. Only "ready" carries a profile; the rest are quiet
// states (skeleton done, hide, or a soft "not yet" note).
export type PageInsightState =
  | { status: "ready"; profile: PageProfile }
  | { status: "pending" } // baseline snapshot not captured yet — analyze after first check
  | { status: "unavailable" } // no provider key, generation declined, or a transient error
  | { status: "not-found" }; // page missing / not owned
