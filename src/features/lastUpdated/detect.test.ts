import { describe, expect, it } from "vitest";
import { detectLastUpdated } from "./detect";

describe("detectLastUpdated", () => {
  it("reads article:modified_time as a high-confidence signal", () => {
    const html = `<html><head>
      <meta property="article:modified_time" content="2026-03-14T10:00:00Z" />
    </head><body>hi</body></html>`;
    const { signals, bestGuess } = detectLastUpdated({ headers: {}, html });
    expect(bestGuess?.source).toBe("article:modified_time meta tag");
    expect(bestGuess?.confidence).toBe("high");
    expect(bestGuess?.iso).toBe("2026-03-14T10:00:00.000Z");
    expect(signals).toHaveLength(1);
  });

  it("reads dateModified from JSON-LD", () => {
    const html = `<html><head><script type="application/ld+json">
      ${JSON.stringify({ "@type": "Article", dateModified: "2025-11-02" })}
    </script></head><body></body></html>`;
    const { bestGuess } = detectLastUpdated({ headers: {}, html });
    expect(bestGuess?.source).toBe("JSON-LD dateModified");
    expect(bestGuess?.iso.startsWith("2025-11-02")).toBe(true);
  });

  it("uses the Last-Modified header when nothing better exists", () => {
    const { bestGuess } = detectLastUpdated({
      headers: { "last-modified": "Wed, 21 Oct 2026 07:28:00 GMT" },
      html: "<html><body>no meta</body></html>",
    });
    expect(bestGuess?.source).toBe("Last-Modified header");
    expect(bestGuess?.confidence).toBe("medium");
  });

  it("includes the sitemap lastmod signal", () => {
    const { signals } = detectLastUpdated({
      headers: {},
      html: "<html></html>",
      sitemapLastmod: "2026-01-15",
    });
    expect(signals.some((s) => s.source === "Sitemap lastmod")).toBe(true);
  });

  it("prefers high confidence over a more recent low-confidence date", () => {
    const html = `<html><head>
      <meta property="article:modified_time" content="2020-01-01T00:00:00Z" />
    </head><body></body></html>`;
    const { bestGuess } = detectLastUpdated({
      headers: { "last-modified": "Wed, 21 Oct 2026 07:28:00 GMT" },
      html,
    });
    // High-confidence meta wins even though the header date is newer.
    expect(bestGuess?.confidence).toBe("high");
    expect(bestGuess?.iso.startsWith("2020")).toBe(true);
  });

  it("returns no bestGuess when there is no date anywhere", () => {
    const { signals, bestGuess } = detectLastUpdated({
      headers: {},
      html: "<html><body>dynamic page, no dates</body></html>",
    });
    expect(signals).toHaveLength(0);
    expect(bestGuess).toBeNull();
  });

  it("ignores garbage dates that parse to absurd years", () => {
    const html = `<meta property="article:modified_time" content="0001-01-01" />`;
    const { signals } = detectLastUpdated({ headers: {}, html });
    expect(signals).toHaveLength(0);
  });
});
