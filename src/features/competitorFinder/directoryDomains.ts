// Directory / aggregator / social domains that live-search (Exa) routinely
// surfaces when asked for a company's competitors — a LinkedIn company page, a
// Crunchbase or G2 profile, a Wikipedia article — because they rank highly. None
// of them is ever a SaaS competitor's own homepage, so they must not become a
// competitor's tracked URL: if one did and the user selected it as-is, TrailWatch
// would baseline and monitor (say) that LinkedIn page instead of the competitor,
// reporting changes that have nothing to do with them.
//
// We match on the registrable domain and any subdomain of it (so
// `www.linkedin.com` and `in.linkedin.com` both count). The competitor NAME the
// model found is usually right — only the domain is junk — so callers blank the
// URL and keep the name, exactly like a DNS-unresolvable guess.
const DIRECTORY_DOMAINS = new Set<string>([
  // Professional / social networks
  "linkedin.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "youtube.com",
  "tiktok.com",
  "reddit.com",
  "medium.com",
  "pinterest.com",
  // Company / funding directories
  "crunchbase.com",
  "pitchbook.com",
  "tracxn.com",
  "owler.com",
  "zoominfo.com",
  "glassdoor.com",
  "indeed.com",
  "bloomberg.com",
  // Software review / listing sites
  "g2.com",
  "capterra.com",
  "getapp.com",
  "softwareadvice.com",
  "trustradius.com",
  "trustpilot.com",
  "producthunt.com",
  "alternativeto.net",
  "saasworthy.com",
  "slashdot.org",
  "sourceforge.net",
  // Reference / general
  "wikipedia.org",
  "wikimedia.org",
  "gartner.com",
  "forbes.com",
  "techcrunch.com",
]);

// Bare (registrable) domain check: strips a leading `www.`, then treats the input
// as directory if it equals a listed domain or is a subdomain of one.
export function isDirectoryDomain(domain: string): boolean {
  const host = domain.trim().toLowerCase().replace(/^www\./, "");
  if (!host) return false;
  if (DIRECTORY_DOMAINS.has(host)) return true;
  for (const d of DIRECTORY_DOMAINS) {
    if (host.endsWith(`.${d}`)) return true;
  }
  return false;
}
