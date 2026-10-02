import { describe, expect, it } from "vitest";
import { cacheIsFresh, pickSuggestions, toSuggestions } from "./suggest";

const S = (domain: string) => ({ name: domain, domain, why: "" });

describe("toSuggestions", () => {
  it("normalises domains and drops duplicates and blanks", () => {
    const out = toSuggestions([
      { name: "Dewlane", url: "https://www.dewlane.com/", why: " Linen bedding " },
      { name: "Dewlane again", url: "dewlane.com", why: "" },
      { name: "No site", url: "", why: "" },
    ]);
    expect(out).toEqual([{ name: "Dewlane", domain: "dewlane.com", why: "Linen bedding" }]);
  });
});

describe("pickSuggestions", () => {
  it("skips the own store and followed stores, then caps", () => {
    const all = ["a.com", "b.com", "c.com", "d.com", "e.com", "f.com"].map(S);
    expect(pickSuggestions(all, ["www.b.com", "c.com"], 3).map((s) => s.domain)).toEqual(["a.com", "d.com", "e.com"]);
  });
});

describe("cacheIsFresh", () => {
  const now = Date.parse("2026-10-02T12:00:00Z");
  it("is fresh for the same store within a week", () => {
    expect(cacheIsFresh({ store: "x.com", at: "2026-09-30T12:00:00Z" }, "x.com", now)).toBe(true);
  });
  it("is stale for another store, an old result, or none", () => {
    expect(cacheIsFresh({ store: "y.com", at: "2026-09-30T12:00:00Z" }, "x.com", now)).toBe(false);
    expect(cacheIsFresh({ store: "x.com", at: "2026-09-20T12:00:00Z" }, "x.com", now)).toBe(false);
    expect(cacheIsFresh({ store: null, at: null }, "x.com", now)).toBe(false);
  });
});
