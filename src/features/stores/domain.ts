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

// "Boll & Branch" → "bollandbranch", to compare a name with a domain.
const squash = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");

/**
 * A display name for a store: the homepage's og:site_name when it looks like a
 * name; else the brand segment of the page title ("Luxury Bedding | Boll &
 * Branch") when it matches the domain; else the domain's brand part,
 * capitalized ("dewlane.com" → "Dewlane").
 */
export function storeNameFrom(homepageHtml: string | null, host: string): string {
  const brand = parse(host).domainWithoutSuffix || host;
  if (homepageHtml) {
    const $ = cheerio.load(homepageHtml);
    const siteName = $('meta[property="og:site_name"]').attr("content")?.trim();
    if (siteName && siteName.length <= MAX_NAME_LENGTH) return siteName;

    const titles = [$("title").first().text(), $('meta[property="og:title"]').attr("content") ?? ""];
    for (const title of titles) {
      for (const part of title.split(/\s[|–—-]\s/)) {
        const name = part.trim();
        const key = squash(name);
        // The whole brand ("Boll & Branch") or its leading word ("Parachute" for parachutehome.com).
        if (name && name.length <= MAX_NAME_LENGTH && key.length >= 3 && (key === squash(brand) || squash(brand).startsWith(key))) {
          return name;
        }
      }
    }
  }
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}
