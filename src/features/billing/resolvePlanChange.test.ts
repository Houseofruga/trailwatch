import { describe, it, expect } from "vitest";
import { paddlePricePlans, resolvePlanChange } from "./resolvePlanChange";

const PRICES = paddlePricePlans({
  NEXT_PUBLIC_PADDLE_PRICE_STARTER_MONTHLY: "pri_starter_m",
  NEXT_PUBLIC_PADDLE_PRICE_STARTER_ANNUAL: "pri_starter_y",
  NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY: "pri_pro_m",
  NEXT_PUBLIC_PADDLE_PRICE_PRO_ANNUAL: "pri_pro_y",
});
const items = (priceId: string) => [{ price: { id: priceId } }];

describe("paddlePricePlans", () => {
  it("maps monthly and annual price ids to their plan, skipping unset ones", () => {
    expect(PRICES).toEqual({
      pri_starter_m: "starter",
      pri_starter_y: "starter",
      pri_pro_m: "pro",
      pri_pro_y: "pro",
    });
  });
});

describe("resolvePlanChange", () => {
  it("grants the plan of the subscribed price on activation, carrying ids and userId", () => {
    const change = resolvePlanChange(
      {
        event_type: "subscription.activated",
        data: { id: "sub_123", customer_id: "ctm_456", status: "active", custom_data: { userId: "user-abc" }, items: items("pri_pro_m") },
      },
      PRICES,
    );
    expect(change).toEqual({ plan: "pro", paddleSubscriptionId: "sub_123", paddleCustomerId: "ctm_456", userId: "user-abc" });
  });

  it("maps Starter prices (monthly and annual) to Starter", () => {
    for (const price of ["pri_starter_m", "pri_starter_y"]) {
      const change = resolvePlanChange(
        { event_type: "subscription.created", data: { id: "s", customer_id: "c", status: "active", items: items(price) } },
        PRICES,
      );
      expect(change).toMatchObject({ plan: "starter" });
    }
  });

  it("does NOT grant a plan for a created-but-not-yet-active subscription", () => {
    const change = resolvePlanChange(
      { event_type: "subscription.created", data: { id: "sub_1", customer_id: "ctm_1", status: "trialing", items: items("pri_pro_m") } },
      PRICES,
    );
    expect(change).toBeNull();
  });

  it("flags an active subscription on an unknown price (route fails loudly, Paddle retries)", () => {
    const change = resolvePlanChange(
      { event_type: "subscription.activated", data: { id: "s", customer_id: "c", status: "active", items: items("pri_mystery") } },
      PRICES,
    );
    expect(change).toEqual({ unknownPriceId: "pri_mystery" });
  });

  it("switches plan on subscription.updated (Starter → Pro)", () => {
    const change = resolvePlanChange(
      { event_type: "subscription.updated", data: { id: "s", customer_id: "c", status: "active", items: items("pri_pro_y") } },
      PRICES,
    );
    expect(change).toMatchObject({ plan: "pro" });
  });

  it("a scheduled cancellation (updated, still active, same price) keeps the plan — no early revoke", () => {
    const change = resolvePlanChange(
      { event_type: "subscription.updated", data: { id: "s", customer_id: "c", status: "active", items: items("pri_starter_m") } },
      PRICES,
    );
    expect(change).toMatchObject({ plan: "starter" });
  });

  it("reverts to free on cancellation, and on an update to canceled or paused", () => {
    expect(
      resolvePlanChange({ event_type: "subscription.canceled", data: { id: "sub_123", customer_id: "ctm_456", status: "canceled" } }, PRICES),
    ).toMatchObject({ plan: "free", paddleCustomerId: "ctm_456" });
    for (const status of ["canceled", "paused"]) {
      expect(resolvePlanChange({ event_type: "subscription.updated", data: { id: "s", customer_id: "c", status } }, PRICES)).toMatchObject({
        plan: "free",
      });
    }
  });

  it("ignores events we don't act on", () => {
    expect(resolvePlanChange({ event_type: "transaction.completed", data: {} }, PRICES)).toBeNull();
    expect(resolvePlanChange({ event_type: "subscription.updated", data: { status: "past_due" } }, PRICES)).toBeNull();
  });

  it("returns a null userId when custom_data is absent (route falls back to customer id)", () => {
    const change = resolvePlanChange({ event_type: "subscription.canceled", data: { id: "sub_1", customer_id: "ctm_1" } }, PRICES);
    expect(change).toMatchObject({ userId: null, paddleCustomerId: "ctm_1" });
  });
});
