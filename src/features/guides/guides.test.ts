import { describe, expect, it } from "vitest";
import { GUIDES, guideDate, relatedGuides, tableOfContents } from "./index";

describe("guides", () => {
  it("have unique slugs and unique section anchors", () => {
    expect(new Set(GUIDES.map((g) => g.slug)).size).toBe(GUIDES.length);
    for (const g of GUIDES) {
      const ids = tableOfContents(g).map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });

  it("carry the fields search engines and cards need", () => {
    for (const g of GUIDES) {
      expect(g.title.length).toBeGreaterThan(10);
      expect(g.summary.length).toBeLessThanOrEqual(170);
      expect(g.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(g.faq.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("never list a guide as related to itself", () => {
    for (const g of GUIDES) expect(relatedGuides(g).map((r) => r.slug)).not.toContain(g.slug);
  });

  it("formats dates the same in every time zone", () => {
    expect(guideDate("2026-10-02")).toBe("Oct 2, 2026");
  });
});
