import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { renderBriefingEmail } from "@/features/briefing/render";
import { foundingOffer, OFFER_LINE } from "./offer";
import { ratingUrl, ratingUrls, verifyRating } from "./ratings";
import { summarizeRatings } from "./report";
import { renderWelcomeEmail } from "./welcome";

const U = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("founding-member offer", () => {
  it("is 10% on joining and 40% after 3 calls, locked in once earned", () => {
    expect(foundingOffer(true, 0)).toMatchObject({ discountPct: 10, maxPct: 40, callsDone: 0, unlocked: false });
    expect(foundingOffer(true, 2)).toMatchObject({ discountPct: 10, callsDone: 2 });
    expect(foundingOffer(true, 3)).toMatchObject({ discountPct: 40, unlocked: true });
    expect(foundingOffer(true, 7)).toMatchObject({ discountPct: 40, callsDone: 3 });
    expect(foundingOffer(false, 3)).toMatchObject({ discountPct: 0, maxPct: 0, unlocked: false });
  });

  it("states the condition next to the headline", () => {
    expect(OFFER_LINE).toBe("Up to 40% off for life as a beta member: 10% when you join, plus 30% more after 3 short feedback calls with the founder.");
  });
});

describe("rating links", () => {
  const saved = process.env.UNSUBSCRIBE_SECRET;
  beforeEach(() => {
    process.env.UNSUBSCRIBE_SECRET = "test-secret";
  });
  afterEach(() => {
    process.env.UNSUBSCRIBE_SECRET = saved;
  });

  it("are signed, and can't be reused for another user, item or answer", () => {
    const url = new URL(ratingUrl("https://example.test", { userId: U, target: "briefing", id: B, value: "useful" })!);
    const t = url.searchParams.get("t")!;
    expect(url.pathname).toBe("/rate");
    expect(verifyRating({ userId: U, target: "briefing", id: B, value: "useful" }, t)).toBe(true);
    expect(verifyRating({ userId: U, target: "briefing", id: B, value: "not_useful" }, t)).toBe(false);
    expect(verifyRating({ userId: B, target: "briefing", id: B, value: "useful" }, t)).toBe(false);
    expect(verifyRating({ userId: U, target: "alert", id: B, value: "useful" }, t)).toBe(false);
  });

  it("are left out when there's no secret", () => {
    const cron = process.env.CRON_SECRET;
    delete process.env.UNSUBSCRIBE_SECRET;
    delete process.env.CRON_SECRET;
    expect(ratingUrls("https://example.test", U, "alert", B)).toBeNull();
    process.env.CRON_SECRET = cron;
  });

  it("show up at the bottom of the Monday briefing", () => {
    const email = renderBriefingEmail({
      input: { weekOf: "2026-10-05", events: [] },
      interpretation: { topMoves: [], whatThisMeans: null, suggestedMove: "" },
      siteUrl: "https://example.test",
      movesThisMonth: 0,
      competitors: [{ id: "c1", name: "Fernwood", storeId: "s1" }],
      rating: ratingUrls("https://example.test", U, "briefing", B),
    });
    expect(email.html).toContain("Was this briefing useful?");
    expect(email.text).toMatch(/Was this briefing useful\? Yes: https:\/\/example\.test\/rate\?/);
  });
});

describe("founder welcome email", () => {
  it("tells founding members the offer, and links the booking page when there is one", () => {
    const founding = renderWelcomeEmail({ founding: true, booking: "https://cal.example/founder" });
    expect(founding.text).toContain("You're one of our first 25 beta members");
    expect(founding.text).toContain("10% is already yours, and 30% more unlocks after 3 short feedback calls with me.");
    expect(founding.text).toContain("https://cal.example/founder");
    expect(founding.html).toContain('href="https://cal.example/founder"');
  });

  it("leaves the offer and booking out when they don't apply", () => {
    const plain = renderWelcomeEmail({ founding: false, booking: null });
    expect(plain.text).not.toContain("beta members");
    expect(plain.text).not.toContain("grab 20 minutes");
    expect(plain.text).toContain("who do you compete with most? Just hit reply.");
  });
});

describe("admin rating summary", () => {
  it("counts useful and not useful per kind", () => {
    expect(
      summarizeRatings([
        { target_type: "briefing", value: "useful" },
        { target_type: "briefing", value: "not_useful" },
        { target_type: "alert", value: "useful" },
      ]),
    ).toEqual([
      { target: "briefing", useful: 1, notUseful: 1 },
      { target: "alert", useful: 1, notUseful: 0 },
    ]);
  });
});
