import { describe, expect, it } from "vitest";
import { isMeaningfulChange } from "./noiseFilter";
import { normalizeText } from "./normalize";

// SPEC.md §8: whitespace-only (not meaningful), price change (meaningful),
// added paragraph (meaningful), timestamp-only (not meaningful).
describe("isMeaningfulChange", () => {
  it("ignores whitespace-only differences", () => {
    const oldText = "Welcome to Acme.\nWe help teams ship faster.";
    const newText = "Welcome  to Acme.\n\nWe help teams ship faster.";

    const result = isMeaningfulChange(oldText, newText);

    expect(result.meaningful).toBe(false);
  });

  it("flags a price change even though the edit is small", () => {
    const oldText = "Plan: Biz\nP: $14\nStorage: unlimited";
    const newText = "Plan: Biz\nP: $16\nStorage: unlimited";

    const result = isMeaningfulChange(oldText, newText);

    expect(result.meaningful).toBe(true);
    expect(result.reason).toMatch(/price/i);
  });

  it("flags an added paragraph as meaningful", () => {
    const oldText = "Welcome to Acme.\nWe help teams ship faster.";
    const newText =
      "Welcome to Acme.\nWe help teams ship faster.\nNew: real-time collaboration is now available for all workspace members.";

    const result = isMeaningfulChange(oldText, newText);

    expect(result.meaningful).toBe(true);
    expect(result.reason).toMatch(/threshold/i);
  });

  it("ignores a timestamp-only difference once normalized", () => {
    const oldRaw = "Last updated 2 hours ago.\nWelcome to Acme.";
    const newRaw = "Last updated 5 hours ago.\nWelcome to Acme.";

    const result = isMeaningfulChange(normalizeText(oldRaw), normalizeText(newRaw));

    expect(result.meaningful).toBe(false);
  });

  it("reports no change for identical text", () => {
    const text = "Welcome to Acme.";

    const result = isMeaningfulChange(text, text);

    expect(result.meaningful).toBe(false);
  });
});
