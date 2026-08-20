import { describe, expect, it } from "vitest";
import { normalizeDomainInput, originOf, replaceUrlHost, sameOrigin } from "./domain";

describe("originOf", () => {
  it("returns the origin for a valid URL", () => {
    expect(originOf("https://vercel.com/pricing")).toBe("https://vercel.com");
  });

  it("returns null for unparseable input", () => {
    expect(originOf("not a url")).toBeNull();
  });
});

describe("normalizeDomainInput", () => {
  it("accepts a full URL", () => {
    expect(normalizeDomainInput("https://vercel.com/pricing")).toBe("https://vercel.com");
  });

  it("accepts a bare domain by assuming https", () => {
    expect(normalizeDomainInput("vercel.com")).toBe("https://vercel.com");
  });

  it("returns null for empty or unparseable input", () => {
    expect(normalizeDomainInput("")).toBeNull();
    expect(normalizeDomainInput("   ")).toBeNull();
  });
});

describe("sameOrigin", () => {
  it("is true for two URLs on the same domain", () => {
    expect(sameOrigin("https://vercel.com/pricing", "https://vercel.com/changelog")).toBe(true);
  });

  it("is false for different domains", () => {
    expect(sameOrigin("https://vercel.com/pricing", "https://notion.so/pricing")).toBe(false);
  });

  it("is false if either URL is unparseable", () => {
    expect(sameOrigin("https://vercel.com/pricing", "not a url")).toBe(false);
  });
});

describe("replaceUrlHost", () => {
  it("swaps the host while preserving path, query, and hash", () => {
    expect(replaceUrlHost("https://vercel.com/pricing?tab=pro#faq", "https://vercell.com")).toBe(
      "https://vercell.com/pricing?tab=pro#faq",
    );
  });

  it("swaps the protocol too", () => {
    expect(replaceUrlHost("http://vercel.com/pricing", "https://vercel.com")).toBe(
      "https://vercel.com/pricing",
    );
  });
});
