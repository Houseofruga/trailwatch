import { describe, expect, it } from "vitest";
import { extractMainText } from "./extract";

describe("extractMainText", () => {
  it("strips scripts, nav, and footer", () => {
    const html = `
      <html><body>
        <nav>Home | Pricing | Blog</nav>
        <script>trackEvent('view');</script>
        <main><p>Business plan is $16 per user per month.</p></main>
        <footer>© 2026 Acme Inc.</footer>
      </body></html>
    `;

    const text = extractMainText(html);

    expect(text).toContain("Business plan is $16 per user per month.");
    expect(text).not.toContain("Home | Pricing | Blog");
    expect(text).not.toContain("trackEvent");
    expect(text).not.toContain("Acme Inc.");
  });

  it("prefers <main> over the rest of the body", () => {
    const html = `
      <html><body>
        <div>Sidebar content that should be ignored</div>
        <main><p>The actual pricing content.</p></main>
      </body></html>
    `;

    const text = extractMainText(html);

    expect(text).toContain("The actual pricing content.");
    expect(text).not.toContain("Sidebar content");
  });

  it("falls back to <article>, then <body>, when there's no <main>", () => {
    const articleHtml = `
      <html><body>
        <div>Ignored</div>
        <article><p>Article body text.</p></article>
      </body></html>
    `;
    expect(extractMainText(articleHtml)).toContain("Article body text.");
    expect(extractMainText(articleHtml)).not.toContain("Ignored");

    const plainHtml = "<html><body><p>Just a plain page.</p></body></html>";
    expect(extractMainText(plainHtml)).toContain("Just a plain page.");
  });

  it("separates block-level elements onto their own lines", () => {
    const html = "<body><main><p>First paragraph.</p><p>Second paragraph.</p></main></body>";

    const text = extractMainText(html);
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    expect(lines).toEqual(["First paragraph.", "Second paragraph."]);
  });
});
