// Turn a competitor URL into readable page text for the teardown. Reuses the
// SSRF-safe fetch from the lastUpdated feature and cheerio (already a dep) to
// strip HTML to text. Best-effort: homepage plus, if one is reachable, a
// pricing page. Public pages only; capped in size for LLM cost control.

import * as cheerio from "cheerio";
import { safeFetch } from "../lastUpdated/fetch";
import { validateUrlInput } from "../lastUpdated/ssrf";
import type { ExtractedSite } from "./types";

const PER_PAGE_CHARS = 6000;
const MIN_USABLE_CHARS = 200;
const PRICING_PATHS = ["/pricing", "/plans", "/price"];

// Block-level tags whose boundaries should read as a space break, so adjacent
// blocks don't mash together ("AcmeAcme…") when we flatten to text.
const BLOCK_TAGS =
  "p,div,li,ul,ol,h1,h2,h3,h4,h5,h6,section,article,header,footer,nav,main,br,tr,td,th,table,figure,blockquote";

/** Reduce a page's HTML to a title + collapsed visible text. Pure — unit-tested. */
export function htmlToText(html: string): { title: string; text: string } {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, template").remove();
  const title = ($("title").first().text().trim() || $("h1").first().text().trim()).slice(0, 200);
  // Append a space inside each block element so its text is separated from the
  // next block's; cheerio's .text() otherwise concatenates them directly.
  $(BLOCK_TAGS).append(" ");
  const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, PER_PAGE_CHARS);
  return { title, text };
}

export async function extractSite(
  rawUrl: string,
): Promise<{ ok: true; site: ExtractedSite } | { ok: false; reason: string }> {
  const parsed = validateUrlInput(rawUrl);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };

  const home = await safeFetch(parsed.url.toString());
  if (!home.ok) return { ok: false, reason: home.message };

  const homeText = htmlToText(home.html);
  const pages: ExtractedSite["pages"] = [{ label: "Homepage", text: homeText.text }];

  // Best-effort: one pricing page. Stop at the first that yields real text.
  let origin: string;
  try {
    origin = new URL(home.finalUrl).origin;
  } catch {
    origin = parsed.url.origin;
  }
  for (const path of PRICING_PATHS) {
    const res = await safeFetch(`${origin}${path}`);
    if (res.ok) {
      const t = htmlToText(res.html);
      if (t.text.length > MIN_USABLE_CHARS) {
        pages.push({ label: "Pricing", text: t.text });
        break;
      }
    }
  }

  const totalChars = pages.reduce((n, p) => n + p.text.length, 0);
  if (totalChars < MIN_USABLE_CHARS) {
    return {
      ok: false,
      reason:
        "We couldn't read enough text from that page — it may be JavaScript-only or blocking automated visitors.",
    };
  }

  return { ok: true, site: { url: home.finalUrl, title: homeText.title || origin, pages } };
}
