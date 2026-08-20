import { z } from "zod";

// Only http(s) URLs — never file://, javascript:, etc. Matches SPEC.md's
// "validate all external input" and "only fetch public pages" constraints.
export const pageUrl = z
  .url("Enter a full URL, like https://example.com/pricing")
  .refine((v) => /^https?:\/\//i.test(v), "URL must start with http:// or https://");

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

export const pageRow = z.object({ url: pageUrl, label: pageLabel });
