import { BETA_CONFIG as C } from "./config";

// The founding-member offer for one user. Pure.

export type FoundingOffer = {
  founding: boolean;
  /** Discount locked in so far (percent). */
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
    discountPct: !founding ? 0 : unlocked ? C.baseDiscountPct + C.callsDiscountPct : C.baseDiscountPct,
    maxPct: founding ? C.baseDiscountPct + C.callsDiscountPct : 0,
    callsDone,
    callsNeeded: C.callsNeeded,
    unlocked,
  };
}

/** The offer in one honest line: the headline with its condition. */
export const OFFER_LINE = `Up to ${C.baseDiscountPct + C.callsDiscountPct}% off for life as a founding member: ${C.baseDiscountPct}% when you join, plus ${C.callsDiscountPct}% more after ${C.callsNeeded} short feedback calls with the founder.`;
