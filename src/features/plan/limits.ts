// Plans (SPEC.md §4, pivot Phase 6). The single source of truth for what each
// plan gets. Enforced in application logic — never trusted from the client.

export type Plan = "free" | "starter" | "pro" | "agency";

export type PlanConfig = {
  label: string;
  monthlyUsd: number;
  competitors: number;
  instantAlerts: boolean;
  slack: boolean;
  ownStore: boolean;
  // Opportunities (gaps, competitor momentum, demand) in the app and briefing.
  opportunities: boolean;
  checkIntervalHours: number;
  // False = behind a feature flag, not offered yet.
  launched: boolean;
};

export const PLANS: Record<Plan, PlanConfig> = {
  free: { label: "Free", monthlyUsd: 0, competitors: 1, instantAlerts: false, slack: false, ownStore: false, opportunities: false, checkIntervalHours: 24, launched: true },
  starter: { label: "Starter", monthlyUsd: 29, competitors: 3, instantAlerts: true, slack: false, ownStore: true, opportunities: false, checkIntervalHours: 6, launched: true },
  pro: { label: "Pro", monthlyUsd: 79, competitors: 10, instantAlerts: true, slack: true, ownStore: true, opportunities: true, checkIntervalHours: 2, launched: true },
  // Not launched (AGENCY_ENABLED). The spec sets only its price, so it mirrors
  // Pro's limits until those are decided.
  agency: { label: "Agency", monthlyUsd: 199, competitors: 10, instantAlerts: true, slack: true, ownStore: true, opportunities: true, checkIntervalHours: 2, launched: false },
};

export const PLAN_ORDER: Plan[] = ["free", "starter", "pro", "agency"];

/** A plan value from the DB or anywhere untrusted. The pre-pivot "paid" plan is Pro. */
export function parsePlan(value: unknown): Plan {
  if (value === "paid") return "pro";
  return PLAN_ORDER.includes(value as Plan) ? (value as Plan) : "free";
}

export const isPaidPlan = (plan: Plan) => plan !== "free";

export function higherPlan(a: Plan, b: Plan): Plan {
  return PLAN_ORDER.indexOf(a) >= PLAN_ORDER.indexOf(b) ? a : b;
}

// --------------------------------------------------------------- pricing
// Display-only; the chargeable prices live in the Paddle dashboard and must
// match. Billing is monthly only (SPEC.md §4): there is no annual plan.

/** The price line, e.g. "$79" + "/mo". */
export function formatPrice(plan: Plan): { amount: string; per: string } {
  return { amount: `$${PLANS[plan].monthlyUsd}`, per: "/mo" };
}

// ------------------------------------------------------ beta and billing
// The app runs as a free beta (SPEC.md §4): plans are visible, checkout is off,
// and beta users are founding members. NEXT_PUBLIC_ so the client can hide
// checkout too; it isn't a secret. Read at call time.
export function billingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_BILLING_ENABLED === "true";
}

/** During the beta, everyone gets at least this plan (BETA_PLAN, default Pro). */
export function betaPlan(): Plan {
  return parsePlan(process.env.BETA_PLAN ?? "pro");
}

// ------------------------------------------------------ check cadence
// BFCM mode: hourly checks for Pro (and Agency) inside a date window.
export function bfcmWindow(): { start: Date; end: Date } | null {
  const start = Date.parse(process.env.BFCM_START ?? "");
  const end = Date.parse(process.env.BFCM_END ?? "");
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? { start: new Date(start), end: new Date(end) } : null;
}

/**
 * How often to check a store: the fastest cadence among the plans of everyone
 * who follows or owns it (a store is crawled once and shared), hourly for
 * Pro/Agency during BFCM. A store nobody uses falls back to daily.
 */
export function storeCheckIntervalHours(
  plans: Plan[],
  now: Date = new Date(),
  window: { start: Date; end: Date } | null = bfcmWindow(),
): number {
  if (plans.length === 0) return PLANS.free.checkIntervalHours;
  const inBfcm = !!window && now >= window.start && now < window.end;
  return Math.min(...plans.map((p) => (inBfcm && (p === "pro" || p === "agency") ? 1 : PLANS[p].checkIntervalHours)));
}

// ------------------------------------------ legacy page-centric UI (deprecated)
// The pre-pivot screens (page picking, the single Pro card) still render until
// their redesigned replacements land; these keep them working on the new plans.
// Page counts are no longer a plan limit anywhere new (SPEC.md §6).
const LEGACY_PAGES_PER_COMPETITOR: Record<Plan, number> = { free: 2, starter: 5, pro: 5, agency: 5 };

export const LIMITS: Record<Plan, { competitors: number; pagesPerCompetitor: number }> = Object.fromEntries(
  PLAN_ORDER.map((p) => [p, { competitors: PLANS[p].competitors, pagesPerCompetitor: LEGACY_PAGES_PER_COMPETITOR[p] }]),
) as Record<Plan, { competitors: number; pagesPerCompetitor: number }>;

export const PLAN_LABEL: Record<Plan, string> = Object.fromEntries(PLAN_ORDER.map((p) => [p, PLANS[p].label])) as Record<Plan, string>;

export const PLAN_PRICE: Record<Plan, string> = Object.fromEntries(
  PLAN_ORDER.map((p) => [p, p === "free" ? "$0" : `$${PLANS[p].monthlyUsd}/mo`]),
) as Record<Plan, string>;

// The legacy single "Pro" upgrade card.
export const PRO_MONTHLY_USD = PLANS.pro.monthlyUsd;
export const formatProPrice = () => formatPrice("pro");
