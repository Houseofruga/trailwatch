import { describe, expect, it } from "vitest";
import { parseRobots, testPath } from "./matcher";

describe("testPath", () => {
  it("allows everything when robots.txt is empty", () => {
    expect(testPath("", "Googlebot", "/anything").allowed).toBe(true);
  });

  it("blocks a simple Disallow prefix", () => {
    const r = "User-agent: *\nDisallow: /admin";
    expect(testPath(r, "Googlebot", "/admin/settings").allowed).toBe(false);
    expect(testPath(r, "Googlebot", "/public").allowed).toBe(true);
  });

  it("empty Disallow means allow all", () => {
    expect(testPath("User-agent: *\nDisallow:", "Googlebot", "/x").allowed).toBe(true);
  });

  it("Allow overrides Disallow via longest match", () => {
    const r = "User-agent: *\nDisallow: /admin\nAllow: /admin/public";
    expect(testPath(r, "Googlebot", "/admin/private").allowed).toBe(false);
    expect(testPath(r, "Googlebot", "/admin/public/page").allowed).toBe(true);
  });

  it("tie between equal-length Allow and Disallow goes to Allow", () => {
    const r = "User-agent: *\nDisallow: /p\nAllow: /p";
    expect(testPath(r, "Googlebot", "/page").allowed).toBe(true);
  });

  it("supports the * wildcard", () => {
    const r = "User-agent: *\nDisallow: /*.pdf";
    expect(testPath(r, "Googlebot", "/files/report.pdf").allowed).toBe(false);
    expect(testPath(r, "Googlebot", "/files/report.html").allowed).toBe(true);
  });

  it("supports the $ end-anchor", () => {
    const r = "User-agent: *\nDisallow: /*.php$";
    expect(testPath(r, "Googlebot", "/index.php").allowed).toBe(false);
    expect(testPath(r, "Googlebot", "/index.php?id=1").allowed).toBe(true); // not anchored at end
  });

  it("selects the most specific user-agent group", () => {
    const r = "User-agent: *\nDisallow: /\n\nUser-agent: Googlebot\nAllow: /\nDisallow: /secret";
    expect(testPath(r, "Googlebot", "/anything").allowed).toBe(true); // Googlebot group, Allow: /
    expect(testPath(r, "Googlebot", "/secret").allowed).toBe(false); // more specific disallow
    expect(testPath(r, "Bingbot", "/anything").allowed).toBe(false); // falls to *, Disallow: /
  });

  it("reports which rule matched and the group", () => {
    const r = "User-agent: *\nDisallow: /admin";
    const res = testPath(r, "Googlebot", "/admin");
    expect(res.matched).toEqual({ type: "disallow", path: "/admin" });
    expect(res.groupAgent).toBe("*");
  });
});

describe("parseRobots", () => {
  it("groups consecutive user-agents together and splits after rules", () => {
    const r = "User-agent: a\nUser-agent: b\nDisallow: /x\n\nUser-agent: c\nDisallow: /y";
    const groups = parseRobots(r);
    expect(groups).toHaveLength(2);
    expect(groups[0].agents).toEqual(["a", "b"]);
    expect(groups[1].agents).toEqual(["c"]);
  });
});
