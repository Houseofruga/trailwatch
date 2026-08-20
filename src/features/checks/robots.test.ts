import { describe, expect, it } from "vitest";
import { isPathAllowed } from "./robots";

const UA = "TrailwatchBot/1.0 (+https://trailwatch.houseofruga.com)";

describe("isPathAllowed", () => {
  it("blocks everything under a wildcard disallow-all", () => {
    const robotsTxt = "User-agent: *\nDisallow: /";
    expect(isPathAllowed(robotsTxt, UA, "/pricing")).toBe(false);
  });

  it("blocks only the disallowed path prefix", () => {
    const robotsTxt = "User-agent: *\nDisallow: /admin";
    expect(isPathAllowed(robotsTxt, UA, "/admin/users")).toBe(false);
    expect(isPathAllowed(robotsTxt, UA, "/pricing")).toBe(true);
  });

  it("defaults to allowed when no group matches", () => {
    const robotsTxt = "User-agent: GoogleBot\nDisallow: /";
    expect(isPathAllowed(robotsTxt, UA, "/pricing")).toBe(true);
  });

  it("defaults to allowed on an empty Disallow value", () => {
    const robotsTxt = "User-agent: *\nDisallow:";
    expect(isPathAllowed(robotsTxt, UA, "/pricing")).toBe(true);
  });

  it("defaults to allowed on empty robots.txt", () => {
    expect(isPathAllowed("", UA, "/pricing")).toBe(true);
  });
});
