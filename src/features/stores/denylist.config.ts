import { parse } from "tldts";

// Marketplaces we don't track. A competitor must be the brand's own Shopify store.
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
  "flipkart.com",
  "myntra.com",
  "nykaa.com",
  "ajio.com",
  "meesho.com",
  "snapdeal.com",
  "tatacliq.com",
  "jiomart.com",
];

export const MARKETPLACE_MESSAGE = "That's a marketplace. Add the brand's own Shopify store instead.";

export function isMarketplace(hostOrUrl: string): boolean {
  const { domain, domainWithoutSuffix } = parse(hostOrUrl);
  if (!domain) return false;
  return MARKETPLACE_DENYLIST.some((entry) =>
    entry.endsWith(".*") ? domainWithoutSuffix === entry.slice(0, -2) : domain === entry,
  );
}
