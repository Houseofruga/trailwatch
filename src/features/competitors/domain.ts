// Shared by the add flow (one domain per competitor) and the edit page
// (previewing/rewriting every page's URL against a shared domain field).

import { getDomain } from "tldts";

export function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// The registrable domain (eTLD+1) of a URL: the "site" a page belongs to,
// ignoring subdomains. www.tryprofound.com and docs.tryprofound.com both map to
// "tryprofound.com", while multi-part TLDs (foo.co.uk) resolve correctly via the
// Public Suffix List rather than a naive last-two-labels guess.
export function siteOf(urlOrHost: string): string | null {
  return getDomain(urlOrHost.trim()) ?? null;
}

// Two URLs belong to the same competitor when they share a registrable domain,
// so subdomains of one site (www., docs., app.) count as the same competitor.
export function sameSite(urlA: string, urlB: string): boolean {
  const a = siteOf(urlA);
  const b = siteOf(urlB);
  return a !== null && a === b;
}

// Accepts a bare domain ("vercel.com") or a full URL — the edit page's
// domain field shouldn't force users to type "https://".
export function normalizeDomainInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const direct = originOf(trimmed);
  if (direct) return direct;

  return originOf(`https://${trimmed}`);
}

export function sameOrigin(urlA: string, urlB: string): boolean {
  const a = originOf(urlA);
  const b = originOf(urlB);
  return a !== null && a === b;
}

// Swaps the scheme+host on `url` for `newOrigin`'s, keeping path/query/hash
// intact — lets the edit page's domain field move every page at once
// without the reader having to retype each URL.
export function replaceUrlHost(url: string, newOrigin: string): string {
  const target = new URL(url);
  const next = new URL(newOrigin);
  target.protocol = next.protocol;
  target.host = next.host;
  return target.toString();
}
