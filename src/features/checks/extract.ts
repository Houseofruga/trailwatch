import * as cheerio from "cheerio";

// SPEC.md F3.2: "readability-style extraction; strip nav/footer/scripts."
// Anything in this list is chrome, not content, on essentially every page.
const STRIP_SELECTORS = [
  "script",
  "style",
  "noscript",
  "nav",
  "header",
  "footer",
  "svg",
  "iframe",
  "form",
  '[aria-hidden="true"]',
];

// cheerio's .text() concatenates text nodes with no separation, so without
// this, paragraphs would run together into one unbroken line. Injecting a
// newline after each block-level element preserves the paragraph structure
// that the noise filter's line-by-line diff depends on.
const BLOCK_SELECTORS =
  "p, br, div, li, h1, h2, h3, h4, h5, h6, tr, blockquote, section, article";

/**
 * HTML -> raw main-content text, one rough "line" per block element.
 * Not normalized yet — see normalize.ts for whitespace collapsing and
 * volatile-boilerplate stripping.
 */
export function extractMainText(html: string): string {
  const $ = cheerio.load(html);
  $(STRIP_SELECTORS.join(",")).remove();

  const root = $("main").first().length
    ? $("main").first()
    : $("article").first().length
      ? $("article").first()
      : $("body");

  root.find(BLOCK_SELECTORS).each((_, el) => {
    $(el).after("\n");
  });

  return root.text();
}
