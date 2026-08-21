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

// Minimal shape we rely on from a Paddle Billing `subscription.*` event.
export type PaddleSubscriptionEvent = {
  event_type: string;
  data?: {
    id?: string;
    customer_id?: string;
    status?: string;
    custom_data?: Record<string, unknown> | null;
  };
};

function userIdFrom(custom: Record<string, unknown> | null | undefined): string | null {
  const v = custom?.userId;
  return typeof v === "string" && v.length > 0 ? v : null;
}

/**
 * Returns the plan change an event implies, or null if the event isn't one we
 * act on. A subscription becoming active (or created already-active) means paid;
 * a cancellation means free. Unknown/other events are ignored.
 */
export function resolvePlanChange(event: PaddleSubscriptionEvent): PlanChange | null {
  const data = event.data ?? {};
  const base = {
    paddleCustomerId: data.customer_id ?? null,
    paddleSubscriptionId: data.id ?? null,
    userId: userIdFrom(data.custom_data),
  };

  switch (event.event_type) {
    case "subscription.created":
    case "subscription.activated":
    case "subscription.resumed":
      // A created event can arrive in a non-active status (e.g. trialing/past_due
      // handled elsewhere); only grant paid access once it's actually active.
      if (data.status && data.status !== "active") return null;
      return { plan: "paid", ...base };

    case "subscription.canceled":
      return { plan: "free", ...base };

    default:
      return null;
  }
}
