import { describe, expect, it } from "vitest";
import { competitorSections, fallbackInterpretation, parseInterpretation, type BriefingInput } from "./content";
import { buildBriefingMessage, BRIEFING_SYSTEM } from "./prompt";
import { renderBriefingEmail } from "./render";
import { briefingWeek, canSend, canSubmit, easternParts, nextBriefingAt, stopWaiting, userBriefingDue } from "./schedule";

describe("briefing schedule (US Eastern, DST-aware)", () => {
  it("reads Eastern wall-clock time in summer (EDT, UTC-4) and winter (EST, UTC-5)", () => {
    // Monday 2026-09-28 12:00 UTC = 08:00 EDT
    expect(easternParts(new Date("2026-09-28T12:00:00Z"))).toEqual({ weekday: 1, hour: 8, date: "2026-09-28" });
    // Monday 2026-12-07 13:00 UTC = 08:00 EST
    expect(easternParts(new Date("2026-12-07T13:00:00Z"))).toEqual({ weekday: 1, hour: 8, date: "2026-12-07" });
  });

  it("sends each user at their own Monday hour in their own zone", () => {
    const mon1400Utc = new Date("2026-09-28T14:00:00Z"); // 10:00 EDT, 07:00 PDT
    expect(userBriefingDue(mon1400Utc, 8, "America/New_York")).toBe(true);
    expect(userBriefingDue(mon1400Utc, 8, "America/Los_Angeles")).toBe(false);
    expect(userBriefingDue(new Date("2026-09-28T15:00:00Z"), 8, "America/Los_Angeles")).toBe(true);
    expect(userBriefingDue(mon1400Utc, 8, "Not/AZone")).toBe(true); // falls back to Eastern
    expect(userBriefingDue(new Date("2026-09-29T14:00:00Z"), 8, "America/New_York")).toBe(false); // Tuesday
  });

  it("finds the next Monday briefing time, DST-aware", () => {
    // Wednesday 2026-09-30 → Monday 2026-10-05 08:00 EDT = 12:00 UTC
    expect(nextBriefingAt(new Date("2026-09-30T16:00:00Z"), 8, "America/New_York").toISOString()).toBe("2026-10-05T12:00:00.000Z");
    // Pacific 7 AM → 14:00 UTC
    expect(nextBriefingAt(new Date("2026-09-30T16:00:00Z"), 7, "America/Los_Angeles").toISOString()).toBe("2026-10-05T14:00:00.000Z");
    // Monday before the hour → today; after → next week
    expect(nextBriefingAt(new Date("2026-09-28T11:00:00Z"), 8, "America/New_York").toISOString()).toBe("2026-09-28T12:00:00.000Z");
    expect(nextBriefingAt(new Date("2026-09-28T13:00:00Z"), 8, "America/New_York").toISOString()).toBe("2026-10-05T12:00:00.000Z");
    // Across the November DST change: 8 AM EST = 13:00 UTC
    expect(nextBriefingAt(new Date("2026-11-04T16:00:00Z"), 8, "America/New_York").toISOString()).toBe("2026-11-09T13:00:00.000Z");
  });

  it("the send window opens Monday 06:00 ET (the earliest choice) — same local hour across DST", () => {
    expect(canSend(new Date("2026-09-28T09:59:00Z"))).toBe(false); // 05:59 EDT
    expect(canSend(new Date("2026-09-28T10:00:00Z"))).toBe(true); // 06:00 EDT, the earliest choice
    expect(canSend(new Date("2026-12-07T10:30:00Z"))).toBe(false); // 05:30 EST
    expect(canSend(new Date("2026-12-07T11:00:00Z"))).toBe(true); // 06:00 EST
    expect(canSend(new Date("2026-09-29T12:00:00Z"))).toBe(false); // Tuesday
  });

  it("prepares from Sunday 18:00 ET, for the next day's Monday", () => {
    // Sunday 2026-09-27 21:59 UTC = 17:59 EDT
    expect(canSubmit(new Date("2026-09-27T21:59:00Z"))).toBe(false);
    expect(canSubmit(new Date("2026-09-27T22:00:00Z"))).toBe(true);
    expect(briefingWeek(new Date("2026-09-27T22:00:00Z"))).toBe("2026-09-28");
    expect(briefingWeek(new Date("2026-09-28T15:00:00Z"))).toBe("2026-09-28");
    // Sunday 23:30 ET is already Monday in UTC — still the same briefing week.
    expect(briefingWeek(new Date("2026-09-28T03:30:00Z"))).toBe("2026-09-28");
    expect(briefingWeek(new Date("2026-09-30T12:00:00Z"))).toBeNull(); // Wednesday
  });

  it("stops waiting on the batch at Monday 11:00 ET", () => {
    expect(stopWaiting(new Date("2026-09-28T14:59:00Z"))).toBe(false);
    expect(stopWaiting(new Date("2026-09-28T15:00:00Z"))).toBe(true);
  });
});

const input: BriefingInput = {
  weekOf: "2026-10-05",
  events: [
    { storeId: "d", storeName: "Dewlane", type: "product_launched", severity: "high", payload: { title: "Night Cream", price: 4800 }, detectedAt: "2026-10-01T10:00:00Z" },
    { storeId: "d", storeName: "Dewlane", type: "promo_launched", severity: "high", payload: { summary: "Dewlane went 25% off sitewide with code GLOW25.", discountPct: 25 }, detectedAt: "2026-10-02T10:00:00Z" },
    { storeId: "d", storeName: "Dewlane", type: "policy_change", severity: "normal", payload: { summary: "Dewlane raised its free-shipping threshold to $65." }, detectedAt: "2026-10-03T10:00:00Z" },
    { storeId: "n", storeName: "Northwind Knits", type: "price_changed", severity: "normal", payload: { title: "Merino Crew", oldPrice: 9800, newPrice: 8900, pctChange: -9.2 }, detectedAt: "2026-10-04T10:00:00Z" },
  ],
};

describe("competitorSections", () => {
  it("groups each competitor's moves by category, busiest competitor first", () => {
    const sections = competitorSections(input);
    expect(sections.map((s) => s.storeName)).toEqual(["Dewlane", "Northwind Knits"]);
    expect(sections[0].groups.map((g) => g.label)).toEqual(["Launches", "Pricing & promos", "Positioning & policy"]);
    expect(sections[1].groups[0].lines).toEqual(["Northwind Knits cut Merino Crew from $98 to $89 (-9.2%)."]);
  });
});

describe("fallbackInterpretation (no AI)", () => {
  it("leads with high-severity moves, newest first, and a templated suggestion", () => {
    const f = fallbackInterpretation(input);
    expect(f.topMoves.map((m) => m.headline)).toEqual([
      "Dewlane went 25% off sitewide with code GLOW25.",
      "Dewlane launched Night Cream at $48.",
      "Northwind Knits cut Merino Crew from $98 to $89 (-9.2%).",
    ]);
    expect(f.whatThisMeans).toBeNull();
    expect(f.suggestedMove).toMatch(/25%-off promotion/);
  });
});

describe("parseInterpretation", () => {
  it("parses the model's JSON and keeps at most 3 moves", () => {
    const reply = JSON.stringify({
      topMoves: [1, 2, 3, 4].map((i) => ({ headline: `Move ${i}.`, whyItMatters: "Because." })),
      whatThisMeans: "The category is getting promo-heavy.",
      suggestedMove: "Run a 48-hour early-access offer.",
    });
    const parsed = parseInterpretation("```json\n" + reply + "\n```");
    expect(parsed?.topMoves).toHaveLength(3);
    expect(parsed?.suggestedMove).toBe("Run a 48-hour early-access offer.");
  });

  it("rejects replies without moves or a suggestion", () => {
    expect(parseInterpretation('{"topMoves":[],"suggestedMove":"x"}')).toBeNull();
    expect(parseInterpretation('{"topMoves":[{"headline":"a"}]}')).toBeNull();
    expect(parseInterpretation("no json")).toBeNull();
  });
});

describe("briefing prompt", () => {
  it("keeps the fixed instructions in the (cacheable) system prompt and facts in the message", () => {
    expect(BRIEFING_SYSTEM).toContain("Use only the facts given");
    const msg = buildBriefingMessage(input);
    expect(msg).toContain("Week of 2026-10-05. 4 competitor moves.");
    // High severity first.
    expect(msg.indexOf("[HIGH]")).toBeLessThan(msg.indexOf("[normal]"));
    expect(msg).toContain("Dewlane launched Night Cream at $48.");
  });

  it("caps the event list for cost and says how many were left out", () => {
    const many: BriefingInput = { weekOf: "2026-10-05", events: Array.from({ length: 5 }, () => input.events[3]) };
    expect(buildBriefingMessage(many, 2)).toContain("(+3 lower-priority moves not listed)");
  });
});

describe("renderBriefingEmail", () => {
  const competitors = [
    { id: "c-d", name: "Dewlane", storeId: "d" },
    { id: "c-n", name: "Northwind Knits", storeId: "n" },
    { id: "c-o", name: "Oakline Goods", storeId: "o" },
  ];
  const withIds = { ...input, events: input.events.map((e, i) => ({ ...e, eventId: `ev${i}` })) };

  it("has the meaning, one move, top moves, each competitor and the counter (E2)", () => {
    const email = renderBriefingEmail({
      input: withIds,
      interpretation: {
        topMoves: [{ headline: "Dewlane went 25% off sitewide.", whyItMatters: "" }],
        whatThisMeans: "Your category is getting promo-heavy ahead of the holidays.",
        suggestedMove: "Run a 48-hour early-access offer to your list.",
      },
      siteUrl: "https://gettrailwatch.com",
      unsubscribeUrl: "https://gettrailwatch.com/api/unsubscribe?u=1&t=x",
      movesThisMonth: 14,
      competitors,
      sentTo: "jo@glowfield.com",
    });
    expect(email.subject).toBe("Your Monday briefing: 3 competitors, 4 moves");
    for (const part of [
      "WHAT THIS MEANS FOR YOU",
      "ONE MOVE FOR THIS WEEK",
      "TOP MOVES",
      "Dewlane (3 moves · 2 high)",
      "Oakline Goods: quiet week, nothing changed.",
      "Moves caught this month: 14",
      "Sent to jo@glowfield.com",
    ]) {
      expect(email.text).toContain(part);
    }
    // Top moves open the move; "See all" opens the competitor.
    expect(email.html).toContain("https://gettrailwatch.com/competitors/c-d#move-ev1");
    expect(email.html).toContain("https://gettrailwatch.com/competitors/c-n");
    expect(email.html).toContain("https://gettrailwatch.com/api/unsubscribe?u=1&amp;t=x");
  });

  it("a week with no moves is the quiet-week email", () => {
    const email = renderBriefingEmail({
      input: { weekOf: "2026-10-05", events: [] },
      interpretation: fallbackInterpretation({ weekOf: "2026-10-05", events: [] }),
      siteUrl: "https://x.test",
      movesThisMonth: 0,
      competitors,
    });
    expect(email.subject).toBe("Your Monday briefing: a quiet week");
    expect(email.text).toContain("None of your 3 competitors made a big move.");
    expect(email.html).not.toContain("Top moves");
  });

  it("omits 'what this means' for the no-AI version", () => {
    const email = renderBriefingEmail({
      input,
      interpretation: fallbackInterpretation(input),
      siteUrl: "https://x.test",
      movesThisMonth: 4,
    });
    expect(email.text).not.toContain("WHAT THIS MEANS FOR YOU");
    expect(email.text).toContain("ONE MOVE FOR THIS WEEK");
  });
});
