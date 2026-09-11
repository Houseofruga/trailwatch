import { describe, it, expect } from "vitest";
import { isDirectoryDomain } from "./directoryDomains";

describe("isDirectoryDomain", () => {
  it("flags listed directory/aggregator/social domains", () => {
    for (const d of ["linkedin.com", "crunchbase.com", "g2.com", "producthunt.com", "wikipedia.org", "x.com"]) {
      expect(isDirectoryDomain(d)).toBe(true);
    }
  });

  it("flags subdomains and www of a listed domain", () => {
    expect(isDirectoryDomain("www.linkedin.com")).toBe(true);
    expect(isDirectoryDomain("in.linkedin.com")).toBe(true);
    expect(isDirectoryDomain("company.g2.com")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isDirectoryDomain("LinkedIn.com")).toBe(true);
  });

  it("leaves real company homepages alone", () => {
    for (const d of ["netlify.com", "vercel.com", "linear.app", "notion.so", "render.com"]) {
      expect(isDirectoryDomain(d)).toBe(false);
    }
  });

  it("does not flag a lookalike that merely ends in the same letters", () => {
    // endsWith is guarded by a leading dot, so these are NOT subdomains.
    expect(isDirectoryDomain("mylinkedin.com")).toBe(false);
    expect(isDirectoryDomain("notx.com")).toBe(false);
  });

  it("handles blank input", () => {
    expect(isDirectoryDomain("")).toBe(false);
    expect(isDirectoryDomain("   ")).toBe(false);
  });
});
