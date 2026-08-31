# SEO.md — TrailWatch growth & SEO roadmap

A plan, not a spec. It captures the SEO + free-tool traction strategy so it can be
executed in later sessions. Nothing here is built yet. Build order and honest
caveats are at the bottom. Keep `SPEC.md` §6 (out of scope) in mind — free tools
are marketing surfaces, not new product scope creep.

_Last updated: 2026-08-31._

## Goal

Get qualified, low-cost traffic to `trailwatch.houseofruga.com` and convert it to
free signups (which then upgrade). The product's edge — low-noise, plain-English
competitor change summaries — should be visible in every marketing surface.

Audience: founders, indie hackers, small marketing teams, PMs, agencies. They
search around competitor monitoring, competitor analysis, tracking competitor
pricing, and website change detection.

## Structural note (read first)

TrailWatch lives on a **subdomain**, which Google treats as largely its own site
for authority purposes — it builds SEO from scratch, separate from
`houseofruga.com`. That's fine, but it means:

- TrailWatch-specific tools/content should live on the **TrailWatch subdomain**
  under `/tools/*` and `/compare/*`, so topical relevance and internal links stay
  tight and every page funnels to signup.
- Broad, off-topic tools (that would bring non-converting traffic) are out of
  scope for now — skip them.

---

## Layer 1 — Technical foundation (do first; mostly mechanical)

Highest ROI. A week of tool-building is wasted if nothing is indexed.

- [ ] **Google Search Console + Bing Webmaster** — verify the subdomain, submit
      the sitemap. Free, ~20 min, and the only way to see impressions/queries.
      **(Owner action — needs account access. Still to do.)**
- [x] **`src/app/sitemap.ts`** — native sitemap: landing + legal. Add `/tools/*`
      and `/compare/*` here as those pages ship.
- [x] **`src/app/robots.ts`** — allows marketing/legal; disallows the authed app,
      auth screens, and `/api/`; points at the sitemap.
- [x] **Per-page metadata** — root layout sets `metadataBase`, a title template,
      and OG/Twitter defaults; landing uses an absolute title + canonical; legal
      pages use short titles (template appends "— TrailWatch") + canonicals.
- [x] **OG images** — templated `src/app/opengraph-image.tsx` via `next/og`
      (1200×630), applied site-wide by the file convention.
- [x] **JSON-LD structured data** — `Organization` + `SoftwareApplication` +
      `FAQPage` on the landing (`src/app/(marketing)/structuredData.ts`, rendered
      via `src/components/JsonLd.tsx`), backed by a visible FAQ section.
- [x] **`BreadcrumbList` JSON-LD** on every `/tools/*` page — shared helper
      `src/components/breadcrumbJsonLd.ts`, injected alongside each tool's FAQPage.
- [ ] **Core Web Vitals pass** — Vercel is already fast; still worth a confirm
      pass on the landing (no layout shift / oversized images).

---

## Layer 2 — Free-tool + content engine

Filter for every idea: (a) real search demand, (b) demos TrailWatch's actual
value, (c) reuses code we already have (page fetch + diff/normalize in
`src/features/checks`, LLM summaries in `src/features/summaries`, email via
Resend). Ranked best-first.

### Tool 1 — AI Competitor Teardown  ✅ SHIPPED (2026-08-31)

- **Route:** `/tools/competitor-teardown` — live, in the sitemap + footer Tools nav.
- **What:** paste a competitor URL → fetch a couple of their public pages →
  return an instant plain-English summary of positioning, pricing tiers, and a
  "what to watch" list. CTA: "Want this every Monday? → start free"
  (`?src=teardown` for attribution).
- **Targets:** "competitor analysis tool", "free competitor analysis" (high vol).
- **How it's built:** `src/features/competitorTeardown/` — SSRF-safe extract
  (reuses `safeFetch` + cheerio) → `getTeardownProvider()` seam (Groq → Anthropic
  → null), mirroring `src/features/summaries`. Unit-tested prompt parsing +
  HTML→text. No login.
- **Guardrails (in place):** public pages only via the SSRF guard, timeouts,
  `TrailwatchBot/1.0` UA, per-IP ~4/min rate limit, page + text caps for LLM cost.

### Tool 2 — Watch a page for changes (no signup)

- **Route:** `/tools/watch-a-page`
- **What:** paste one URL + email → we snapshot it and send one email when it
  next changes. A frictionless taste of the core product.
- **Targets:** "monitor web page for changes", "get notified when a website
  changes".
- **Build cost:** Low — reuses the check engine + Resend nearly as-is.
- **Guardrails:** email verification to prevent abuse; cap watches per email;
  same fetch guardrails as above. Make sure it complements (not cannibalizes)
  the free tier — one-shot, single page, then nudge to sign up.

### Tool 3 — Pricing-change tracker (niche of Tool 2)

- A focused variant aimed at "track competitor pricing changes" — lower volume,
  very high intent. Cheap once Tool 2 exists. Optional.

### Comparison / alternative pages (`/compare/*`)

Cheap static pages that capture bottom-funnel, ready-to-buy search. May
out-convert the tools per visitor.

- `Visualping alternative` — Visualping is the incumbent in page-change
  monitoring; a real recurring query.
- `TrailWatch vs Crayon`, `Kompyte alternative` — enterprise tools our audience
  bounces off of; lean into "built for founders, not enterprise sales teams".
- Keep them honest and specific (real differences, our low-noise angle), not
  keyword-stuffed boilerplate.

---

## Distribution (SEO needs backlinks; tools give you something to link)

- Launch on Product Hunt, BetaList, indie communities (Indie Hackers, relevant
  subreddits), and SaaS/tool directories.
- Each free tool is a linkable asset — pitch them, not just the homepage.

---

## Suggested sequencing

1. **Layer 1 foundation** — sitemap, robots, metadata, OG, JSON-LD, Search Console.
2. **Tool 1 (AI Competitor Teardown)** — best demo + funnel fit.
3. **2–3 comparison pages** — cheapest high-intent traffic.
4. **Tool 2 (Watch a page)** — product-led taste; revisit after Tool 1 lands.
5. Distribution push once there's something worth linking to.

## Honest caveats

- SEO is a **months-long** game; don't expect ranking movement for weeks.
- Ranking needs **backlinks + distribution**, not just on-page work.
- Unauthenticated tools that call the LLM or fetch pages **cost money and invite
  abuse** — rate-limit and cache from day one.
- Measure with Search Console (impressions → clicks) and a simple signup-source
  tag on tool CTAs, so we build more of what converts and kill what doesn't.
