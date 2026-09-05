import { beforeAll, describe, expect, it } from "vitest";
import { unsubscribeToken, unsubscribeUrl, verifyUnsubscribe } from "./unsubscribe";

describe("unsubscribe tokens", () => {
  beforeAll(() => {
    process.env.UNSUBSCRIBE_SECRET = "test-secret";
  });

  it("verifies a token it issued", () => {
    const token = unsubscribeToken("user-1")!;
    expect(token).toBeTruthy();
    expect(verifyUnsubscribe("user-1", token)).toBe(true);
  });

  it("rejects a token issued for a different user", () => {
    const token = unsubscribeToken("user-1")!;
    expect(verifyUnsubscribe("user-2", token)).toBe(false);
  });

  it("rejects a tampered or empty token", () => {
    expect(verifyUnsubscribe("user-1", "not-a-real-token")).toBe(false);
    expect(verifyUnsubscribe("user-1", "")).toBe(false);
  });

  it("builds a URL carrying the user id and token", () => {
    const url = unsubscribeUrl("https://gettrailwatch.com", "user-1")!;
    expect(url).toContain("/api/unsubscribe?u=user-1&t=");
    const token = new URL(url).searchParams.get("t")!;
    expect(verifyUnsubscribe("user-1", token)).toBe(true);
  });
});
