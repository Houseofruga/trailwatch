import { describe, it, expect } from "vitest";
import { formatUrlError } from "./rowValidation";

// formatUrlError is the shared client surface over the pageUrl schema. The point
// of interest here is the domain rule: a watched URL must be a real public domain,
// since a dotless host or raw IP can never resolve to a page we'd monitor.
describe("formatUrlError — domain validation", () => {
  it("accepts real domains, paths, subdomains, and varied TLDs", () => {
    expect(formatUrlError("https://example.com")).toBeNull();
    expect(formatUrlError("https://linear.app/pricing")).toBeNull();
    expect(formatUrlError("https://sub.example.co.uk")).toBeNull();
    expect(formatUrlError("https://example.io")).toBeNull();
  });

  it("rejects hosts with no valid public TLD", () => {
    expect(formatUrlError("https://asdf")).not.toBeNull();
    expect(formatUrlError("https://localhost")).not.toBeNull();
    expect(formatUrlError("https://192.168.0.1")).not.toBeNull();
    expect(formatUrlError("https://foo.c")).not.toBeNull();
  });

  it("rejects a scheme-less token (not a URL at all)", () => {
    expect(formatUrlError("asdf")).not.toBeNull();
  });

  it("treats blank as an unused slot, not an error", () => {
    expect(formatUrlError("")).toBeNull();
    expect(formatUrlError("   ")).toBeNull();
  });
});
