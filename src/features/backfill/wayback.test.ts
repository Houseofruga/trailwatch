import { describe, it, expect } from "vitest";
import { cdxTimestampToIso, parseCaptures } from "./wayback";

describe("cdxTimestampToIso", () => {
  it("converts a 14-digit CDX timestamp to ISO", () => {
    expect(cdxTimestampToIso("20260115093000")).toBe("2026-01-15T09:30:00.000Z");
  });

  it("rejects malformed / short timestamps", () => {
    expect(cdxTimestampToIso("2026")).toBeNull();
    expect(cdxTimestampToIso("")).toBeNull();
    expect(cdxTimestampToIso("notatimestamp!")).toBeNull();
    expect(cdxTimestampToIso("20261301000000")).toBeNull(); // month 13
  });
});

// CDX JSON: first row is the column header, then one row per capture.
function cdx(rows: string[][]): string {
  return JSON.stringify([["timestamp", "digest", "statuscode"], ...rows]);
}

describe("parseCaptures", () => {
  it("returns [] for empty, malformed, or header-only bodies", () => {
    expect(parseCaptures("", 4)).toEqual([]);
    expect(parseCaptures("not json", 4)).toEqual([]);
    expect(parseCaptures(JSON.stringify([]), 4)).toEqual([]);
    expect(parseCaptures(JSON.stringify([["timestamp", "digest"]]), 4)).toEqual([]);
  });

  it("parses captures oldest→newest and drops duplicate timestamps", () => {
    const body = cdx([
      ["20260101000000", "AAA", "200"],
      ["20260201000000", "BBB", "200"],
      ["20260201000000", "BBB", "200"], // dup timestamp
    ]);
    const out = parseCaptures(body, 4);
    expect(out.map((c) => c.timestamp)).toEqual(["20260101000000", "20260201000000"]);
    expect(out[0].date).toBe("2026-01-01T00:00:00.000Z");
  });

  it("keeps only the most recent `cap` captures, still chronological", () => {
    const body = cdx([
      ["20260101000000", "A", "200"],
      ["20260201000000", "B", "200"],
      ["20260301000000", "C", "200"],
      ["20260401000000", "D", "200"],
      ["20260501000000", "E", "200"],
    ]);
    const out = parseCaptures(body, 3);
    expect(out.map((c) => c.timestamp)).toEqual([
      "20260301000000",
      "20260401000000",
      "20260501000000",
    ]);
  });

  it("skips rows with unparseable timestamps", () => {
    const body = cdx([
      ["oops", "A", "200"],
      ["20260201000000", "B", "200"],
    ]);
    expect(parseCaptures(body, 4).map((c) => c.timestamp)).toEqual(["20260201000000"]);
  });
});
