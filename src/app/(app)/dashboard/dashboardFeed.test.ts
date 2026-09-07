import { describe, it, expect } from "vitest";
import { activeChanges } from "./dashboardFeed";
import type { CompetitorRow } from "@/features/competitors/queries";

type Page = CompetitorRow["pages"][number];

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = Date.parse("2026-09-07T12:00:00Z");

function page(changes: Page["changes"]): Page {
  return {
    id: "p1",
    url: "https://example.com",
    label: "Homepage",
    isActive: true,
    lastCheckedAt: null,
    lastCheckStatus: "ok",
    lastCheckError: null,
    backfilledAt: null,
    changes,
    lastArchived: null,
  };
}

// changes arrive newest-first from the query (detected_at desc).
describe("activeChanges", () => {
  it("returns every meaningful change from this week, newest first", () => {
    const p = page([
      { id: "c1", summary: "Newest", isMeaningful: true, detectedAt: new Date(NOW - 2 * HOUR).toISOString() },
      { id: "c2", summary: "Older", isMeaningful: true, detectedAt: new Date(NOW - 3 * DAY).toISOString() },
      { id: "c3", summary: "Trivial", isMeaningful: false, detectedAt: new Date(NOW - 1 * DAY).toISOString() },
      { id: "c4", summary: "Last month", isMeaningful: true, detectedAt: new Date(NOW - 30 * DAY).toISOString() },
    ]);
    expect(activeChanges(p, NOW).map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  it("is empty when nothing meaningful landed this week", () => {
    const p = page([
      { id: "c1", summary: "Trivial", isMeaningful: false, detectedAt: new Date(NOW - 1 * HOUR).toISOString() },
      { id: "c2", summary: "Old", isMeaningful: true, detectedAt: new Date(NOW - 20 * DAY).toISOString() },
    ]);
    expect(activeChanges(p, NOW)).toEqual([]);
  });
});
