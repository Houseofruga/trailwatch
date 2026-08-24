"use server";

import { revalidatePath } from "next/cache";
import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import { createClient } from "@/lib/supabase/server";
import { formatBillingDate } from "./formatDate";

// Cancels the current user's subscription via Paddle's API, effective at the
// end of the current billing period — not immediately. This matters most for
// Annual: an immediate cancel would forfeit the rest of a prepaid year with no
// refund, which we don't do. Paddle keeps the subscription `active` with a
// `scheduled_change` until the period actually ends, so access (and the
// user's `plan`) is untouched here. Only when the period ends does Paddle
// transition the subscription to `canceled` and fire `subscription.canceled`
// — the webhook is still the one source of truth that moves the user to free.
export async function cancelSubscription(): Promise<
  { ok: true; message: string; effectiveAt: string | null } | { ok: false; message: string }
> {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) return { ok: false, message: "Billing isn't configured." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const { data: profile } = await supabase
    .from("users")
    .select("paddle_subscription_id")
    .eq("id", user.id)
    .single();

  const subId = profile?.paddle_subscription_id;
  if (!subId) return { ok: false, message: "No active subscription found." };

  const env =
    process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
      ? Environment.production
      : Environment.sandbox;
  const paddle = new Paddle(apiKey, { environment: env });

  let effectiveAt: string | null = null;
  try {
    const result = await paddle.subscriptions.cancel(subId, {
      effectiveFrom: "next_billing_period",
    });
    effectiveAt = result.scheduledChange?.effectiveAt ?? null;
  } catch (err) {
    console.error("Paddle cancel failed:", err);
    return { ok: false, message: "Couldn't cancel right now — try again shortly." };
  }

  revalidatePath("/billing");
  return {
    ok: true,
    message: effectiveAt
      ? `Cancelled. You'll keep Pro until ${formatBillingDate(effectiveAt)}, then move to Free.`
      : "Cancelled. You'll keep Pro until your current period ends, then move to Free.",
    effectiveAt,
  };
}

// Mints a short-lived Paddle customer-portal session and returns its URL. The
// portal is where the customer views and downloads past invoices, updates their
// card, etc. — Paddle-hosted, so we don't rebuild any of it. URLs expire, so
// this runs on click rather than being a static link.
export async function openBillingPortal(): Promise<
  { ok: true; url: string } | { ok: false; message: string }
> {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) return { ok: false, message: "Billing isn't configured." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not signed in." };

  const { data: profile } = await supabase
    .from("users")
    .select("paddle_customer_id")
    .eq("id", user.id)
    .single();

  const customerId = profile?.paddle_customer_id;
  if (!customerId) return { ok: false, message: "No billing account found yet." };

  const base =
    process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
      ? "https://api.paddle.com"
      : "https://sandbox-api.paddle.com";

  try {
    const res = await fetch(`${base}/customers/${customerId}/portal-sessions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    const url = json?.data?.urls?.general?.overview;
    if (!res.ok || !url) {
      console.error("Paddle portal session failed:", json?.error ?? res.status);
      return { ok: false, message: "Couldn't open the billing portal — try again shortly." };
    }
    return { ok: true, url };
  } catch (err) {
    console.error("Paddle portal session error:", err);
    return { ok: false, message: "Couldn't open the billing portal — try again shortly." };
  }
}
