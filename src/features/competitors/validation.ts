import { z } from "zod";
import { PAGE_TYPE_VALUES } from "./pageTypes";

// A registrable public domain: the hostname must end in a dot + a ≥2-letter TLD.
// Rejects dotless hosts ("asdf", "localhost"), raw IPs (192.168.0.1 → last label
// "1"), and 1-char TLDs ("x.c") — none of which can resolve to a page we'd watch.
function hasPublicDomain(v: string): boolean {
  try {
    return /\.[a-z]{2,}$/i.test(new URL(v).hostname);
  } catch {
    return false;
  }
}

// Only http(s) URLs — never file://, javascript:, etc. Matches SPEC.md's
// "validate all external input" and "only fetch public pages" constraints.
export const pageUrl = z
  .url("Enter a full URL, like https://example.com/pricing")
  .refine((v) => /^https?:\/\//i.test(v), "URL must start with http:// or https://")
  .refine(hasPublicDomain, "Check the web address — the domain needs an ending like .com");

export const pageLabel = z
  .string()
  .trim()
  .min(1, "Give the page a label, like Pricing.")
  .max(40, "Keep the label under 40 characters.");

export const competitorName = z
  .string()
  .trim()
  .min(1, "Give the competitor a name.")
  .max(80, "Keep the name under 80 characters.");

// The page's type — the dashboard grouping key. Defaults to "other" so callers
// that don't yet collect a type (older forms, onboarding pre-seed) still parse.
export const pageType = z.enum(PAGE_TYPE_VALUES).default("other");

export const pageRow = z.object({ url: pageUrl, label: pageLabel, pageType });
