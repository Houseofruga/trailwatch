"use server";

import { revalidatePath } from "next/cache";
import { Environment, Paddle } from "@paddle/paddle-node-sdk";
import { createClient } from "@/lib/supabase/server";

// Cancels the current user's subscription via Paddle's API. We don't flip the
// plan here — Paddle fires `subscription.canceled`, and the webhook is the one
// source of truth that moves the user back to free (same path SPEC §9.6 tests).
export async function cancelSubscription(): Promise<{ ok: boolean; message: string }> {
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

  try {
    await paddle.subscriptions.cancel(subId, { effectiveFrom: "immediately" });
  } catch (err) {
    console.error("Paddle cancel failed:", err);
    return { ok: false, message: "Couldn't cancel right now — try again shortly." };
  }

  revalidatePath("/billing");
  return { ok: true, message: "Your subscription is cancelling. You're back on Free." };
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
