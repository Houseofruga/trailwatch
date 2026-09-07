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

  // Regression: an Allow-only "User-agent: *" record followed by another agent's
  // "Disallow: /" must NOT merge — our bot matches "*", which allows everything.
  // (Cloudflare's default managed robots.txt is shaped exactly like this and was
  // silently blocking every check.)
  it("does not inherit a following agent's disallow into an Allow-only wildcard group", () => {
    const robotsTxt = [
      "User-agent: *",
      "Content-Signal: search=yes,ai-train=no",
      "Allow: /",
      "",
      "User-agent: GPTBot",
      "Disallow: /",
      "",
      "User-agent: CCBot",
      "Disallow: /",
    ].join("\n");
    expect(isPathAllowed(robotsTxt, UA, "/")).toBe(true);
    expect(isPathAllowed(robotsTxt, UA, "/pricing")).toBe(true);
    // A named bot with its own block is still blocked.
    expect(isPathAllowed(robotsTxt, "GPTBot", "/pricing")).toBe(false);
  });

  it("lets a more specific Allow override a broader Disallow", () => {
    const robotsTxt = "User-agent: *\nDisallow: /\nAllow: /pricing";
    expect(isPathAllowed(robotsTxt, UA, "/pricing")).toBe(true);
    expect(isPathAllowed(robotsTxt, UA, "/admin")).toBe(false);
  });

  it("blocks a more specific Disallow under a broad Allow", () => {
    const robotsTxt = "User-agent: *\nAllow: /\nDisallow: /admin";
    expect(isPathAllowed(robotsTxt, UA, "/admin/users")).toBe(false);
    expect(isPathAllowed(robotsTxt, UA, "/pricing")).toBe(true);
  });
});
