# SEO plan: tools, guides, comparisons

_Drafted 2026-10-01. Owner lifted the "don't touch /tools and /compare" rule for this work._

## Who we're writing for

Founders and marketing leads at US Shopify DTC brands ($1M–$10M), mostly in beauty, skincare, supplements, apparel, home and pet. They want to know what competitors are doing (launches, prices, sales, stock) without checking sites by hand. Every page should end in one of two places: a free tool run, or "Join the beta".

## Rules for every page

- No invented numbers. Any figure comes from our own data (with the date) or from a cited source.
- Example brands are fictional (Dewlane, Luna Skin, Fernwood Supply…), as in the product mockups.
- "Shopify" is used descriptively only ("for Shopify brands", "check if a site uses Shopify"). No Shopify logo, and nothing implying we're official, partnered or endorsed.
- Claims about other products come from their current website, checked when the page is written, with a "last checked" date on the page.
- One page, one search intent. Plain English, short paragraphs, built in the site's existing Polaris-style components.

## Step 0: old pages (done 2026-10-01)

Search Console showed no traffic on any founder-edition SEO page, so all were removed: the four tools (competitor teardown, last-updated checker, sitemap finder, robots.txt tester), the three comparisons (Visualping, Crayon, Kompyte) and the `/1` landing variant. Each URL 308-redirects to `/` (`next.config.ts`, `RETIRED`). When a new page reuses one of those URLs (e.g. the Visualping comparison), remove it from `RETIRED`. The footer's Tools and Compare columns come back with the hubs.

## Site structure

- Hubs: `/tools`, `/guides`, `/compare`, each listing its pages and linked from the footer.
- One shared template per type, built from existing components:
  - **Tool:** the tool, a short "how it works", 3–5 FAQs, and a "track this store" call to action.
  - **Guide:** the article, a table of contents for long ones, related guides, and a call to action.
  - **Compare:** a summary table, where each fits, honest trade-offs, a "last checked" date and FAQs.
- Content lives in the repo as typed data or Markdown next to its route. No CMS.
- Each page gets: a title and description, a canonical URL, an OG image, an entry in `sitemap.ts`, and structured data (FAQPage; plus Article for guides, SoftwareApplication for tools).
- Internal links: every guide links to at least one tool, and every tool to two guides.

## 1. Free tools (built on the store-reading engine)

| # | Tool | URL | Main search intent | Engine it reuses | Effort |
|---|---|---|---|---|---|
| T1 | Is this site on Shopify? | `/tools/shopify-store-checker` | "is this website shopify", "check if a site uses shopify" | `detectPlatform` | Small |
| T2 | Store snapshot | `/tools/shopify-store-analyzer` | "see what a shopify store sells", "shopify competitor research" | catalog fetch + first report | Medium |
| T3 | Sale checker | `/tools/is-it-on-sale` | "is [store] having a sale", "shopify sale tracker" | catalog fetch (discount share) | Small once T2 exists |
| T4 | Competitor finder | `/tools/competitor-finder` | "find competitors of a shopify store", "who are my competitors" | homepage finder | Small (it exists) |

Guardrails for public tools:
- **Abuse limits:** per-IP rate limit and a daily cap per tool.
- **Caching:** results cached per domain (24 hours for T2/T3) so one store isn't crawled repeatedly.
- **Same rules as the app:** robots.txt and the same refusals (marketplaces, non-stores).
- **Hand-off:** results include "Get alerted when this changes → Join the beta", carrying the store into onboarding the way the homepage finder does.

## 2. Guides

### Black Friday cluster (publish by ~20 October; brands plan BFCM in October)

| # | Guide | Search intent |
|---|---|---|
| G1 | How to see when a competitor's Black Friday sale starts | "competitor black friday sale" |
| G2 | Black Friday competitor-watching checklist for Shopify brands | "bfcm checklist shopify", "black friday competitor analysis" |
| G3 | How to tell a real price cut from a fake "sale" price | "fake sale prices", "compare at price" |

### Evergreen cluster (one problem each)

| # | Guide | Search intent |
|---|---|---|
| G4 | How to track a competitor's prices on Shopify | "track competitor prices shopify" |
| G5 | How to see a competitor's new products | "see competitor new products" |
| G6 | How to find a competitor's best sellers | "find competitor best sellers shopify" |
| G7 | How to tell if a competitor is running low on stock | "competitor out of stock" |
| G8 | How to find your Shopify store's real competitors | "find ecommerce competitors" (pairs with T4) |
| G9 | Competitive analysis for DTC brands: a practical template | "dtc competitive analysis template" |

## 3. Comparisons

| # | Page | Why | Status |
|---|---|---|---|
| C1 | Trailwatch vs Visualping | General page-change monitor store owners already try | Rewrite existing |
| C2 | Trailwatch vs Prisync | Price tracking for e-commerce | New |
| C3 | Trailwatch vs Price2Spy | Price tracking for e-commerce | New |
| C4 | Trailwatch vs Particl | E-commerce competitor intelligence; verify positioning first | New |
| C5 | Trailwatch vs tracking competitors in a spreadsheet | The most common "alternative" | New |
| C6 | Trailwatch vs Google Alerts | Free and familiar; good contrast | New |
| — | Crayon, Kompyte | B2B sales tools, wrong audience | Retire (see Step 0) |

## Order of work

| Week (2026) | Ship |
|---|---|
| Oct 1–7 | The three templates and hubs; **T1**; **G1** |
| Oct 8–14 | **G2**, **G3**; **T4** moved to `/tools` |
| Oct 15–21 | **T2** store snapshot; **C1** Visualping rewrite; **C5** spreadsheet |
| Oct 22–31 | **T3**; **C2**, **C3**; **G4**, **G5** |
| November | **C4**, **C6**; **G6–G9** |

## Measuring it

Search Console (impressions, clicks, position per page), tool runs, and tool → sign-up conversions. These are logged in `/admin` the same way as AI usage, without storing visitors' personal data.

## Open questions for the owner

1. Should guides carry an author name and photo (better for trust), or "Trailwatch team"?
2. Is a monthly "category report" from our own data (e.g. "how bedding brands discounted in October") something we want later, once the beta has enough stores?
