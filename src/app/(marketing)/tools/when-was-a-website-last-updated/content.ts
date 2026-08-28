// Copy for the Last-Updated Checker page, kept out of the JSX. The FAQ array
// feeds both the visible section and the FAQPage JSON-LD so they stay in sync.

export const GUIDE: Array<{ heading: string; body: string }> = [
  {
    heading: "Why there's often no single answer",
    body: "Many pages don't expose a real \"last updated\" date. Static sites and CMS-driven pages usually do; app-rendered or heavily dynamic pages frequently return today's date on every request, or none at all. A good check looks at several signals and tells you how much to trust each — which is exactly what the tool above does.",
  },
  {
    heading: "1. The Last-Modified HTTP header",
    body: "When your browser requests a page, the server can send a Last-Modified response header. It's a genuine signal for static files, but many servers return the current time for dynamic pages — so treat it as a hint, not proof. The tool reads this header for you; you can also see it in your browser's Network tab.",
  },
  {
    heading: "2. Modified-date meta tags",
    body: "Content-managed pages often embed the edit date in the HTML: article:modified_time, og:updated_time, or a last-modified meta tag. These are usually reliable because a CMS writes them when an author saves. The tool extracts them from the page source automatically.",
  },
  {
    heading: "3. Structured data (schema.org dateModified)",
    body: "Pages that use JSON-LD structured data (common on blogs and news) include a dateModified field. Search engines read this, and so does the tool. When present, it's one of the most trustworthy signals available.",
  },
  {
    heading: "4. The XML sitemap's <lastmod>",
    body: "Most sites publish a /sitemap.xml listing their pages, each with a <lastmod> date. It reflects when the site owner says the page last changed. The tool looks up your exact URL in the sitemap when one is available.",
  },
  {
    heading: "5. The Wayback Machine (for history)",
    body: "To see how a page looked at past points in time — not just its latest change — the Internet Archive's Wayback Machine keeps dated snapshots. It's the best way to confirm whether and when real content changed, rather than relying on a self-reported date.",
  },
];

export const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "How accurate is the last-updated date?",
    a: "It depends on the page. Modified-date meta tags and schema.org dateModified are usually reliable. The Last-Modified header and sitemap dates are decent hints but can be wrong on dynamic sites. That's why the tool shows every signal it finds, each with a confidence level, rather than inventing one number.",
  },
  {
    q: "Why does it say no date is available?",
    a: "Some pages genuinely don't expose one — app-rendered pages and dynamic sites often send no reliable modified date. Rather than fake a result, the tool tells you honestly when there's nothing trustworthy to report.",
  },
  {
    q: "Can I check any website?",
    a: "You can check any public web page. Pages behind a login, paywall, or that block automated requests can't be checked. The tool only fetches public, non-authenticated pages and respects robots.txt.",
  },
  {
    q: "Does Google's cache still work for this?",
    a: "No. Google retired its public cache feature in 2024, so the old \"check Google's cached copy\" trick no longer works. The Wayback Machine is now the best way to see a page's history.",
  },
  {
    q: "How do I get notified when a page actually changes?",
    a: "This tool is a one-time check. If you want to be told automatically when a competitor's page changes — in plain English, without watching a dashboard — that's exactly what TrailWatch does: it checks daily and emails you a low-noise weekly digest.",
  },
];
