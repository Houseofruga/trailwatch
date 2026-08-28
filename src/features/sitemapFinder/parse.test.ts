import { describe, expect, it } from "vitest";
import { classifySitemap, parseSitemapDeclarations } from "./parse";

describe("parseSitemapDeclarations", () => {
  it("pulls Sitemap: lines from robots.txt (case-insensitive)", () => {
    const robots = `User-agent: *\nDisallow: /admin\nSitemap: https://x.com/sitemap.xml\nsitemap:  https://x.com/news.xml`;
    expect(parseSitemapDeclarations(robots)).toEqual([
      "https://x.com/sitemap.xml",
      "https://x.com/news.xml",
    ]);
  });

  it("returns [] when there are none", () => {
    expect(parseSitemapDeclarations("User-agent: *\nDisallow:")).toEqual([]);
  });
});

describe("classifySitemap", () => {
  it("classifies a sitemap index and lists children", () => {
    const xml = `<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <sitemap><loc>https://x.com/sitemap-1.xml</loc><lastmod>2026-01-01</lastmod></sitemap>
      <sitemap><loc>https://x.com/sitemap-2.xml</loc><lastmod>2026-03-05</lastmod></sitemap>
    </sitemapindex>`;
    const r = classifySitemap(xml);
    expect(r.kind).toBe("index");
    expect(r.entryCount).toBe(2);
    expect(r.childSitemaps).toEqual(["https://x.com/sitemap-1.xml", "https://x.com/sitemap-2.xml"]);
    expect(r.lastmod).toBe("2026-03-05"); // most recent
  });

  it("classifies a urlset and counts page URLs", () => {
    const xml = `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://x.com/a</loc></url>
      <url><loc>https://x.com/b</loc><lastmod>2025-12-31</lastmod></url>
      <url><loc>https://x.com/c</loc></url>
    </urlset>`;
    const r = classifySitemap(xml);
    expect(r.kind).toBe("urlset");
    expect(r.entryCount).toBe(3);
    expect(r.childSitemaps).toEqual([]);
    expect(r.lastmod).toBe("2025-12-31");
  });

  it("returns unknown for non-sitemap XML/HTML", () => {
    expect(classifySitemap("<html><body>not a sitemap</body></html>").kind).toBe("unknown");
  });
});
