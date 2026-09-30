# TrailWatch → E-commerce Pivot (paste into Claude Code)

You are working on TrailWatch, an existing, working SaaS app. Today it lets a user add competitors, pick specific pages per competitor (X pages per competitor), crawls those pages on a schedule, diffs them, and sends a weekly AI-summarized email of meaningful changes. Plans today: Free (2 competitors / 6 pages) and Pro $19/mo (10 competitors / 100 pages, daily checks). Payments are integrated but not live yet.

We are pivoting TrailWatch from "competitor website monitoring for founders" to **"competitive briefings for US Shopify DTC brands."** Reuse the existing crawler, diffing, AI summary, email, auth and billing code wherever possible. This is an adaptation, not a rewrite.

## How to work

0. **Preserve the current product in git before anything else:**
   - Run `git status`. If there are uncommitted changes, stop and ask me whether to commit them first.
   - Make sure you're on `main` and it's up to date with the remote (`git pull`).
   - Create an archive branch and a tag from the current `main`, exactly as it is now:
     `git branch archive/founder-edition` and `git tag v1-founder-edition`
   - Push both to the remote: `git push origin archive/founder-edition` and `git push origin v1-founder-edition`. Confirm they exist on the remote.
   - From then on, **all pivot work goes on `main`**. Never modify, rebase or delete the archive branch or tag, and never force-push.
   - Commit at the end of each phase (and in smaller logical commits within a phase) with clear messages prefixed `pivot:` (e.g. `pivot: phase 2 catalog tracking`). Push to `main` only after I approve the phase.
   - Include any new env vars or migrations in the commit, and note them in `PIVOT_PLAN.md`.
1. **Then explore the codebase** and write a short plan in `PIVOT_PLAN.md`: current architecture, which files/modules each phase below touches, data-model changes, and anything that conflicts with this spec. **Stop and show me the plan before changing code.**
2. Then implement **one phase at a time**. After each phase: run tests/lint, summarize what changed, and wait for my go-ahead.
3. Keep existing features working unless this spec says to remove them. Put new behaviour behind clear modules, not scattered conditionals.
4. Ask me before adding any new paid third-party service.

---

## Design system (do this before any UI work)

All new and changed in-app UI (onboarding, dashboard, alerts, emails) must follow one consistent design system. The landing/marketing site is out of scope for this pivot. Work through these cases in order:

**Case A: a design system already exists.** Look for tokens and shared components: Tailwind config / theme files, CSS variables, a `components/ui` folder, shadcn or similar, Storybook, an existing `DESIGN_SYSTEM.md`. If found, use it strictly: reuse existing components and tokens, don't invent new colors, font sizes, spacing or radii. If a new component is needed, build it from existing tokens and add it to the shared components folder.

**Case B: no formal system, but the existing UI is consistent enough.** Extract one from what's already built:
- Audit the current screens and collect the colors, typography scale, spacing, radii, shadows, and recurring components (buttons, inputs, cards, tables, badges, modals, nav, empty states).
- Consolidate them into tokens (CSS variables or theme config, including dark mode if the app has it) and a `DESIGN_SYSTEM.md` documenting tokens, components, variants and usage rules.
- Refactor only what's needed so existing screens use the tokens. Don't redesign existing screens.
- Add the new components this pivot needs, in the same style: event cards (with severity badge: high / normal / low), competitor store card (logo/favicon, domain, platform badge, last checked), alert list, briefing preview, plan/pricing table, value counter ("moves caught this month").
- Show me `DESIGN_SYSTEM.md` and stop for review before building new screens.

**Case C: the existing UI is too inconsistent or too thin to extract a usable system.** Do NOT invent a new visual design yourself. Instead:
- Write `DESIGN_BRIEF_FOR_CLAUDE_DESIGN.md`: a ready-to-paste prompt for Claude Design, then stop and tell me. I'll generate the designs and bring them back.
- The brief must include:
  1. Product summary and positioning (from this spec) and the target user (busy DTC founder / marketing lead, non-technical)
  2. Brand direction: calm, trustworthy, editorial "briefing" feel rather than a dense analytics dashboard; clear visual hierarchy for severity; mobile-friendly
  3. What to keep from the current UI (logo, colors or type you found that are worth keeping, with exact values)
  4. A design system request: color tokens (light + dark), type scale, spacing, radii, and the component list from Case B
  5. Screens to design (core product only; no landing/marketing pages), each with its purpose, key content and states (empty, loading, error):
     - Signup + onboarding: add your store, add competitor by domain, "building your first report" loading state
     - First report (instant snapshot: launches, on sale now, sold out)
     - Dashboard: competitors list + recent events feed with severity filters
     - Competitor detail: timeline of events, catalog stats, watched pages
     - Alert settings (email, Slack, per-event toggles) and plan/billing page
     - Weekly briefing email and instant alert email (email-safe layouts)
  6. Realistic sample content using fictional DTC brands (no real brand names)
- After I return designs, extract tokens and components from them into `DESIGN_SYSTEM.md` (as in Case B) before building screens.

Tell me which case applies, with evidence (file paths), in `PIVOT_PLAN.md`.

---

## Target user (for copy, defaults and decisions)

- US Shopify DTC brands doing roughly $1M–$10M/year, selling their **own** products in promo-heavy categories (beauty, skincare, supplements, apparel, home, pet).
- Buyer: founder or head of marketing/growth. Busy, not technical.
- NOT dropshippers, NOT enterprise, NOT SaaS founders.

## Positioning

- Category: **competitive briefing**, not "monitoring."
- Promise: "Instant alerts when a competitor makes a move. A briefing every Monday for the big picture."
- Differentiator: we **interpret** changes and say what they mean for the user's products. Raw data is table stakes.

---

## Phase 1: Competitor = a store, not a list of pages

- A competitor is added by **domain only** (e.g. `brand.com`). Remove the "pick pages" step from onboarding (keep page-level internals if useful, but auto-select pages).
- On add, **detect platform**:
  - Shopify if `https://<domain>/products.json` returns valid JSON with a `products` array (also check common Shopify response headers / `cdn.shopify.com` assets as a fallback signal).
  - Otherwise mark as `generic`.
- **Auto-discover pages to watch** (store them as watched pages internally):
  - Homepage (for announcement bar / hero / promo banners)
  - A sale/collection page if found (`/collections/sale`, `/collections/all` or similar, from nav links)
  - Shopify policy pages: `/policies/shipping-policy`, `/policies/refund-policy` (only if they return 200)
- **Marketplace denylist:** block amazon.*, walmart.com, target.com, ebay.*, etsy.com, aliexpress.com, temu.com (keep list in one config file). Show: "Add the brand's own website instead; marketplace tracking is coming soon."
- Plans are limited by **number of competitors**, not pages.

## Phase 2: Catalog tracking (Shopify competitors)

- Fetch the full catalog via `https://<domain>/products.json?limit=250&page=N`, paginating until an empty page. Respect rate limits: small delay between pages, polite User-Agent identifying TrailWatch, back off on 429/5xx, respect robots.txt.
- Store a **snapshot per competitor per check** (keep all snapshots; history is a future moat). Normalize to: product id, handle, title, product_type, tags, vendor, created_at, published_at, image URL, and per variant: id, title, sku, price, compare_at_price, available.
- **Diff snapshots in code (no AI)** to produce typed events:
  - `product_launched` (new product id)
  - `product_removed`
  - `price_changed` (variant price moved; include old/new and % change)
  - `sale_started` / `sale_ended` (compare_at_price set above price / removed)
  - `sold_out` / `restocked` (variant `available` flips)
  - `sitewide_sale_detected`: when the share of in-stock products on sale jumps above a threshold (start with ≥30% of products newly discounted in one check); include average discount %
- If `/products.json` is unavailable, fall back to the product sitemap (`/sitemap.xml` → product sitemap) plus product-page structured data (JSON-LD `Product` / `Offer`). For large catalogs (>5,000 products) detect launches/removals across all products but only do per-variant price history for a capped subset; make the cap configurable.
- **Crawl each competitor domain once and share results across all users tracking it.** Events are generated per competitor, then fanned out to subscribers.
- On first add, generate an **instant first report** from the initial snapshot: recently launched products (from created_at/published_at), what's on sale now, what's sold out. This must arrive within minutes of signup.

## Phase 3: Event model, severity and routing

- Unify catalog events and page-change events into one `events` table: competitor, type, severity (`high` / `normal` / `low`), payload JSON, detected_at, source.
- Page changes (homepage, sale page, policies): keep existing diffing, but **hash page content first and skip AI entirely if unchanged.** When changed, classify with the cheap model (Claude Haiku) into: `promo_launched` (with discount % / code / free-shipping threshold if present), `positioning_shift`, `policy_change` (shipping/returns), `cosmetic` (drop it).
- Severity rules (make them config-driven):
  - **high → instant alert:** sale_started (sitewide or ≥20% off), sitewide_sale_detected, promo_launched, price undercut vs the user's own product (Phase 5), sold_out on a competitor's top product, product_launched
  - **normal → weekly briefing:** price_changed small, restocked, policy_change, positioning_shift
  - **low → stored only:** cosmetic
- Dedupe and throttle: max N instant alerts per user per day (configurable, default 5); bundle multiple high events for the same competitor within a short window into one alert.

## Phase 4: Alerts and the weekly briefing

- **Instant alerts** (Pro/Starter only): email, plus Slack incoming-webhook if the user connects one. Short: what happened, when, link, and one suggested action ("Their 25%-off sale started today; consider a counter-offer to your email list before the weekend").
- **Weekly briefing** (all plans, Monday morning US Eastern): written with the stronger model (Claude Sonnet). Structure:
  1. Top 3 moves this week (most important first)
  2. Per competitor: launches, pricing/promos, stock, positioning/policy changes
  3. "What this means for you" (tie to the user's catalog when available)
  4. One suggested move for the week
- Generate briefings with the **Batch API** (non-urgent, 50% cheaper) and use **prompt caching** for the fixed system prompt. Use whichever Claude model IDs the codebase already configures; keep model names in one config file.
- Track and show a value counter in the dashboard and email footer: "Competitor moves caught this month: N."

## Phase 5: The user's own store (basic version)

- Let the user enter their own store domain. If Shopify, fetch their catalog the same way.
- Match competitor products to the user's products (title/product_type similarity; start simple, embeddings later).
- Enables: `price_undercut` event (competitor's comparable product priced below the user's) and catalog-aware lines in the briefing.

## Phase 6: Plans, limits and check frequency

- Free: 1 competitor, weekly briefing only, daily checks.
- Starter $29/mo: 3 competitors, weekly briefing + instant alerts, checks every 6 hours.
- Pro $79/mo: 10 competitors, alerts, checks every 2 hours, Slack alerts, own-store matching.
- Agency $199/mo: behind a feature flag, not launched yet.
- Annual = 2 months free. Support a "founding member" coupon (40% off for life).
- Add a config flag for **BFCM mode**: hourly checks for Pro during a configurable date window.
- Payments stay in sandbox for now; the app must run as a **free beta** with plans visible but billing disabled, and beta users flagged as founding members.

## Phase 7: Cost guardrails and observability

- Log per-competitor fetch counts and per-user AI token usage/cost to a table; add an admin view with cost per user per month.
- Hard caps: max competitors per plan, max products fully tracked per competitor, max AI calls per competitor per day.
- Free tier: global cap on free signups per day (configurable) to prevent cost spikes.

## Phase 8: In-app copy (core product only)

- Build all new screens with the design system from the "Design system" section (existing, extracted, or from the Claude Design output).
- Rewrite in-app copy for DTC brand owners: onboarding, dashboard, empty states, alert and briefing emails, in-app plan/billing page. Remove founder/SaaS examples (pricing pages, changelogs) from in-app content.
- Use realistic fictional DTC brands in any sample or demo content (no real brand names).

## Out of scope for now

- **Landing / marketing pages.** Do not modify the public landing page, marketing site or SEO pages in this pivot. They'll be redone in a separate task later. If the landing page shares components or tokens with the app, don't break it; leave its copy and layout as-is.

## Remove / deprecate

- Page-picking onboarding.
- Page-count limits and the $19 plan.
- Founder/SaaS-oriented copy and examples.

## Definition of done (overall)

- I can sign up, add `somebrand.com`, and within minutes receive a first report built from its catalog.
- High-severity changes produce instant alerts; everything else lands in Monday's briefing.
- Crawls are shared across users, unchanged pages cost zero AI calls, and I can see cost per user in an admin view.
- Tests cover platform detection, catalog pagination, snapshot diffing (every event type), severity routing and the marketplace denylist.
