import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyPaddleSignature } from "@/features/billing/verifyPaddleSignature";
import { resolvePlanChange, type PaddleSubscriptionEvent } from "@/features/billing/resolvePlanChange";

// Paddle Billing webhook (SPEC.md F8). Verifies the signature, maps the event to
// a plan change (pure, tested), and writes it with the service client. Must read
// the RAW body for signature verification — do not parse before verifying.
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("PADDLE_WEBHOOK_SECRET is not set — rejecting webhook.");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("paddle-signature");
  if (!verifyPaddleSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: PaddleSubscriptionEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const change = resolvePlanChange(event);
  if (!change) {
    // Not an event we act on — acknowledge so Paddle stops retrying.
    return NextResponse.json({ ok: true, ignored: event.event_type });
  }

  const service = createServiceClient();
  const patch = {
    plan: change.plan,
    paddle_customer_id: change.paddleCustomerId,
    paddle_subscription_id: change.plan === "paid" ? change.paddleSubscriptionId : null,
  };

  // Prefer the userId we stamped at checkout; fall back to the customer id for
  // later events (cancellations) that don't carry custom_data.
  const updateFor = (column: "id" | "paddle_customer_id", value: string) =>
    service.from("users").update(patch).eq(column, value).select("id");

  const { data, error } =
    change.userId != null
      ? await updateFor("id", change.userId)
      : change.paddleCustomerId != null
        ? await updateFor("paddle_customer_id", change.paddleCustomerId)
        : { data: [] as { id: string }[], error: null };

  if (error) {
    console.error("Paddle webhook DB update failed:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  if (!data || data.length === 0) {
    console.warn(`Paddle webhook matched no user (event ${event.event_type}).`);
  }

  return NextResponse.json({ ok: true, plan: change.plan });
}
