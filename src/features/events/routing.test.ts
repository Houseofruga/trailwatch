import { describe, expect, it } from "vitest";
import { deliveryFor, planInstantAlerts, type PendingAlert } from "./routing";

describe("deliveryFor", () => {
  it("low is stored only, for everyone", () => {
    expect(deliveryFor("low", "free")).toBeNull();
    expect(deliveryFor("low", "pro")).toBeNull();
  });

  it("high is instant on Starter and up, briefing on Free", () => {
    expect(deliveryFor("high", "starter")).toBe("instant");
    expect(deliveryFor("high", "pro")).toBe("instant");
    expect(deliveryFor("high", "free")).toBe("briefing");
  });

  it("normal always goes to the briefing", () => {
    expect(deliveryFor("normal", "pro")).toBe("briefing");
    expect(deliveryFor("normal", "free")).toBe("briefing");
  });
});

const NOW = new Date("2026-09-30T12:00:00Z");
const minsAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();
let seq = 0;
const alert = (storeId: string, type: PendingAlert["type"], mins: number, key?: string): PendingAlert => ({
  userEventId: `ue${++seq}`,
  storeId,
  type,
  dedupeKey: key ?? `${type}:${seq}`,
  detectedAt: minsAgo(mins),
});
const base = { now: NOW, sentToday: 0, recentKeys: new Set<string>(), cap: 5, holdMinutes: 10 };
const ids = (alerts: PendingAlert[]) => alerts.map((a) => a.userEventId).sort();

describe("planInstantAlerts", () => {
  it("bundles a store's events into one alert", () => {
    const a = [alert("dewlane", "product_launched", 30), alert("dewlane", "sale_started", 25), alert("peak", "sold_out", 20)];
    const plan = planInstantAlerts(a, base);
    expect(plan.send).toHaveLength(2);
    expect(plan.send.find((g) => g[0].storeId === "dewlane")).toHaveLength(2);
    expect(plan.hold).toEqual([]);
    expect(plan.toBriefing).toEqual([]);
  });

  it("holds a store's bundle until its burst has settled", () => {
    const settled = alert("peak", "sold_out", 30);
    const burst = [alert("dewlane", "product_launched", 12), alert("dewlane", "promo_launched", 3)];
    const plan = planInstantAlerts([settled, ...burst], base);
    expect(plan.send).toEqual([[settled]]);
    expect(ids(plan.hold)).toEqual(ids(burst));
  });

  it("caps alerts per day; overflow goes to the briefing, biggest news first", () => {
    const small = alert("a", "product_launched", 60);
    const big = alert("b", "sitewide_sale_detected", 50);
    const busy = [alert("c", "product_launched", 40), alert("c", "sold_out", 40)];
    const plan = planInstantAlerts([small, big, ...busy], { ...base, cap: 5, sentToday: 3 });
    expect(plan.send.map((g) => g[0].storeId)).toEqual(["b", "c"]);
    expect(plan.toBriefing).toEqual([small]);
  });

  it("sends nothing once the cap is used up", () => {
    const plan = planInstantAlerts([alert("a", "product_launched", 60)], { ...base, sentToday: 5 });
    expect(plan.send).toEqual([]);
    expect(plan.toBriefing).toHaveLength(1);
  });

  it("dedupes news already alerted recently, and repeats within the batch", () => {
    const repeat = alert("dewlane", "sale_started", 30, "sale_started:42");
    const first = alert("peak", "sale_started", 40, "sale_started:7");
    const again = alert("peak", "sale_started", 20, "sale_started:7");
    const plan = planInstantAlerts([repeat, first, again], { ...base, recentKeys: new Set(["sale_started:42"]) });
    expect(plan.send).toEqual([[first]]);
    expect(ids(plan.toBriefing)).toEqual(ids([repeat, again]));
  });
});
