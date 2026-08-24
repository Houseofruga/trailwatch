export type Plan = "free" | "paid";

/** SPEC.md §4. Enforced in application logic — never trusted from the client. */
export const LIMITS: Record<Plan, { competitors: number; pagesPerCompetitor: number }> = {
  free: { competitors: 2, pagesPerCompetitor: 3 },
  paid: { competitors: 10, pagesPerCompetitor: 10 },
};

export const PLAN_LABEL: Record<Plan, string> = { free: "Free", paid: "Pro" };
export const PLAN_PRICE: Record<Plan, string> = { free: "$0", paid: "$19/mo" };

// --------------------------------------------------------------- Pro billing period
// Single source of truth for the two Pro prices. The actual chargeable Paddle
// prices live in the Paddle dashboard (see NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY /
// _ANNUAL); these are display-only figures that must match them.
export type BillingPeriod = "monthly" | "annual";

export const PRO_MONTHLY_USD = 19;
export const PRO_ANNUAL_USD = 190;
// PRO_ANNUAL_USD is 10x PRO_MONTHLY_USD — i.e. 2 of the 12 months are free.
export const PRO_ANNUAL_MONTHS_FREE = 12 - PRO_ANNUAL_USD / PRO_MONTHLY_USD;

/** The price line for the Pro card at a given billing period, e.g. "$19" + "/mo". */
export function formatProPrice(period: BillingPeriod): { amount: string; per: string } {
  if (period === "monthly") return { amount: `$${PRO_MONTHLY_USD}`, per: "/mo" };
  const perMonth = (PRO_ANNUAL_USD / 12).toFixed(2);
  return { amount: `$${perMonth}`, per: "/mo, billed annually" };
}
