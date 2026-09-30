import { afterEach, describe, expect, it } from "vitest";
import { ANTHROPIC_FAST_MODEL, ANTHROPIC_SMART_MODEL } from "@/features/ai/models";
import { costUsd } from "@/features/ai/pricing";
import { allocateCosts, isAdminEmail, monthRange } from "./report";

describe("costUsd", () => {
  it("prices input and output per million tokens", () => {
    // Haiku: $1 in, $5 out per 1M.
    expect(costUsd(ANTHROPIC_FAST_MODEL, { inputTokens: 1_000_000, outputTokens: 0 })).toBeCloseTo(1);
    expect(costUsd(ANTHROPIC_FAST_MODEL, { inputTokens: 800, outputTokens: 120 })).toBeCloseTo(0.0014);
  });

  it("charges cache reads at 10% and writes at 125% of input", () => {
    const base = { inputTokens: 0, outputTokens: 0 };
    expect(costUsd(ANTHROPIC_SMART_MODEL, { ...base, cacheReadTokens: 1_000_000 })).toBeCloseTo(0.3);
    expect(costUsd(ANTHROPIC_SMART_MODEL, { ...base, cacheWriteTokens: 1_000_000 })).toBeCloseTo(3.75);
  });

  it("halves Batch API calls", () => {
    const usage = { inputTokens: 2000, outputTokens: 600 };
    expect(costUsd(ANTHROPIC_SMART_MODEL, usage, { batch: true })).toBeCloseTo(costUsd(ANTHROPIC_SMART_MODEL, usage) / 2);
  });

  it("an unknown model costs 0 rather than guessing", () => {
    expect(costUsd("mystery-model", { inputTokens: 1e6, outputTokens: 1e6 })).toBe(0);
  });
});

describe("allocateCosts", () => {
  it("keeps a user's own cost and splits store cost across its followers", () => {
    const { users, unallocated } = allocateCosts({
      userCosts: [
        { userId: "a", cost: 0.3 },
        { userId: "a", cost: 0.1 },
      ],
      storeCosts: [
        { storeId: "dewlane", cost: 0.6 },
        { storeId: "orphan", cost: 0.05 },
      ],
      follows: [
        { userId: "a", storeId: "dewlane" },
        { userId: "b", storeId: "dewlane" },
        { userId: "c", storeId: "dewlane" },
      ],
    });
    expect(unallocated).toBeCloseTo(0.05);
    const byId = Object.fromEntries(users.map((u) => [u.userId, u]));
    expect(byId.a).toMatchObject({ direct: expect.closeTo(0.4), shared: expect.closeTo(0.2), total: expect.closeTo(0.6) });
    expect(byId.b.total).toBeCloseTo(0.2);
    expect(users[0].userId).toBe("a"); // most expensive first
  });
});

describe("monthRange", () => {
  it("returns UTC bounds for a month, rolling over the year", () => {
    expect(monthRange("2026-12")).toEqual({ month: "2026-12", start: "2026-12-01T00:00:00.000Z", end: "2027-01-01T00:00:00.000Z" });
  });

  it("defaults to the current month on missing or junk input", () => {
    const now = new Date("2026-09-30T12:00:00Z");
    expect(monthRange(undefined, now).month).toBe("2026-09");
    expect(monthRange("september", now).month).toBe("2026-09");
  });
});

describe("isAdminEmail", () => {
  const env = process.env.ADMIN_EMAILS;
  afterEach(() => {
    process.env.ADMIN_EMAILS = env;
  });

  it("matches listed emails case-insensitively; nobody when unset", () => {
    process.env.ADMIN_EMAILS = " Owner@Example.com ";
    expect(isAdminEmail("owner@example.com")).toBe(true);
    expect(isAdminEmail("someone@example.com")).toBe(false);
    delete process.env.ADMIN_EMAILS;
    expect(isAdminEmail("owner@example.com")).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
  });
});
