import type { Plan } from "@/features/plan/limits";

// The pure heart of the billing webhook (SPEC.md §8 — this touches money, so it
// is unit-tested). Given a Paddle event, decide what a user's billing state
// should become. No I/O: the route verifies + parses the event and persists the
// result; this only maps event → intent.

export type PlanChange = {
  plan: Plan;
  paddleCustomerId: string | null;
  paddleSubscriptionId: string | null;
  // How the route locates the user row: prefer the userId we stamped into
  // custom_data at checkout; fall back to the customer id for later events.
  userId: string | null;
};

// An active subscription on a price we don't recognize: a misconfigured env or a
// new Paddle price. The route must fail loudly (Paddle retries) rather than
// leave a paying customer on Free.
export type UnknownPrice = { unknownPriceId: string | null };

// Minimal shape we rely on from a Paddle Billing `subscription.*` event.
export type PaddleSubscriptionEvent = {
  event_type: string;
  data?: {
    id?: string;
    customer_id?: string;
    status?: string;
    custom_data?: Record<string, unknown> | null;
    items?: { price?: { id?: string } | null }[] | null;
  };
};

/**
 * Paddle price id → plan, from the price-id env vars (the chargeable prices
 * live in the Paddle dashboard). Monthly and annual both map to their plan.
 */
export function paddlePricePlans(env: Record<string, string | undefined> = process.env): Record<string, Plan> {
  const map: Record<string, Plan> = {};
  for (const plan of ["starter", "pro", "agency"] as const) {
    for (const period of ["MONTHLY", "ANNUAL"]) {
      const id = env[`NEXT_PUBLIC_PADDLE_PRICE_${plan.toUpperCase()}_${period}`];
      if (id) map[id] = plan;
    }
  }
  return map;
}

function userIdFrom(custom: Record<string, unknown> | null | undefined): string | null {
  const v = custom?.userId;
  return typeof v === "string" && v.length > 0 ? v : null;
}

/**
 * The plan change an event implies, an UnknownPrice, or null if it's not an
 * event we act on. An active subscription means the plan its price maps to
 * (created / activated / resumed, and updated — which covers switching between
 * Starter and Pro); a cancellation — or an update to canceled/paused — means Free.
 */
export function resolvePlanChange(
  event: PaddleSubscriptionEvent,
  pricePlans: Record<string, Plan> = paddlePricePlans(),
): PlanChange | UnknownPrice | null {
  const data = event.data ?? {};
  const base = {
    paddleCustomerId: data.customer_id ?? null,
    paddleSubscriptionId: data.id ?? null,
    userId: userIdFrom(data.custom_data),
  };

  const planFromPrice = (): PlanChange | UnknownPrice => {
    const priceId = data.items?.[0]?.price?.id ?? null;
    const plan = priceId ? pricePlans[priceId] : undefined;
    return plan ? { plan, ...base } : { unknownPriceId: priceId };
  };

  switch (event.event_type) {
    case "subscription.created":
    case "subscription.activated":
    case "subscription.resumed":
      // A created event can arrive in a non-active status (e.g. trialing/past_due
      // handled elsewhere); only grant access once it's actually active.
      if (data.status && data.status !== "active") return null;
      return planFromPrice();

    case "subscription.updated":
      if (data.status === "active") return planFromPrice();
      if (data.status === "canceled" || data.status === "paused") return { plan: "free", ...base };
      return null;

    case "subscription.canceled":
      return { plan: "free", ...base };

    default:
      return null;
  }
}
