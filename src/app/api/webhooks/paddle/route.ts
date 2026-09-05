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

  const updateFor = async (column: "id" | "paddle_customer_id", value: string) => {
    const { data, error } = await service.from("users").update(patch).eq(column, value).select("id");
    if (error) throw error;
    return data?.length ?? 0;
  };

  // Prefer the userId we stamped at checkout; fall back to the customer id when
  // it's absent (later events like cancellations don't carry custom_data) OR
  // when the stamped id matched nothing (a bad/stale custom_data still resolves
  // by customer id).
  let matched = 0;
  try {
    if (change.userId != null) matched = await updateFor("id", change.userId);
    if (matched === 0 && change.paddleCustomerId != null) {
      matched = await updateFor("paddle_customer_id", change.paddleCustomerId);
    }
  } catch (err) {
    console.error("Paddle webhook DB update failed:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  if (matched === 0) {
    console.error(
      `Paddle webhook matched no user (event ${event.event_type}, plan ${change.plan}, ` +
        `customer ${change.paddleCustomerId ?? "?"}, subscription ${change.paddleSubscriptionId ?? "?"}).`,
    );
    // An upgrade we couldn't apply is a paying customer left on Free — fail so
    // Paddle retries (covers a transient DB blip) and it surfaces loudly. A
    // downgrade that matches nothing has nothing to revert (e.g. the account was
    // already deleted), so acknowledge it to stop the retries.
    if (change.plan === "paid") {
      return NextResponse.json({ error: "No matching user for upgrade" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, matched: 0, event: event.event_type });
  }

  return NextResponse.json({ ok: true, plan: change.plan });
}
