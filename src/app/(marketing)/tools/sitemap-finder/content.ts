// Copy for the Sitemap Finder page. FAQ feeds both the visible section and the
// FAQPage JSON-LD so they stay in sync.

export const GUIDE: Array<{ heading: string; body: string }> = [
  {
    heading: "What a sitemap is (and why it matters)",
    body: "A sitemap is an XML file listing the pages on a site that its owner wants search engines to find. Checking one is the fastest way to see how big a site is, which pages it considers important, and when they were last updated — useful for SEO audits, site migrations, and sizing up a competitor.",
  },
  {
    heading: "1. Try /sitemap.xml",
    body: "The most common location is yoursite.com/sitemap.xml. Many platforms put it there by default. If that 404s, the sitemap may live elsewhere — which is why this tool also checks robots.txt and other common paths for you.",
  },
  {
    heading: "2. Check robots.txt",
    body: "A site's robots.txt file (at yoursite.com/robots.txt) usually declares its sitemaps with a line like “Sitemap: https://…”. This is the authoritative place to look, because it's where the site owner tells crawlers exactly where to find them. The tool reads these declarations automatically.",
  },
  {
    heading: "3. Understand sitemap index files",
    body: "Large sites split their URLs across many sitemaps and tie them together with a sitemap index — a sitemap of sitemaps. The tool detects an index, expands it one level, and adds up the URLs across the child sitemaps so you get a real total.",
  },
  {
    heading: "4. What a valid sitemap looks like",
    body: "A valid sitemap is well-formed XML served as XML, using the sitemaps.org schema, with each page in a <url><loc> entry (or each child sitemap in a <sitemap><loc> entry for an index). If a file isn't valid XML or isn't reachable, the tool flags it rather than guessing.",
  },
];

export const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Why couldn't the tool find a sitemap?",
    a: "Some sites don't have one, put it at a non-standard path that isn't declared in robots.txt, gzip it (.xml.gz), or block automated requests. The tool checks robots.txt plus the common paths; if none of those resolve, it reports that honestly instead of inventing a result.",
  },
  {
    q: "What's a sitemap index?",
    a: "It's a sitemap that lists other sitemaps rather than pages — used by large sites to stay under the 50,000-URL / 50MB per-file limit. The tool detects it, opens the child sitemaps, and sums their URLs.",
  },
  {
    q: "How many URLs can one sitemap have?",
    a: "A single sitemap file can hold up to 50,000 URLs and must be 50MB or smaller (uncompressed). Beyond that, a site uses a sitemap index pointing to multiple files.",
  },
  {
    q: "Does having a sitemap help SEO?",
    a: "It helps search engines discover and crawl your pages more reliably, especially on large or newly launched sites. It doesn't directly boost rankings, but missing or broken sitemaps can slow down how quickly your pages get indexed.",
  },
  {
    q: "How do I know when a competitor adds new pages?",
    a: "A sitemap is a one-time snapshot. If you want to know when a competitor changes a page — new pricing, a new feature, a changelog entry — that's what TrailWatch does: it watches the pages you care about and emails you one plain-English digest a week.",
  },
];
