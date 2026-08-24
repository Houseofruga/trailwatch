export type Plan = "free" | "paid";

/** SPEC.md §4. Enforced in application logic — never trusted from the client. */
export const LIMITS: Record<Plan, { competitors: number; pagesPerCompetitor: number }> = {
  free: { competitors: 2, pagesPerCompetitor: 3 },
  paid: { competitors: 10, pagesPerCompetitor: 10 },
};

export const PLAN_LABEL: Record<Plan, string> = { free: "Free", paid: "Pro" };
export const PLAN_PRICE: Record<Plan, string> = { free: "$0", paid: "$19/mo" };
