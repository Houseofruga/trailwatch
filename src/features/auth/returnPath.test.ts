import { describe, expect, it } from "vitest";
import { returnPath } from "./returnPath";

describe("returnPath", () => {
  it("keeps a link into the app, with its query and anchor", () => {
    expect(returnPath("/competitors/abc-123?from=alert#move-9f2")).toBe("/competitors/abc-123?from=alert#move-9f2");
    expect(returnPath("/settings#briefing")).toBe("/settings#briefing");
    expect(returnPath("/opportunities/dismissed")).toBe("/opportunities/dismissed");
    expect(returnPath("/dashboard")).toBe("/dashboard");
  });

  it("refuses anything that could leave the site", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/competitors//evil.example", "/\\evil.example", "/competitors/a\\b", "javascript:alert(1)"]) {
      expect(returnPath(bad), bad).toBeNull();
    }
  });

  it("refuses pages outside the app, and junk", () => {
    for (const bad of ["/", "/login", "/admin", "/welcome", "/dashboardx", "/api/cron/catalog", "", null, undefined, 3, "/competitors/" + "a".repeat(600)]) {
      expect(returnPath(bad), String(bad)).toBeNull();
    }
  });
});
