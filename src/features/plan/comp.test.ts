import { describe, it, expect, afterEach } from "vitest";
import { isCompEmail, resolvePlan } from "./comp";

const original = process.env.COMP_EMAILS;
afterEach(() => {
  process.env.COMP_EMAILS = original;
});

describe("comp accounts", () => {
  it("treats a listed email as Pro regardless of the stored plan", () => {
    process.env.COMP_EMAILS = "founder@example.com, teammate@example.com";
    expect(isCompEmail("founder@example.com")).toBe(true);
    expect(resolvePlan("founder@example.com", "free")).toBe("paid");
  });

  it("is case-insensitive and ignores surrounding whitespace", () => {
    process.env.COMP_EMAILS = "  Founder@Example.com  ";
    expect(isCompEmail("FOUNDER@example.com")).toBe(true);
  });

  it("leaves non-comp users on their stored plan", () => {
    process.env.COMP_EMAILS = "founder@example.com";
    expect(resolvePlan("someone@else.com", "free")).toBe("free");
    expect(resolvePlan("someone@else.com", "paid")).toBe("paid");
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
