import { describe, expect, it } from "vitest";
import { buildClassifierPrompt, parseClassification } from "./classifyPrompt";

describe("buildClassifierPrompt", () => {
  it("sends only the changed lines, with store and page context", () => {
    const shared = Array.from({ length: 30 }, (_, i) => `Nav item ${i}`).join("\n");
    const { system, user } = buildClassifierPrompt({
      storeName: "Dewlane",
      pageKind: "homepage",
      oldText: `${shared}\nFree shipping on orders over $50`,
      newText: `${shared}\nSitewide 25% off with code GLOW25\nFree shipping on orders over $65`,
    });
    expect(system).toContain('"promo_launched"');
    expect(user).toContain("Store: Dewlane");
    expect(user).toContain("Page: homepage");
    expect(user).toContain("Sitewide 25% off with code GLOW25");
    expect(user).toContain("Free shipping on orders over $50");
    expect(user).not.toContain("Nav item 3");
  });
});

describe("parseClassification", () => {
  it("parses a clean JSON reply", () => {
    expect(
      parseClassification(
        '{"type":"promo_launched","summary":"Dewlane started a 25% off sale with code GLOW25.","discountPct":25,"code":"GLOW25","freeShippingThreshold":null}',
      ),
    ).toEqual({
      type: "promo_launched",
      summary: "Dewlane started a 25% off sale with code GLOW25.",
      discountPct: 25,
      code: "GLOW25",
      freeShippingThreshold: null,
    });
  });

  it("tolerates a code fence, missing optional fields and '$65'-style numbers", () => {
    const reply = '```json\n{"type":"policy_change","summary":"Free-shipping threshold rose to $65.","freeShippingThreshold":"$65"}\n```';
    expect(parseClassification(reply)).toEqual({
      type: "policy_change",
      summary: "Free-shipping threshold rose to $65.",
      discountPct: null,
      code: null,
      freeShippingThreshold: 65,
    });
  });

  it("nulls out a nonsense number instead of rejecting the whole reply", () => {
    const reply = '{"type":"promo_launched","summary":"A sale.","discountPct":"lots"}';
    expect(parseClassification(reply)).toMatchObject({ type: "promo_launched", discountPct: null });
  });

  it("rejects unknown types, missing summaries and non-JSON", () => {
    expect(parseClassification('{"type":"price_war","summary":"x"}')).toBeNull();
    expect(parseClassification('{"type":"cosmetic","summary":""}')).toBeNull();
    expect(parseClassification("The page changed a lot.")).toBeNull();
    expect(parseClassification("{not json}")).toBeNull();
  });
});
