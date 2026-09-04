import { describe, it, expect } from "vitest";
import { normalizeUrl } from "./url";

describe("normalizeUrl", () => {
  it("prefixes https:// on a bare domain", () => {
    expect(normalizeUrl("linear.app")).toBe("https://linear.app");
  });
  it("keeps an existing scheme", () => {
    expect(normalizeUrl("http://x.com")).toBe("http://x.com");
    expect(normalizeUrl("https://x.com/pricing")).toBe("https://x.com/pricing");
  });
  it("trims surrounding whitespace", () => {
    expect(normalizeUrl("  notion.so  ")).toBe("https://notion.so");
  });
  it("leaves empty input empty", () => {
    expect(normalizeUrl("")).toBe("");
    expect(normalizeUrl("   ")).toBe("");
  });
});
