import { describe, it, expect } from "vitest";
import { buildDigests, MAX_CHANGES_PER_PAGE, MAX_COMPETITORS, type RawUser, type RawChange } from "./build";

const NOW = Date.parse("2026-08-21T12:00:00Z");
const recent = "2026-08-20T12:00:00Z"; // 1 day ago
const older = "2026-08-19T12:00:00Z"; // 2 days ago
const old = "2026-08-01T12:00:00Z"; // ~20 days ago

function user(overrides: Partial<RawUser> = {}): RawUser {
  return { id: "u1", email: "a@example.com", competitors: [], ...overrides };
}

function change(over: Partial<RawChange> = {}): RawChange {
  return { summary: "A change", is_meaningful: true, detected_at: recent, ...over };
}

describe("buildDigests", () => {
  it("groups competitor → page → change with domain, initials, and counts", () => {
    const digests = buildDigests(
      [
        user({
          competitors: [
            {
              name: "Acme Corp",
              pages: [
                {
                  label: "Pricing",
                  url: "https://www.acme.com/pricing",
                  page_type: "pricing",
                  changes: [change({ summary: "Price rose to $25", id: "c1" })],
                },
                {
                  label: "Home",
                  url: "https://acme.com/",
                  page_type: "homepage",
                  changes: [change({ summary: "New hero", id: "c2", detected_at: older })],
                },
              ],
            },
          ],
        }),
      ],
      NOW,
    );

    expect(digests).toHaveLength(1);
    const d = digests[0];
    expect(d.changeCount).toBe(2);
    expect(d.competitorCount).toBe(1);
    const c = d.competitors[0];
    expect(c.name).toBe("Acme Corp");
    expect(c.domain).toBe("acme.com"); // registrable host, www stripped
    expect(c.initials).toBe("AC");
    expect(c.changeCount).toBe(2);
    // Freshest page first (pricing @recent before homepage @older).
    expect(c.pages.map((p) => p.typeLabel)).toEqual(["Pricing", "Homepage"]);
    expect(c.pages[0].path).toBe("/pricing");
    expect(c.pages[1].path).toBe("/");
    expect(c.pages[0].changes[0].summary).toBe("Price rose to $25");
    expect(c.pages[0].changes[0].changeId).toBe("c1");
  });

  it("maps the paid plan to 'pro' and defaults to 'free'", () => {
    const mk = (plan?: string) =>
      buildDigests(
        [
          user({
            plan,
            competitors: [{ name: "A", pages: [{ label: "P", url: "https://a.com/p", changes: [change()] }] }],
          }),
        ],
        NOW,
      )[0];
    expect(mk("paid").plan).toBe("pro");
    expect(mk("free").plan).toBe("free");
    expect(mk(undefined).plan).toBe("free");
  });

  it("counts trivial edits filtered this week without emailing them", () => {
    const digests = buildDigests(
      [
        user({
          competitors: [
            {
              name: "Acme",
              pages: [
                {
                  label: "P",
                  url: "https://a.com/p",
                  changes: [
                    change({ summary: "real", is_meaningful: true }),
                    change({ summary: "noise", is_meaningful: false }),
                    change({ summary: "noise2", is_meaningful: false }),
                  ],
                },
              ],
            },
          ],
        }),
      ],
      NOW,
    );

    expect(digests[0].changeCount).toBe(1);
    expect(digests[0].trivialFiltered).toBe(2);
  });

  it("caps changes shown per page and reports the remainder", () => {
    // All within the 7-day window ending Aug 29 (Aug 25–28).
    const many: RawChange[] = Array.from({ length: MAX_CHANGES_PER_PAGE + 2 }, (_, i) =>
      change({ summary: `change ${i}`, detected_at: `2026-08-2${5 + i}T12:00:00Z` }),
    );
    const digests = buildDigests(
      [user({ competitors: [{ name: "A", pages: [{ label: "P", url: "https://a.com/p", changes: many }] }] })],
      Date.parse("2026-08-29T12:00:00Z"),
    );
    const page = digests[0].competitors[0].pages[0];
    expect(page.changes).toHaveLength(MAX_CHANGES_PER_PAGE);
    expect(page.moreCount).toBe(2);
    // changeCount still reflects the true total, not the capped display.
    expect(digests[0].competitors[0].changeCount).toBe(MAX_CHANGES_PER_PAGE + 2);
  });

  it("caps competitors shown and summarizes the hidden ones, most active first", () => {
    const competitors = Array.from({ length: MAX_COMPETITORS + 2 }, (_, i) => ({
      name: `C${i}`,
      // C0 has the most changes, C1 next, ... so ordering is deterministic.
      pages: [
        {
          label: "P",
          url: `https://c${i}.com/p`,
          changes: Array.from({ length: MAX_COMPETITORS + 2 - i }, () => change()),
        },
      ],
    }));
    const digests = buildDigests([user({ competitors })], NOW);
    const d = digests[0];
    expect(d.competitors).toHaveLength(MAX_COMPETITORS);
    expect(d.competitors[0].name).toBe("C0"); // most active first
    expect(d.hiddenCompetitorCount).toBe(2);
    expect(d.hiddenChangeCount).toBeGreaterThan(0);
    expect(d.summaryStrip).toHaveLength(MAX_COMPETITORS + 2); // strip lists every competitor
    expect(d.showSummaryStrip).toBe(true);
  });

  it("lists pages that couldn't be reached this week", () => {
    const digests = buildDigests(
      [
        user({
          competitors: [
            {
              name: "Acme",
              pages: [
                { label: "P", url: "https://a.com/p", changes: [change()] },
                { label: "Broken", url: "https://a.com/pricing", last_check_status: "broken", changes: [] },
              ],
            },
          ],
        }),
      ],
      NOW,
    );
    expect(digests[0].unreachable).toEqual([{ competitor: "Acme", path: "/pricing" }]);
  });

  it("uses a plain fallback sentence when a meaningful change has no summary", () => {
    const digests = buildDigests(
      [user({ competitors: [{ name: "A", pages: [{ label: "P", url: "https://a.com/p", changes: [change({ summary: null })] }] }] })],
      NOW,
    );
    const ch = digests[0].competitors[0].pages[0].changes[0];
    expect(ch.summary).toMatch(/open it to see/i);
    expect(ch.isFallback).toBe(true);
  });

  it("drops trivial-only, stale, and empty users", () => {
    const digests = buildDigests(
      [
        user({ id: "trivial", competitors: [{ name: "A", pages: [{ label: "P", url: "https://a.com/p", changes: [change({ is_meaningful: false })] }] }] }),
        user({ id: "stale", competitors: [{ name: "A", pages: [{ label: "P", url: "https://a.com/p", changes: [change({ detected_at: old })] }] }] }),
        user({ id: "empty", competitors: [] }),
      ],
      NOW,
    );
    expect(digests).toHaveLength(0);
  });

  it("never emails archive-backfilled changes, even if recently dated", () => {
    const digests = buildDigests(
      [user({ competitors: [{ name: "A", pages: [{ label: "P", url: "https://a.com/p", changes: [change({ source: "archive" })] }] }] })],
      NOW,
    );
    expect(digests).toEqual([]);
  });

  it("does not show the summary strip for a small week", () => {
    const digests = buildDigests(
      [user({ competitors: [{ name: "A", pages: [{ label: "P", url: "https://a.com/p", changes: [change()] }] }] })],
      NOW,
    );
    expect(digests[0].showSummaryStrip).toBe(false);
  });
});
