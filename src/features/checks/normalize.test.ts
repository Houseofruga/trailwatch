import { describe, expect, it } from "vitest";
import { normalizeText } from "./normalize";

describe("normalizeText", () => {
  it("collapses runs of spaces and tabs within a line", () => {
    expect(normalizeText("Welcome   to\tAcme")).toBe("Welcome to Acme");
  });

  it("drops empty lines and trims each remaining line", () => {
    expect(normalizeText("  Line one  \n\n\n  Line two  ")).toBe("Line one\nLine two");
  });

  it("strips relative timestamps", () => {
    expect(normalizeText("Posted 3 hours ago about this")).toBe("Posted about this");
  });

  it("strips absolute dates", () => {
    expect(normalizeText("Updated on Aug 14, 2026 by the team")).toBe(
      "Updated on by the team",
    );
  });

  it("strips numeric dates", () => {
    expect(normalizeText("Effective 2026-08-14 for all plans")).toBe(
      "Effective for all plans",
    );
  });

  it("strips copyright years", () => {
    expect(normalizeText("© 2026 Acme Inc.")).toBe("Acme Inc.");
  });

  it("strips long hex token-like strings", () => {
    expect(normalizeText("Session abc123def4567890fe token active")).toBe(
      "Session token active",
    );
  });

  it("leaves genuine content untouched", () => {
    expect(normalizeText("Business plan is now $16 per user per month")).toBe(
      "Business plan is now $16 per user per month",
    );
  });
});
