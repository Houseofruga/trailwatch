import { describe, expect, it } from "vitest";
import { labelToType, pageTypeLabel, PAGE_TYPE_VALUES } from "./pageTypes";

describe("labelToType", () => {
  it("maps common exact labels", () => {
    expect(labelToType("Homepage")).toBe("homepage");
    expect(labelToType("Home")).toBe("homepage");
    expect(labelToType("Pricing")).toBe("pricing");
    expect(labelToType("Plans")).toBe("pricing");
    expect(labelToType("Changelog")).toBe("changelog");
    expect(labelToType("Blog")).toBe("blog");
    expect(labelToType("Features")).toBe("product");
  });

  it("matches on substrings when not an exact label", () => {
    expect(labelToType("Pricing page")).toBe("pricing");
    expect(labelToType("Product changelog")).toBe("changelog");
    expect(labelToType("Company blog")).toBe("blog");
    expect(labelToType("Home / landing")).toBe("homepage");
  });

  it("falls back to other for anything unrecognized", () => {
    expect(labelToType("Careers")).toBe("other");
    expect(labelToType("Docs")).toBe("other");
    expect(labelToType("")).toBe("other");
  });

  it("only ever returns a valid page-type value", () => {
    for (const label of ["Pricing", "asdf", "Homepage", "Careers", "changelog"]) {
      expect(PAGE_TYPE_VALUES).toContain(labelToType(label));
    }
  });
});

describe("pageTypeLabel", () => {
  it("returns the display label, or Other for unknown", () => {
    expect(pageTypeLabel("pricing")).toBe("Pricing");
    expect(pageTypeLabel("homepage")).toBe("Homepage");
    expect(pageTypeLabel("bogus")).toBe("Other");
  });
});
