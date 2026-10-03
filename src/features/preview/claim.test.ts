import { describe, expect, it, vi } from "vitest";
import { claimNext, claimPathFor, sameStore } from "./claimPath";

// claim.ts adds the competitor through the app's server action; not needed here.
vi.mock("@/features/competitors/actions", () => ({ addCompetitorByDomain: async () => ({ ok: false, code: "invalid", message: "" }) }));
const { claimDomain } = await import("./claim");

// Fictional brands only: Dewlane, Hearth & Pine.

const ID = "0123456789abcdef0123456789abcdef";

describe("claiming a preview", () => {
  const now = Date.parse("2026-10-04T12:00:00Z");
  it("uses the preview's domain while it's valid", () => {
    expect(claimDomain({ domain: "dewlane.com", expires_at: "2026-10-10T00:00:00Z" }, "hearthandpine.com", now)).toBe("dewlane.com");
  });
  it("falls back to the domain they looked up once it has expired, or when it's unknown", () => {
    expect(claimDomain({ domain: "dewlane.com", expires_at: "2026-10-01T00:00:00Z" }, "https://www.Dewlane.com/", now)).toBe("dewlane.com");
    expect(claimDomain(null, "hearthandpine.com", now)).toBe("hearthandpine.com");
    expect(claimDomain(null, null, now)).toBeNull();
  });
});

describe("the preview survives sign-up", () => {
  it("builds the claim link from what's valid", () => {
    expect(claimPathFor(ID, "dewlane.com")).toBe(`/claim?preview=${ID}&domain=dewlane.com`);
    expect(claimPathFor("not-an-id", "dewlane.com")).toBe("/claim?domain=dewlane.com");
    expect(claimPathFor(null, "<script>")).toBeUndefined();
  });

  it("honours only our own claim link after auth (no open redirects)", () => {
    expect(claimNext(`/claim?preview=${ID}&domain=dewlane.com`)).toBe(`/claim?preview=${ID}&domain=dewlane.com`);
    expect(claimNext("//evil.example/claim?preview=x")).toBeNull();
    expect(claimNext("https://evil.example")).toBeNull();
    expect(claimNext("/dashboard")).toBeNull();
    expect(claimNext("/claim?preview=x<y")).toBeNull();
  });

  it("leaves a direct sign-up on the normal flow", () => {
    // signUp falls back to /welcome and logIn to /dashboard when there's no claim link.
    expect(claimNext(null)).toBeNull();
    expect(claimNext("")).toBeNull();
  });
});

describe("Is this your store?", () => {
  it("spots the competitor's own domain however it's typed", () => {
    expect(sameStore("dewlane.com", "dewlane.com")).toBe(true);
    expect(sameStore("https://www.Dewlane.com/collections/all", "dewlane.com")).toBe(true);
    expect(sameStore("shop.dewlane.com", "dewlane.com")).toBe(false);
    expect(sameStore("hearthandpine.com", "dewlane.com")).toBe(false);
    expect(sameStore("dewlane", "dewlane")).toBe(false);
  });
});
