import { describe, expect, it } from "vitest";
import { normalizeDomainInput, originOf, replaceUrlHost, sameOrigin, sameSite, siteOf } from "./domain";

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

describe("siteOf", () => {
  it("strips subdomains to the registrable domain", () => {
    expect(siteOf("https://www.tryprofound.com/pricing")).toBe("tryprofound.com");
    expect(siteOf("https://docs.tryprofound.com/rest-api/changelog")).toBe("tryprofound.com");
  });

  it("keeps multi-part public suffixes intact", () => {
    expect(siteOf("https://shop.marks.co.uk")).toBe("marks.co.uk");
    expect(siteOf("https://www.example.com.au")).toBe("example.com.au");
  });

  it("returns null for unparseable input", () => {
    expect(siteOf("not a url")).toBeNull();
  });
});

describe("sameSite", () => {
  it("treats subdomains of one site as the same competitor", () => {
    expect(
      sameSite("https://www.tryprofound.com/pricing", "https://docs.tryprofound.com/rest-api"),
    ).toBe(true);
  });

  it("still separates genuinely different domains", () => {
    expect(sameSite("https://tryprofound.com", "https://profound.com")).toBe(false);
  });

  it("does not confuse different sites under the same public suffix", () => {
    expect(sameSite("https://marks.co.uk", "https://spencer.co.uk")).toBe(false);
  });

  it("is false if either URL is unparseable", () => {
    expect(sameSite("https://tryprofound.com", "not a url")).toBe(false);
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
