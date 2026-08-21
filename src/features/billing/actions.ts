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
