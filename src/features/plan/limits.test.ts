import { afterEach, describe, expect, it } from "vitest";
import {
  annualUsd,
  betaPlan,
  billingEnabled,
  bfcmWindow,
  formatPrice,
  formatProPrice,
  higherPlan,
  LIMITS,
  parsePlan,
  PLANS,
  PRO_ANNUAL_MONTHS_FREE,
  storeCheckIntervalHours,
} from "./limits";

const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
});

describe("plans (SPEC.md §4)", () => {
  it("matches the spec's limits and features", () => {
    expect(PLANS.free).toMatchObject({ monthlyUsd: 0, competitors: 1, instantAlerts: false, slack: false, ownStore: false, checkIntervalHours: 24 });
    expect(PLANS.starter).toMatchObject({ monthlyUsd: 29, competitors: 3, instantAlerts: true, slack: false, ownStore: false, checkIntervalHours: 6 });
    expect(PLANS.pro).toMatchObject({ monthlyUsd: 79, competitors: 10, instantAlerts: true, slack: true, ownStore: true, checkIntervalHours: 2 });
    expect(PLANS.agency).toMatchObject({ monthlyUsd: 199, launched: false });
  });

  it("limits count competitors from the plan config", () => {
    expect(LIMITS.free.competitors).toBe(1);
    expect(LIMITS.pro.competitors).toBe(10);
  });
});

describe("parsePlan / higherPlan", () => {
  it("accepts the four plans, maps the pre-pivot 'paid' to Pro, and defaults to Free", () => {
    for (const p of ["free", "starter", "pro", "agency"]) expect(parsePlan(p)).toBe(p);
    expect(parsePlan("paid")).toBe("pro");
    for (const junk of [null, undefined, "", "enterprise", 3]) expect(parsePlan(junk)).toBe("free");
  });

  it("orders plans free < starter < pro < agency", () => {
    expect(higherPlan("free", "pro")).toBe("pro");
    expect(higherPlan("pro", "starter")).toBe("pro");
    expect(higherPlan("agency", "pro")).toBe("agency");
  });
});

describe("pricing", () => {
  it("annual is 10× monthly (2 months free)", () => {
    expect(annualUsd("starter")).toBe(290);
    expect(annualUsd("pro")).toBe(790);
    expect(PRO_ANNUAL_MONTHS_FREE).toBe(2);
  });

  it("formats monthly and per-month-annual prices", () => {
    expect(formatPrice("starter", "monthly")).toEqual({ amount: "$29", per: "/mo" });
    expect(formatPrice("pro", "annual")).toEqual({ amount: "$65.83", per: "/mo, billed annually" });
    expect(formatProPrice("monthly")).toEqual({ amount: "$79", per: "/mo" });
  });
});

describe("beta", () => {
  it("billing is off unless explicitly enabled", () => {
    delete process.env.NEXT_PUBLIC_BILLING_ENABLED;
    expect(billingEnabled()).toBe(false);
    process.env.NEXT_PUBLIC_BILLING_ENABLED = "true";
    expect(billingEnabled()).toBe(true);
  });

  it("the beta plan defaults to Pro and is configurable", () => {
    delete process.env.BETA_PLAN;
    expect(betaPlan()).toBe("pro");
    process.env.BETA_PLAN = "starter";
    expect(betaPlan()).toBe("starter");
  });
});

describe("storeCheckIntervalHours", () => {
  const now = new Date("2026-11-27T12:00:00Z"); // Black Friday
  const bfcm = { start: new Date("2026-11-26T00:00:00Z"), end: new Date("2026-12-01T00:00:00Z") };

  it("uses the fastest plan among the store's users", () => {
    expect(storeCheckIntervalHours(["free"], now, null)).toBe(24);
    expect(storeCheckIntervalHours(["free", "starter"], now, null)).toBe(6);
    expect(storeCheckIntervalHours(["starter", "pro", "free"], now, null)).toBe(2);
  });

  it("falls back to daily for a store nobody uses", () => {
    expect(storeCheckIntervalHours([], now, null)).toBe(24);
  });

  it("checks hourly for Pro during BFCM, and only inside the window", () => {
    expect(storeCheckIntervalHours(["pro"], now, bfcm)).toBe(1);
    expect(storeCheckIntervalHours(["starter"], now, bfcm)).toBe(6);
    expect(storeCheckIntervalHours(["pro"], new Date("2026-12-02T00:00:00Z"), bfcm)).toBe(2);
  });

  it("reads the BFCM window from env, ignoring bad values", () => {
    process.env.BFCM_START = "2026-11-26T00:00:00Z";
    process.env.BFCM_END = "2026-12-01T00:00:00Z";
    expect(bfcmWindow()).toEqual(bfcm);
    process.env.BFCM_END = "not a date";
    expect(bfcmWindow()).toBeNull();
  });
});
