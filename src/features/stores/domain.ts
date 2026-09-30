import * as cheerio from "cheerio";
import { parse } from "tldts";
import { normalizeDomainInput } from "@/features/competitors/domain";

/**
 * The key a store is shared under: its lowercased hostname without a leading
 * "www.". Unlike competitors/domain.ts#siteOf we keep other subdomains, since a
 * store can live on one (shop.brand.com) while brand.com is a different site.
 * Null for anything that isn't a public web hostname (IPs, localhost, junk).
 */
export function canonicalStoreHost(input: string): string | null {
  const origin = normalizeDomainInput(input);
  if (!origin) return null;
  const { hostname, domain, isIp } = parse(origin);
  if (!hostname || !domain || isIp) return null;
  return hostname.toLowerCase().replace(/^www\./, "");
}

const MAX_NAME_LENGTH = 40;

/**
 * A display name for a store: the homepage's og:site_name when it looks like a
 * name, else the domain's brand part, capitalized ("dewlane.com" → "Dewlane").
 */
export function storeNameFrom(homepageHtml: string | null, host: string): string {
  if (homepageHtml) {
    const siteName = cheerio
      .load(homepageHtml)('meta[property="og:site_name"]')
      .attr("content")
      ?.trim();
    if (siteName && siteName.length <= MAX_NAME_LENGTH) return siteName;
  }
  const brand = parse(host).domainWithoutSuffix || host;
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}
