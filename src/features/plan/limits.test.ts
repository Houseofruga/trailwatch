import { describe, it, expect } from "vitest";
import { formatProPrice, PRO_ANNUAL_MONTHS_FREE } from "./limits";

describe("formatProPrice", () => {
  it("shows the flat monthly price", () => {
    expect(formatProPrice("monthly")).toEqual({ amount: "$19", per: "/mo" });
  });

  it("shows the annual price as a per-month equivalent", () => {
    expect(formatProPrice("annual")).toEqual({
      amount: "$15.83",
      per: "/mo, billed annually",
    });
  });

  it("annual is exactly 2 months free versus paying monthly", () => {
    expect(PRO_ANNUAL_MONTHS_FREE).toBe(2);
  });
});
