import { describe, it, expect } from "vitest";
import { buildDigests, type RawUser } from "./build";

const NOW = Date.parse("2026-08-21T12:00:00Z");
const recent = "2026-08-20T12:00:00Z"; // 1 day ago
const old = "2026-08-01T12:00:00Z"; // ~20 days ago

function user(overrides: Partial<RawUser> = {}): RawUser {
  return { id: "u1", email: "a@example.com", competitors: [], ...overrides };
}

describe("buildDigests", () => {
  it("includes a recent meaningful change, grouped by competitor", () => {
    const digests = buildDigests(
      [
        user({
          competitors: [
            {
              name: "Acme",
              pages: [
                {
                  label: "Pricing",
                  url: "https://acme.com/pricing",
                  changes: [{ summary: "Price rose to $25", is_meaningful: true, detected_at: recent }],
                },
              ],
            },
          ],
        }),
      ],
      NOW,
    );

    expect(digests).toHaveLength(1);
    expect(digests[0].changeCount).toBe(1);
    expect(digests[0].competitors[0].name).toBe("Acme");
    expect(digests[0].competitors[0].lines[0].summary).toBe("Price rose to $25");
    expect(digests[0].competitors[0].lines[0].pageLabel).toBe("Pricing");
  });

  it("drops trivial changes, changes older than 7 days, and users with nothing", () => {
    const digests = buildDigests(
      [
        user({
          id: "trivial",
          competitors: [
            {
              name: "Acme",
              pages: [
                { label: "P", url: "u", changes: [{ summary: "x", is_meaningful: false, detected_at: recent }] },
              ],
            },
          ],
        }),
        user({
          id: "stale",
          competitors: [
            {
              name: "Acme",
              pages: [
                { label: "P", url: "u", changes: [{ summary: "x", is_meaningful: true, detected_at: old }] },
              ],
            },
          ],
        }),
        user({ id: "empty", competitors: [] }),
      ],
      NOW,
    );

    expect(digests).toHaveLength(0);
  });

  it("falls back to a plain sentence when a meaningful change has no summary", () => {
    const digests = buildDigests(
      [
        user({
          competitors: [
            {
              name: "Acme",
              pages: [
                { label: "P", url: "u", changes: [{ summary: null, is_meaningful: true, detected_at: recent }] },
              ],
            },
          ],
        }),
      ],
      NOW,
    );

    expect(digests[0].competitors[0].lines[0].summary).toMatch(/changed meaningfully/i);
  });

  it("orders lines newest first within a competitor", () => {
    const older = "2026-08-19T12:00:00Z";
    const digests = buildDigests(
      [
        user({
          competitors: [
            {
              name: "Acme",
              pages: [
                {
                  label: "P",
                  url: "u",
                  changes: [
                    { summary: "older", is_meaningful: true, detected_at: older },
                    { summary: "newer", is_meaningful: true, detected_at: recent },
                  ],
                },
              ],
            },
          ],
        }),
      ],
      NOW,
    );

    expect(digests[0].competitors[0].lines.map((l) => l.summary)).toEqual(["newer", "older"]);
  });
});
