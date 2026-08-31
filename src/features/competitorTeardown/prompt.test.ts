import { describe, expect, it } from "vitest";
import { buildPrompt, parseTeardown, EMPTY_SENTINEL } from "./prompt";

const site = {
  url: "https://example.com",
  title: "Acme",
  pages: [
    { label: "Homepage", text: "Acme helps teams ship faster." },
    { label: "Pricing", text: "Starter $10. Pro $30." },
  ],
};

describe("buildPrompt", () => {
  it("includes the competitor title, url, and each page's labeled text", () => {
    const { user } = buildPrompt(site);
    expect(user).toContain("Acme");
    expect(user).toContain("https://example.com");
    expect(user).toContain("## Homepage");
    expect(user).toContain("## Pricing");
    expect(user).toContain("$30");
  });

  it("instructs JSON-only output and defines the sentinel", () => {
    const { system } = buildPrompt(site);
    expect(system).toMatch(/json/i);
    expect(system).toContain("positioning");
    expect(system).toContain("whatToWatch");
    expect(system).toContain(EMPTY_SENTINEL);
  });

  it("caps very long page text so token cost stays bounded", () => {
    const huge = "x".repeat(20000);
    const { user } = buildPrompt({ ...site, pages: [{ label: "Homepage", text: huge }] });
    // 6000-char per-page cap + template — well under the raw 20k.
    expect(user.length).toBeLessThan(7000);
  });
});

describe("parseTeardown", () => {
  it("parses a well-formed JSON teardown", () => {
    const raw = JSON.stringify({
      positioning: "Acme is for engineering teams that want to ship faster.",
      pricingTiers: [
        { name: "Starter", price: "$10/mo", notes: null },
        { name: "Pro", price: "$30/mo", notes: "annual discount" },
      ],
      whatToWatch: ["Pricing page — watch for discounts", "Changelog — ships weekly"],
    });
    const parsed = parseTeardown(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.positioning).toContain("engineering teams");
    expect(parsed!.pricingTiers).toHaveLength(2);
    expect(parsed!.pricingTiers![1].notes).toBe("annual discount");
    expect(parsed!.whatToWatch).toHaveLength(2);
  });

  it("extracts JSON even when wrapped in prose or a code fence", () => {
    const raw = 'Here you go:\n```json\n{"positioning":"A tool.","whatToWatch":["Blog"],"pricingTiers":null}\n```';
    const parsed = parseTeardown(raw);
    expect(parsed).not.toBeNull();
    expect(parsed!.pricingTiers).toBeNull();
    expect(parsed!.whatToWatch).toEqual(["Blog"]);
  });

  it("returns null on the empty sentinel", () => {
    expect(parseTeardown(EMPTY_SENTINEL)).toBeNull();
    expect(parseTeardown(`  ${EMPTY_SENTINEL}  `)).toBeNull();
  });

  it("returns null when positioning or whatToWatch is missing", () => {
    expect(parseTeardown('{"pricingTiers":null}')).toBeNull();
    expect(parseTeardown('{"positioning":"x","whatToWatch":[]}')).toBeNull();
  });

  it("returns null on non-JSON junk", () => {
    expect(parseTeardown("not json at all")).toBeNull();
    expect(parseTeardown("")).toBeNull();
  });

  it("drops malformed pricing tiers and nulls empty pricing", () => {
    const raw = JSON.stringify({
      positioning: "A product.",
      pricingTiers: [{ foo: "bar" }, { name: "Free", price: "$0", notes: "" }],
      whatToWatch: ["Homepage"],
    });
    const parsed = parseTeardown(raw);
    expect(parsed!.pricingTiers).toHaveLength(1);
    expect(parsed!.pricingTiers![0]).toEqual({ name: "Free", price: "$0", notes: null });
  });
});
