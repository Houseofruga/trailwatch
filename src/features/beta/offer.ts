import { BETA_CONFIG as C, maxDiscountPct } from "./config";

// The beta-member offer for one user (stored as `is_founding_member`). Pure.

export type FoundingOffer = {
  founding: boolean;
  /** Discount earned so far (percent): the base plus a step for each call done. */
  discountPct: number;
  /** The most it can reach. */
  maxPct: number;
  callsDone: number;
  callsNeeded: number;
  /** All calls done: the full discount is theirs for life. */
  unlocked: boolean;
};

export function foundingOffer(founding: boolean, calls: number): FoundingOffer {
  const callsDone = Math.max(0, Math.min(calls, C.callsNeeded));
  const unlocked = founding && callsDone >= C.callsNeeded;
  return {
    founding,
    discountPct: founding ? C.baseDiscountPct + C.perCallDiscountPct * callsDone : 0,
    maxPct: founding ? maxDiscountPct() : 0,
    callsDone,
    callsNeeded: C.callsNeeded,
    unlocked,
  };
}

/** The offer in one honest line: the headline with its condition. */
export const OFFER_LINE = `Up to ${maxDiscountPct()}% off for life as a beta member: ${C.baseDiscountPct}% when you join, plus ${C.perCallDiscountPct}% more for each of ${C.callsNeeded} short feedback calls with the founder. Your price never goes up.`;
