// Copy for the Robots.txt Tester page. FAQ feeds both the visible section and
// the FAQPage JSON-LD.

export const GUIDE: Array<{ heading: string; body: string }> = [
  {
    heading: "What robots.txt does",
    body: "robots.txt is a file at the root of a site (yoursite.com/robots.txt) that tells crawlers which paths they may or may not fetch. It's a crawling instruction, not a security control — well-behaved bots obey it, but it doesn't stop anyone determined from visiting a URL.",
  },
  {
    heading: "Allow and Disallow — longest match wins",
    body: "Within the group that applies to a crawler, the rule with the longest matching path decides the outcome. So Disallow: /admin blocks /admin, but a more specific Allow: /admin/public re-opens that subtree. On an exact tie, Allow wins. This tool applies those same precedence rules.",
  },
  {
    heading: "Wildcards: * and $",
    body: "A * matches any sequence of characters, so Disallow: /*.pdf blocks every PDF. A trailing $ anchors to the end of the URL, so Disallow: /*.php$ blocks /page.php but not /page.php?id=1. Getting these wrong is a common way to accidentally block far more than intended.",
  },
  {
    heading: "User-agent groups",
    body: "Rules live under a User-agent line. A crawler follows the most specific group that names it (e.g. Googlebot), falling back to the User-agent: * group if none matches. That's why you can allow Google while blocking an AI crawler like GPTBot — pick the user-agent above to test each one.",
  },
  {
    heading: "A crawl block is not the same as a de-index",
    body: "Disallowing a URL in robots.txt stops crawling, but a page can still appear in search results (without a description) if other sites link to it. To keep a page out of the index, allow crawling and use a noindex meta tag or header instead.",
  },
];

export const FAQ: Array<{ q: string; a: string }> = [
  {
    q: "Why is my page blocked?",
    a: "A Disallow rule in the group that applies to the crawler matches your URL's path, and no longer Allow rule overrides it. The tool shows you the exact rule and user-agent group responsible so you can find and fix it.",
  },
  {
    q: "Does robots.txt remove a page from Google?",
    a: "No. It only asks crawlers not to fetch the page. A blocked URL can still be indexed (without a snippet) if it's linked elsewhere. To de-index, allow crawling and add a noindex meta tag or X-Robots-Tag header.",
  },
  {
    q: "Can I block AI crawlers like GPTBot or ClaudeBot?",
    a: "Yes — add a group for that user-agent with Disallow: /. Select GPTBot or ClaudeBot above to test how a site's robots.txt currently treats them. Note that a site fronted by a CDN may add its own managed rules on top of yours.",
  },
  {
    q: "How accurate is this tester?",
    a: "It applies Google's matching rules: user-agent group selection, Allow/Disallow longest-match precedence, and the * and $ wildcards. Some crawlers interpret edge cases differently, but for the common cases this matches how Googlebot behaves.",
  },
  {
    q: "How do I know when a competitor changes what they block?",
    a: "This is a one-time check. If you want to be told when a competitor changes a page you care about, TrailWatch watches those pages daily and emails you one plain-English digest a week.",
  },
];

export const USER_AGENTS = [
  { value: "Googlebot", label: "Googlebot (Google Search)" },
  { value: "Bingbot", label: "Bingbot (Bing)" },
  { value: "*", label: "All crawlers (*)" },
  { value: "GPTBot", label: "GPTBot (OpenAI)" },
  { value: "ClaudeBot", label: "ClaudeBot (Anthropic)" },
  { value: "Google-Extended", label: "Google-Extended (Gemini)" },
];
