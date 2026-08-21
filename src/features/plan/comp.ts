import type { Plan } from "./limits";

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

// A comp email is Pro regardless of what the DB (Paddle) says; otherwise the
// stored plan wins.
export function resolvePlan(email: string | null | undefined, dbPlan: Plan): Plan {
  return isCompEmail(email) ? "paid" : dbPlan;
}
