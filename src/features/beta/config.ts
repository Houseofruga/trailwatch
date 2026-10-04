// Beta relationship (2026-10-04): the beta-member offer (users call them "beta
// members"; the code and DB say "founding") and how beta users
// reach the founder. Every knob in one place. The founding cohort size itself
// is enforced by the database (app_settings.founding_member_cap, migration 0025);
// `foundingCap` here is only for copy.

export const BETA_CONFIG = {
  founderName: "Chandan",
  // Replies to every email, and in-app feedback, go here.
  founderEmail: "founder@gettrailwatch.com",
  foundingCap: 25,
  // Paid plans start (and the founding price locks in) on this date.
  betaEndsOn: "2027-01-01",
  // Founding offer: base discount on joining, more after enough feedback calls.
  baseDiscountPct: 10,
  callsDiscountPct: 30,
  callsNeeded: 3,
};

/** The founder's booking page (Cal.com or similar); booking buttons hide until it's set. */
export function bookingUrl(): string | null {
  const url = process.env.FOUNDER_BOOKING_URL?.trim();
  return url && /^https:\/\//.test(url) ? url : null;
}

export const betaEndsLabel = () =>
  new Date(`${BETA_CONFIG.betaEndsOn}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
