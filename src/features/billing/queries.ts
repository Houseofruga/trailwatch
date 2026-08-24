import "server-only";
import type { BillingPeriod } from "@/features/plan/limits";

export type SubscriptionBillingInfo = {
  nextBilledAt: string | null;
  /** Paddle's billing_cycle.interval ("month" | "year"), mapped to our BillingPeriod. */
  period: BillingPeriod;
  /**
   * Set when a cancellation is scheduled (cancelSubscription() defers to period
   * end, not immediate) — the subscription is still `active` in Paddle and the
   * user still has Pro access until this date, when subscription.canceled will
   * actually fire and the webhook moves them to free.
   */
  cancelsAt: string | null;
};

// Reads the subscription's next billing date + interval from Paddle, for the
// billing page's "Next charge" / "Billed" lines. Best-effort: on any failure
// (no key, network, not found) it returns null and the page shows a dash
// rather than erroring. Defaults `period` to "monthly" on failure, matching
// the single-price behavior before annual billing existed.
export async function getSubscriptionBillingInfo(
  subscriptionId: string,
): Promise<SubscriptionBillingInfo | null> {
  const key = process.env.PADDLE_API_KEY;
  if (!key) return null;

  const base =
    process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
      ? "https://api.paddle.com"
      : "https://sandbox-api.paddle.com";

  try {
    const res = await fetch(`${base}/subscriptions/${subscriptionId}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const interval = json?.data?.billing_cycle?.interval;
    const scheduled = json?.data?.scheduled_change;
    return {
      nextBilledAt: json?.data?.next_billed_at ?? null,
      period: interval === "year" ? "annual" : "monthly",
      cancelsAt: scheduled?.action === "cancel" ? (scheduled?.effective_at ?? null) : null,
    };
  } catch {
    return null;
  }
}
