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
  // Beta-member offer (decided 2026-10-05): a base discount on joining, plus the
  // same again for each feedback call, up to `callsNeeded` calls. 5 + 3 x 5 = 20%.
  // Their price is also locked: it never goes up.
  baseDiscountPct: 5,
  perCallDiscountPct: 5,
  callsNeeded: 3,
  // Length of a founder call (the booking page's slot).
  callMinutes: 30,
};

/** The most a beta member's discount can reach (percent). */
export const maxDiscountPct = () => BETA_CONFIG.baseDiscountPct + BETA_CONFIG.perCallDiscountPct * BETA_CONFIG.callsNeeded;

/** The founder's booking page (Cal.com or similar); booking buttons hide until it's set. */
export function bookingUrl(): string | null {
  const url = process.env.FOUNDER_BOOKING_URL?.trim();
  return url && /^https:\/\//.test(url) ? url : null;
}

export const betaEndsLabel = () =>
  new Date(`${BETA_CONFIG.betaEndsOn}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
