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

// Excerpt of Shopify's default robots.txt (as served by allbirds.com, 2026-09-30).
const SHOPIFY_ROBOTS = [
  "User-agent: *",
  "Disallow: /admin",
  "Disallow: /cart",
  "Disallow: /checkout",
  "Disallow: /collections/*sort_by*",
  "Disallow: /*/collections/*sort_by*",
  "Disallow: /collections/*+*",
  "Disallow: */collections/*filter*&*filter*",
  "Disallow: /policies/",
  "Disallow: /*/policies/",
  "Disallow: /search",
  "Disallow: /*preview_theme_id*",
].join("\n");

describe("isPathAllowed — wildcards", () => {
  it("matches * anywhere in the rule", () => {
    expect(isPathAllowed(SHOPIFY_ROBOTS, UA, "/collections/sale?sort_by=price")).toBe(false);
    expect(isPathAllowed(SHOPIFY_ROBOTS, UA, "/en-us/collections/all?sort_by=best")).toBe(false);
    expect(isPathAllowed(SHOPIFY_ROBOTS, UA, "/?preview_theme_id=123")).toBe(false);
  });

  it("does not over-match: plain collection and catalog paths stay allowed", () => {
    expect(isPathAllowed(SHOPIFY_ROBOTS, UA, "/collections/sale")).toBe(true);
    expect(isPathAllowed(SHOPIFY_ROBOTS, UA, "/collections/all")).toBe(true);
    expect(isPathAllowed(SHOPIFY_ROBOTS, UA, "/products.json?limit=250&page=2")).toBe(true);
    expect(isPathAllowed(SHOPIFY_ROBOTS, UA, "/")).toBe(true);
  });

  it("blocks Shopify policy pages, including locale-prefixed ones", () => {
    expect(isPathAllowed(SHOPIFY_ROBOTS, UA, "/policies/shipping-policy")).toBe(false);
    expect(isPathAllowed(SHOPIFY_ROBOTS, UA, "/fr/policies/refund-policy")).toBe(false);
  });

  it("handles a rule with no leading slash and multiple wildcards", () => {
    expect(isPathAllowed(SHOPIFY_ROBOTS, UA, "/collections/x?filter.a=1&filter.b=2")).toBe(false);
    expect(isPathAllowed(SHOPIFY_ROBOTS, UA, "/collections/x?filter.a=1")).toBe(true);
  });

  it("anchors on a trailing $", () => {
    const robotsTxt = "User-agent: *\nDisallow: /*.json$";
    expect(isPathAllowed(robotsTxt, UA, "/feed.json")).toBe(false);
    expect(isPathAllowed(robotsTxt, UA, "/products.json?limit=250")).toBe(true);
  });

  it("treats regex metacharacters in rules literally", () => {
    const robotsTxt = "User-agent: *\nDisallow: /a+b(c)";
    expect(isPathAllowed(robotsTxt, UA, "/a+b(c)/x")).toBe(false);
    expect(isPathAllowed(robotsTxt, UA, "/aab")).toBe(true);
  });

  it("lets a longer Allow beat a shorter wildcard Disallow", () => {
    const robotsTxt = "User-agent: *\nDisallow: /*/policies/\nAllow: /en/policies/shipping-policy";
    expect(isPathAllowed(robotsTxt, UA, "/en/policies/shipping-policy")).toBe(true);
    expect(isPathAllowed(robotsTxt, UA, "/en/policies/refund-policy")).toBe(false);
  });
});
