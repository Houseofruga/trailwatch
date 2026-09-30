import { parse } from "tldts";

// Marketplaces we don't track (yet). A competitor must be the brand's own store.
// An entry ending in ".*" matches that name on any public suffix (amazon.co.uk,
// ebay.de); anything else is an exact registrable domain (subdomains included).
export const MARKETPLACE_DENYLIST = [
  "amazon.*",
  "walmart.com",
  "target.com",
  "ebay.*",
  "etsy.com",
  "aliexpress.com",
  "temu.com",
];

export const MARKETPLACE_MESSAGE =
  "Add the brand's own website instead; marketplace tracking is coming soon.";

export function isMarketplace(hostOrUrl: string): boolean {
  const { domain, domainWithoutSuffix } = parse(hostOrUrl);
  if (!domain) return false;
  return MARKETPLACE_DENYLIST.some((entry) =>
    entry.endsWith(".*") ? domainWithoutSuffix === entry.slice(0, -2) : domain === entry,
  );
}
