import "server-only";

// Reads the subscription's next billing date from Paddle for the billing page's
// "Next charge" line. Best-effort: on any failure (no key, network, not found)
// it returns null and the page shows a dash rather than erroring.
export async function getNextChargeDate(subscriptionId: string): Promise<string | null> {
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
    return json?.data?.next_billed_at ?? null;
  } catch {
    return null;
  }
}
