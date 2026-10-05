# SPEC.md — Trailwatch: competitive briefings for Shopify DTC brands

> Source of truth for scope and behavior, from pivot Phase 0 (2026-09-30) onward.
> Derived from `trailwatch-ecommerce-pivot-prompt.md` plus the decisions recorded in
> `PIVOT_PLAN.md` §6. The previous "founder edition" spec (competitor *page* monitoring)
> is preserved on branch `archive/founder-edition` / tag `v1-founder-edition`.

---

## 1. What we're building

**Instant alerts when a competitor makes a move. A briefing every Monday for the big picture.**

- A user adds competitor **stores by domain**.
- For Shopify stores, we track the **full product catalog**: launches, removals, prices, sales, stock.
- For every store, we also watch the **homepage and sale page** for promos and positioning changes.
- Changes become typed **events** with a severity:
  - **High** events trigger **instant alerts**.
  - **Normal** events land in the **Monday briefing**, which interprets what the moves mean for the user's own products.
- The category is **competitive briefing**, not monitoring. The edge is **interpretation**. Low noise still matters: cosmetic changes never reach the user.

**Target user:** a US Shopify DTC brand doing ~$1M–$10M/yr and selling its **own** products in promo-heavy categories (beauty, skincare, supplements, apparel, home, pet). The buyer is the founder or head of marketing/growth: busy and not technical.

**Not for:** dropshippers, enterprise, or SaaS founders.

## 2. Tech stack

| Layer | Choice |
|---|---|
| App | Next.js App Router (TS strict) on Vercel |
| DB and auth | Supabase Postgres + Auth + RLS |
| Snapshot storage | Supabase **Storage** (gzipped catalog snapshots) |
| Scheduling | Supabase **`pg_cron` + `pg_net`**. They call our cron endpoints every 10–15 min, and each tick processes the stores that are due (`next_check_at <= now()`). Vercel Cron stays daily-only. |
| AI | Anthropic. Model IDs live **only** in `src/features/ai/models.ts`. Haiku classifies page changes. Sonnet writes briefings through the **Batch API** with **prompt caching**. Groq stays as the legacy fallback for old paths. A funded `ANTHROPIC_API_KEY` is required. |
| Email | Resend |
| Billing | Paddle (sandbox; billing disabled during beta) |

Cost constraint: stay on free tiers wherever possible. **Ask before adding any new paid service.**

## 3. Data model (target; migrations `0009+`, applied in the Supabase SQL editor)

**Crawl data is global (per store). User data is per user.**

Global tables (written by the service role; readable by users who follow the store):
- `stores`
- `store_pages`
- `catalog_products`
- `catalog_variants`
- `catalog_snapshots` (a Storage reference, written only when the catalog hash changes)
- `events` (`type`, `severity`, `payload`, `source`, `dedupe_key`)

Per-user tables:
- `competitors` (gains `store_id`; it becomes the user↔store follow)
- `user_events` (fan-out, delivery, throttling)
- `alert_settings`
- `briefings` (async Batch API state)
- own store + `product_matches` (Phase 5)
- `ai_usage` and `fetch_log` (Phase 7)

`users.plan` becomes `free|starter|pro|agency`, plus `is_founding_member`.

The legacy `pages / snapshots / changes / page_insights` tables become read-only and get dropped in a later cleanup migration. See `PIVOT_PLAN.md` §3 for column-level detail.

## 4. Plans (Phase 6)

| | Free | Starter | Pro | Agency |
|---|---|---|---|---|
| Price | $0 | $29/mo | $79/mo | $199/mo (feature-flagged, not launched) |
| Competitors | 1 | 3 | 10 | — |
| Weekly briefing | ✓ | ✓ | ✓ | |
| Instant alerts | — | email | email + Slack | |
| Check cadence | daily | every 6h | every 2h (hourly in BFCM mode) | |
| Own-store matching | — | ✓ | ✓ | |

- Own-store matching is in Starter as well as Pro (decided 2026-10-06): it is the product's main promise on the homepage, so every paying plan has it. The plan checks in the code still treat it as Pro only; change them before billing turns on.
- Monthly billing only. Annual plans were dropped on 2026-10-05 (refund risk); the annual prices still in the billing code are to be removed before billing turns on.
- **Beta members** (decided 2026-10-04; stored as `is_founding_member`, always called "beta members" to users): the first **25** sign-ups (`app_settings.founding_member_cap`, enforced at sign-up). Offer (changed 2026-10-05, before any real sign-up; was 10% + 30%), always stated with its condition: **up to 20% off for life**: 5% when they join, plus 5% more for each of **3 short feedback calls** with the founder (counted on `/admin`). Once earned it stays. **Price lock:** a beta member's plan price never goes up. Billing is monthly only (no annual plan, decided 2026-10-05). Paid plans start on **January 1, 2027**. Paddle discounts (5%, 10%, 15% and 20%) are created in the Paddle dashboard when billing turns on. Knobs: `src/features/beta/config.ts`.
- **Beta relationship:** every email's reply-to is the founder (`founder@gettrailwatch.com`); a founder welcome email after sign-up; one-click "Was this useful?" on the briefing and "Useful / Noise" on alerts; in-app "Send feedback / request a feature" (account menu and sidebar), a beta-member card in Settings and onboarding, and a sidebar "Talk to Chandan" call prompt (DESIGN 12-Beta).
- **Beta:** the app runs as a free beta. Plans are visible, billing is disabled (`BILLING_ENABLED=false`), and beta users are flagged as founding members.
- Limits count **competitors only**. Page counts are gone.
- Limits are enforced server-side and never trusted from the client.

## 5. Behavior by phase

1. **Competitor = store.**
   - Add by domain only. There is no page picking.
   - Detect Shopify: `/products.json` returns a `products` array. Fall back to Shopify headers or `cdn.shopify.com` assets; otherwise the store is `generic`.
   - Auto-discover watched pages: homepage, a sale/collection page (from nav links), and `/policies/shipping-policy` + `/policies/refund-policy` if they return 200 **and robots.txt allows them**. Shopify's default robots.txt disallows `/policies/`, and we honor that.
   - Marketplace denylist (a single config file): amazon.\*, walmart.com, target.com, ebay.\*, etsy.com, aliexpress.com, temu.com. Message: *"Add the brand's own website instead; marketplace tracking is coming soon."*
2. **Catalog tracking.**
   - **Fetching:**
     - Paginate `/products.json?limit=250&page=N` until an empty page.
     - Wait a small delay between pages, back off on 429/5xx, send a polite User-Agent, and respect robots.txt with wildcard support.
     - If `products.json` is unavailable, fall back to the product sitemap + JSON-LD `Product`/`Offer` data.
     - Catalogs over 5,000 products get launch/removal tracking for everything, but per-variant price history only for a capped subset (configurable).
   - **Normalize** each product to: id, handle, title, product_type, tags, vendor, created_at, published_at, image, and per variant: id, title, sku, price, compare_at_price, available.
   - **Diff in code, with no AI.** Event types:
     - `product_launched`, `product_removed`
     - `price_changed` (old, new, %)
     - `sale_started` / `sale_ended` (`compare_at_price` above `price`)
     - `sold_out` / `restocked`
     - `sitewide_sale_detected` (≥30% of in-stock products newly discounted in one check; includes the average discount)
   - **Crawl each domain once** and fan the results out to every follower.
   - **Instant first report** on add (recent launches / on sale now / sold out), delivered within minutes.
3. **Events and severity.**
   - Catalog events and page events live in one `events` table.
   - Page pipeline: hash first, so an unchanged page costs zero AI. A changed page goes to Haiku, which classifies it as `promo_launched` (discount % / code / free-shipping threshold), `positioning_shift`, `policy_change` or `cosmetic`. Cosmetic changes are dropped.
   - Severity rules are config-driven:
     - **High:** sale ≥20% or sitewide, `sitewide_sale_detected`, `promo_launched`, `price_undercut`, top product sold out, `product_launched`.
     - **Normal:** small `price_changed`, `restocked`, `policy_change`, `positioning_shift`.
     - **Low:** cosmetic.
   - At most N instant alerts per user per day (default 5). High events for the same competitor within a short window are bundled into one alert.
4. **Alerts and briefing.**
   - **Instant alerts** (Starter/Pro): email, plus Slack through an incoming webhook that must be a `hooks.slack.com` URL. They cover what happened, when, a link, and one suggested action.
   - **Monday briefing** (all plans): arrives Monday morning US Eastern (DST-aware). It's written by Sonnet through the Batch API: submitted Sunday night, collected and sent Monday. Sections:
     1. Top 3 moves
     2. Per competitor: launches, pricing/promos, stock, positioning/policy
     3. What this means for you
     4. One suggested move
   - A "Competitor moves caught this month: N" counter appears on the dashboard and in the email footer.
5. **Own store** (basic).
   - The user enters their own store domain, which is crawled the same way.
   - Match competitor products to the user's products by title / product_type similarity.
   - This enables `price_undercut` and catalog-aware briefing lines.
6. **Plans, limits and cadence:** see §4. There's a BFCM-mode config window for hourly Pro checks.
7. **Cost guardrails.**
   - Log per-competitor fetch counts and per-user AI tokens and cost.
   - `/admin` (gated by `ADMIN_EMAILS`) shows cost per user per month.
   - Hard caps: competitors per plan, fully tracked products per competitor, AI calls per competitor per day, and free signups per day.
8. **In-app copy** for DTC brand owners. Demo and sample content uses fictional DTC brands only.

## 6. Out of scope

- **Landing / marketing / SEO pages and the public tools.** Don't modify them, but don't break them either. They share `tokens.css` and some components.
- Marketplace tracking (Amazon etc.)
- The Agency tier launch (it stays behind a flag)
- Embeddings-based matching (Phase 5 starts simple)
- Headless / JS rendering, screenshots and visual diffs
- Team seats
- Public API
- Native apps

**Remove or deprecate:**
- The page-picking onboarding and page dialogs
- Page-count limits and the old Free 2×2 / Pro 5×5 plans
- Founder/SaaS copy and examples in-app, and the Wayback backfill in onboarding. (The in-app competitor finder was removed here, then brought back Shopify-only on 2026-10-02: PIVOT_PLAN.md decision 7.)

## 7. Build order

Phase 0 (groundwork) → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8, **one phase at a time**.

After each phase:
1. Run tests, lint and typecheck.
2. Summarize the changes.
3. Commit with a `pivot:` prefix.
4. **Wait for the owner's go-ahead before pushing** or starting the next phase.

New UI gets built **1:1 from Claude Design artboards** (see `DESIGN_SYSTEM.md` and `DESIGN_BRIEF_FOR_CLAUDE_DESIGN.md`). Backend work proceeds while designs are pending.

## 8. Tests (required)

- Platform detection
- Catalog pagination
- Snapshot diffing, covering **every** event type
- Severity routing and throttling / bundling
- The marketplace denylist
- robots.txt wildcard matching
- Carried over: the noise filter, and the Paddle webhook, which now maps price → plan

A pre-commit hook blocks commits when tests fail.

## 9. Definition of done

1. I can sign up, add `somebrand.com`, and **within minutes** receive a first report built from its catalog.
2. High-severity changes produce **instant alerts**. Everything else lands in **Monday's briefing**.
3. Crawls are **shared** across users, **unchanged pages cost zero AI calls**, and an **admin view** shows cost per user.
4. The tests in §8 pass.
