import { describe, it, expect } from "vitest";
import { resolvePlanChange } from "./resolvePlanChange";

describe("resolvePlanChange", () => {
  it("flips to paid when a subscription activates, carrying ids and userId", () => {
    const change = resolvePlanChange({
      event_type: "subscription.activated",
      data: {
        id: "sub_123",
        customer_id: "ctm_456",
        status: "active",
        custom_data: { userId: "user-abc" },
      },
    });
    expect(change).toEqual({
      plan: "paid",
      paddleSubscriptionId: "sub_123",
      paddleCustomerId: "ctm_456",
      userId: "user-abc",
    });
  });

  it("treats an active subscription.created as paid", () => {
    const change = resolvePlanChange({
      event_type: "subscription.created",
      data: { id: "sub_1", customer_id: "ctm_1", status: "active", custom_data: { userId: "u1" } },
    });
    expect(change?.plan).toBe("paid");
  });

  it("does NOT grant paid for a created-but-not-yet-active subscription", () => {
    const change = resolvePlanChange({
      event_type: "subscription.created",
      data: { id: "sub_1", customer_id: "ctm_1", status: "trialing" },
    });
    expect(change).toBeNull();
  });

  it("reverts to free on cancellation", () => {
    const change = resolvePlanChange({
      event_type: "subscription.canceled",
      data: { id: "sub_123", customer_id: "ctm_456", status: "canceled" },
    });
    expect(change?.plan).toBe("free");
    expect(change?.paddleCustomerId).toBe("ctm_456");
  });

  it("ignores events we don't act on", () => {
    expect(resolvePlanChange({ event_type: "transaction.completed", data: {} })).toBeNull();
    expect(resolvePlanChange({ event_type: "subscription.updated", data: {} })).toBeNull();
  });

  it("returns a null userId when custom_data is absent (route falls back to customer id)", () => {
    const change = resolvePlanChange({
      event_type: "subscription.canceled",
      data: { id: "sub_1", customer_id: "ctm_1" },
    });
    expect(change?.userId).toBeNull();
    expect(change?.paddleCustomerId).toBe("ctm_1");
  });
});
