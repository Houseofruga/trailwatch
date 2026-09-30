import { betaPlan, billingEnabled, higherPlan, parsePlan, type Plan } from "./limits";

// Emails that always get Pro without paying — founder/team comp accounts,
// independent of Paddle. Comma-separated in the COMP_EMAILS env var so it's
// configurable per environment and never hardcoded. Read at call time (not
// module load) so it's easy to test and picks up env without a rebuild.
function compEmails(): string[] {
  return (process.env.COMP_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isCompEmail(email: string | null | undefined): boolean {
  return !!email && compEmails().includes(email.toLowerCase());
}

/**
 * The plan a user actually gets. Comp emails are Pro regardless of the DB.
 * During the free beta (billing off) everyone gets at least the beta plan —
 * a paid plan already on the account still wins if it's higher. Otherwise
 * the stored (Paddle-driven) plan. `dbPlan` may be any raw DB value.
 */
export function resolvePlan(email: string | null | undefined, dbPlan: unknown): Plan {
  const stored = parsePlan(dbPlan);
  if (isCompEmail(email)) return higherPlan(stored, "pro");
  if (!billingEnabled()) return higherPlan(stored, betaPlan());
  return stored;
}
