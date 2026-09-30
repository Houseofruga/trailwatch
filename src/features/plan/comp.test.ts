import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { isCompEmail, resolvePlan } from "./comp";

const env = { ...process.env };
beforeEach(() => {
  // Most cases describe billing being live; the beta block turns it off.
  process.env.NEXT_PUBLIC_BILLING_ENABLED = "true";
});
afterEach(() => {
  process.env = { ...env };
});

describe("comp accounts", () => {
  it("treats a listed email as Pro regardless of the stored plan", () => {
    process.env.COMP_EMAILS = "founder@example.com, teammate@example.com";
    expect(isCompEmail("founder@example.com")).toBe(true);
    expect(resolvePlan("founder@example.com", "free")).toBe("pro");
  });

  it("is case-insensitive and ignores surrounding whitespace", () => {
    process.env.COMP_EMAILS = "  Founder@Example.com  ";
    expect(isCompEmail("FOUNDER@example.com")).toBe(true);
  });

  it("leaves non-comp users on their stored plan", () => {
    process.env.COMP_EMAILS = "founder@example.com";
    expect(resolvePlan("someone@else.com", "free")).toBe("free");
    expect(resolvePlan("someone@else.com", "starter")).toBe("starter");
    // The pre-pivot single paid plan reads as Pro.
    expect(resolvePlan("someone@else.com", "paid")).toBe("pro");
  });

  it("handles an unset or empty list without granting anyone Pro", () => {
    delete process.env.COMP_EMAILS;
    expect(isCompEmail("founder@example.com")).toBe(false);
    process.env.COMP_EMAILS = "";
    expect(isCompEmail("founder@example.com")).toBe(false);
  });

  it("never grants Pro to a null/empty email", () => {
    process.env.COMP_EMAILS = "founder@example.com";
    expect(isCompEmail(null)).toBe(false);
    expect(isCompEmail("")).toBe(false);
  });
});

describe("free beta (billing off)", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_BILLING_ENABLED;
    delete process.env.COMP_EMAILS;
  });

  it("gives everyone the beta plan (Pro by default)", () => {
    delete process.env.BETA_PLAN;
    expect(resolvePlan("anyone@example.com", "free")).toBe("pro");
    expect(resolvePlan("anyone@example.com", null)).toBe("pro");
  });

  it("respects a configured beta plan, but never lowers a higher stored plan", () => {
    process.env.BETA_PLAN = "starter";
    expect(resolvePlan("a@example.com", "free")).toBe("starter");
    expect(resolvePlan("a@example.com", "pro")).toBe("pro");
    process.env.BETA_PLAN = "free";
    expect(resolvePlan("a@example.com", "free")).toBe("free");
  });
});
