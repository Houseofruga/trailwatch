import { describe, it, expect } from "vitest";
import { parseCompetitors, EMPTY_SENTINEL } from "./prompt";

describe("parseCompetitors", () => {
  it("parses a valid competitor list", () => {
    const raw = JSON.stringify({
      competitors: [
        { name: "Linear", url: "linear.app", why: "Issue tracking for teams" },
        { name: "Asana", url: "asana.com", why: "Work management" },
      ],
    });
    const out = parseCompetitors(raw);
    expect(out).toEqual([
      { name: "Linear", url: "linear.app", why: "Issue tracking for teams" },
      { name: "Asana", url: "asana.com", why: "Work management" },
    ]);
  });

  it("pulls JSON out of surrounding prose/fences", () => {
    const raw = 'Here you go:\n```json\n{"competitors":[{"name":"Notion","url":"notion.so","why":"Docs"}]}\n```';
    expect(parseCompetitors(raw)).toEqual([
      { name: "Notion", url: "notion.so", why: "Docs" },
    ]);
  });

  it("caps the list at 4", () => {
    const raw = JSON.stringify({
      competitors: Array.from({ length: 7 }, (_, i) => ({
        name: `Co${i}`,
        url: `co${i}.com`,
        why: "x",
      })),
    });
    expect(parseCompetitors(raw)).toHaveLength(4);
  });

  it("drops junk entries and keeps the good ones", () => {
    const raw = JSON.stringify({
      competitors: [
        { name: "", url: "empty.com", why: "no name" },
        { name: "Valid", url: "valid.com", why: "kept" },
        "not-an-object",
        { url: "noname.com" },
      ],
    });
    expect(parseCompetitors(raw)).toEqual([
      { name: "Valid", url: "valid.com", why: "kept" },
    ]);
  });

  it("returns null on the empty sentinel", () => {
    expect(parseCompetitors(EMPTY_SENTINEL)).toBeNull();
  });

  it("returns null on non-JSON and on an empty list", () => {
    expect(parseCompetitors("sorry, I can't help")).toBeNull();
    expect(parseCompetitors(JSON.stringify({ competitors: [] }))).toBeNull();
    expect(parseCompetitors("")).toBeNull();
  });
});
