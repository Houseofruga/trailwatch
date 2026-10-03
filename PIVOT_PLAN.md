# PIVOT_PLAN.md — TrailWatch → competitive briefings for US Shopify DTC brands

Source brief: `trailwatch-ecommerce-pivot-prompt.md`.

**Status:**
- Plan approved 2026-09-30 ("all recommended"; see §6).
- **Phase 0 done:**
  - `SPEC.md` and `CLAUDE.md` rewritten
  - model IDs moved to `src/features/ai/models.ts`
  - `DESIGN_SYSTEM.md` and `DESIGN_BRIEF_FOR_CLAUDE_DESIGN.md` written
- **Phase 1 done (backend):**
  - `src/features/stores/`: marketplace denylist config, canonical store host, platform detection, sale/policy page discovery, `probeStore` (network only) and `resolveStore` (shared store find-or-create)
  - `addCompetitorByDomain` server action: coded results, competitor-only limit
  - robots.txt wildcard + query support
  - `scripts/probe-stores.ts`, which probes real stores with no DB writes
  - The add-by-domain **screen** isn't wired up yet; it waits on the artboards. The legacy page flow still works.
- **Phase 2 done (backend):** `src/features/catalog/`
  - Paginated `products.json` fetch: polite, with 429/5xx backoff and a 25k-product ceiling
  - Sitemap + JSON-LD fallback, including `ProductGroup`/`hasVariant` markup
  - Normalization to cents, which drops $0 helper "products"
  - The pure diff covering all 8 event types
  - The first report and catalog stats
  - Gzipped snapshots in Storage
  - A due-queue scheduler with optimistic claims, the `/api/cron/catalog` tick, and an instant first read via `after()` on add
  - Verified live, with no DB writes: brooklinen.com (313 products in ~5s via `products.json`) and ruggable.com (2,644 via sitemap)
  - **Deviation from §3:** no `catalog_products`/`catalog_variants` tables. The latest gzipped snapshot in Storage is the current state (one download per diff instead of reading up to 25k rows, and far less Postgres space), and stats are cached on `stores.catalog_stats`.
  - **Low-noise choices in the diff** (`diff.ts` header):
    - events are per product, not per variant
    - `sold_out` means every variant is out, so one size selling out isn't an event
    - a sale doesn't also count as a price change
    - a sitewide sale folds in the per-product `sale_started` events it explains, with a minimum of 5 products
  - **Known limits of the sitemap fallback:** no compare-at price (so no sale events) and no publish dates (so the first report has no "recent launches").
- **Phase 3 done (backend):** `src/features/events/`
  - **One event model.** Catalog and page events share `events`, with severity and a dedupe key.
  - **Severity lives in config** (`severity.config.ts`):
    - "top product" = featured on the homepage or tagged best-seller, since there's no sales data
    - `sale_ended` / `product_removed` aren't named in the spec; they go to normal
    - `cosmetic` is kept as a **low** event (stored, never sent)
  - **Store-page pipeline** (`stores/checkStorePages.ts`). Unchanged hash, first capture, and noise-filter-trivial all cost **zero AI**. Only meaningful changes get one classifier call: Haiku, with Groq as fallback.
  - **Fan-out:** `user_events` rows per follower and plan. High goes instant for paid plans, briefing for Free; low isn't fanned out.
  - **The pure `planInstantAlerts`:**
    - bundles per store, holding each bundle until its 10-min burst settles
    - dedupes the same news within 24h
    - caps alerts at `ALERTS_PER_USER_PER_DAY` (default 5), biggest news first; overflow goes to the briefing
  - Phase 4's sender executes that plan.
  - The scheduler now checks pages, then the catalog, for each due store.
  - Classifier verified live through Groq (no Anthropic key locally): promo, policy, positioning and cosmetic all classified correctly, with code, % off and threshold extracted.
- **Phase 4 done (backend + placeholder email layouts):**
  - `features/alerts/`:
    - plain-English sentences for every event type, and templated suggested moves (no AI per alert)
    - instant alert email plus Slack blocks (bundled per store)
    - the Slack URL allowlist
    - the sender, which runs the Phase 3 planner: muted types, no channel, over-cap, repeats and send failures all fall back to the briefing
    - settings server actions, with the Slack URL never returned to the client
    - the "moves caught this month" counter
  - `features/briefing/`:
    - DST-aware US Eastern schedule: prepare from Sun 18:00, send from Mon 08:00, stop waiting at Mon 11:00
    - Sonnet via the **Batch API** with the system prompt **cached**
    - the model writes only the interpretation (top 3 moves, what it means, one move); the per-competitor lists are rendered from events so facts can't be invented
    - no-AI fallback when there's no key or the batch is late
    - each briefing's window starts where the last one ended
    - a quiet week sends nothing
  - `/api/cron/catalog` is now the heartbeat: alerts, then briefing, then store checks.
  - **Email layouts are placeholders** on a shell taken from the shipped digest (`features/email/shell.ts`). They get rebuilt 1:1 when the email artboards land.
- **Phase 5 done (backend):**
  - **Your own store is an ordinary shared store**, linked by `users.own_store_id`. It uses the same crawler and snapshots; the tick checks owned stores too, but skips their page checks, so no AI is spent on your own homepage.
  - **`features/matching/`:** simple, explainable title/type matching.
    - Base title only: "- Color" / "(Variant)" suffixes dropped.
    - Brand, size, packaging words and plurals are normalized.
    - An inverted index means only candidates sharing a token get scored.
    - Only products that **just changed** are matched, per follower with an own store on a paid plan.
  - **Per-user context:** `user_events.context.ownMatch` ("vs your X ($52)") appears in alerts and is marked for the briefing model. The system prompt ties "what this means" to your product.
  - **`price_undercut`** is a high-severity event addressed to one user (`events.for_user_id`, fanned out only to them). It's raised only by a competitor-side price move: a launch, price cut or sale.
    - It needs a match score of at least 0.75 (context needs 0.5), the **same packaging** (set/bundle/pack count, mini/travel) and a price at least 5% below yours.
  - **Tuned on real catalogs** (Parachute vs Brooklinen): recall went from 43 to 203 matches, and false undercuts from 8 to 0 (liner vs curtain, single towel vs towel set, mini vs full were all caught).
  - Known limit: context matches near 0.5 can be loose, but they never trigger alerts. Embeddings are a later upgrade, as the spec says.
  - Not yet covered: an undercut caused by **you** raising your price (only the competitor's moves trigger).
  - **Server actions (screen pending design):** `setOwnStore`, `getOwnStore`, `clearOwnStore`, gated to paid plans on the server.
- **Phase 6 done:**
  - **`plan/limits.ts` is the single plan config** for Free / Starter / Pro / Agency: competitors, instant alerts, Slack, own store, cadence, price, launched.
    - Agency isn't launched and mirrors Pro's limits, since the spec sets only its price.
    - Annual = 10× monthly.
  - **Gating by plan:**
    - instant alerts on Starter and up
    - Slack and own-store matching on Pro only
    - competitor limits of 1 / 3 / 10
  - **Cadence is per store:** the fastest plan among everyone who follows or owns it (24h / 6h / 2h), hourly for Pro during `BFCM_START`–`BFCM_END`.
  - **Paddle:**
    - the webhook maps the subscribed **price → plan**
    - `subscription.updated` handles Starter ↔ Pro switches; a scheduled cancellation still keeps access
    - an unknown price fails loudly so Paddle retries
  - **Beta:** with `NEXT_PUBLIC_BILLING_ENABLED` unset, checkout is closed in both places it could open, and **everyone gets `BETA_PLAN` (default Pro)**. A higher stored plan still wins. Every beta user is a founding member (`users.is_founding_member` defaults to true).
  - **Legacy screens** still compile and work on the 4-tier model: `LIMITS` / `PLAN_LABEL` / `PLAN_PRICE` are derived, and legacy page counts are kept only for the page-picking UI.
  - **The billing page's false statements for beta users were corrected in its existing layout:** "billed monthly", "complimentary", "one paid plan", and "daily checks" on Pro.
  - Waiting on artboards:
    - the 3-tier pricing table
    - founding-member display
    - applying the founding discount at checkout (`NEXT_PUBLIC_PADDLE_FOUNDING_DISCOUNT_ID`; `isFoundingMember()` is ready)
- **Phase 7 done:**
  - **AI cost tracking.** Every model call is logged to `ai_usage` with its tokens and list-price cost. Model prices live in `ai/pricing.ts` (verify when a model changes); cache reads cost 10%, cache writes 125%, and Batch runs at 50%.
    - Classification calls count as store work.
    - Briefing calls are the user's own cost.
    - A failed parse is still logged, because the tokens were spent.
  - **Crawl volume.** Outbound requests are counted per store, per day and per kind in `fetch_log`, via an atomic RPC.
  - **Caps:**
    - **AI calls per store per day** (`MAX_AI_CALLS_PER_STORE_PER_DAY`, default 20). Over the cap, the baseline isn't moved, so the change is classified later rather than lost.
    - Competitors per plan (Phase 6).
    - Products fully tracked per competitor (`priceTrackCap`, Phase 2).
    - **Signups per day**, from `app_settings.free_signups_per_day`, default 50. The signup form shows a friendly message; the DB trigger is the backstop for Google sign-in, which the callback maps to the same message.
  - **`/admin`** (gated by `ADMIN_EMAILS`; everyone else gets a 404):
    - cost per user per month: own briefing cost plus an even share of each followed store's cost
    - per-store AI calls, cost and requests
    - month navigation
    - It's an internal tool built only from existing tokens and patterns; it's not in the design brief.
  - Not tracked: the **legacy** page pipeline's summarizer and insight calls (pre-pivot). They go away with the legacy cleanup.
- Phase 7 tagged `pivot-phase-7`.
- **UI track (replaces Phase 8), brief `trailwatch-shopify-ui-prompt.md`:** the standalone web app gets a
  Shopify-admin-style UI. It is **not** a Shopify app.
  - **Step 1 done (2026-09-30), owner chose option 3:** our own components styled like Polaris.
    - Polaris web components (CDN `polaris.js`) do render standalone (tested on a throwaway page).
      But the script ships without a license and is documented only for apps inside the Shopify admin.
    - Polaris React (`@shopify/polaris`) is deprecated and needs React 18 (we're on 19).
    - `@shopify/polaris` and `@shopify/polaris-tokens` are MIT plus a clause: standalone apps must be
      "dissimilar and visually distinct" from Shopify and its admin. So we use no Shopify code or
      token values.
    - We borrow the patterns (sidebar, page header, card sections, index tables, badges, banners,
      empty states) with our own tokens, accent colour and branding. Familiar, not a clone.
  - **Step 2 done:** `UX_SPEC.md` approved 2026-09-30, with all open questions resolved as recommended.
  - **Step 3 done:** `CLAUDE_DESIGN_BRIEF.md` is ready to paste. It supersedes
    `DESIGN_BRIEF_FOR_CLAUDE_DESIGN.md`.
  - **Step 4 done:** `DESIGN_TO_COMPONENTS.md`. Decisions D1–D6 are all as recommended.
  - **Step 5 built (mock data), awaiting review:**
    - The component set is in `src/components/ui/` and the screens are in `src/components/app/`.
    - Routes: `/login`, `/forgot-password`, `/reset-password`, `/welcome`, `/dashboard`, `/competitors`,
      `/competitors/[id]`, `/competitors/[id]/report` (new), `/settings`.
    - `/billing` now redirects to `/settings#plan`.
    - Mock data is in `src/features/appData/mock.ts`, shaped like `types.ts`. Step 6 swaps in real queries.
    - Development-only `?state=` switcher: `src/features/appData/devState.ts` and `DevStateBar`.
    - Auth stays real. Its actions gained field errors, a "check your inbox" state, a link-expired
      state and `resendConfirmation`.
    - Old founder-edition screens and their now-unused components were deleted (2026-09-30, with the owner's OK).
      They are still in git history and on `archive/founder-edition`. `dashboardFeed.ts` moved to
      `src/features/changes/`.

**Log of new env vars and migrations:**
- Phase 0: none.
- Phase 1: migration **`0009_stores.sql`** (`stores`, `store_pages`, `competitors.store_id`, RLS). **Apply it in the Supabase SQL editor** before `addCompetitorByDomain` can write. No new env vars.
  - As of 2026-09-30 it's **not** live on project `pavknbmnrutbusqninau` (the one `.env.local` uses).
- Phase 2:
  - Migration **`0010_catalog.sql`** adds the scheduling columns on `stores`, `catalog_snapshots`, `events` and the private `catalog-snapshots` bucket. Apply it after 0009.
  - **One-time setup, `supabase/setup/pg_cron_catalog.sql`:** it schedules pg_cron → `/api/cron/catalog` every 10 min. Run it after deploying, with `CRON_SECRET` filled in.
  - No new env vars; it reuses `CRON_SECRET`.
  - Local scripts that use supabase-js need Node 22+. Node 20 fails on a missing WebSocket.
- Phase 3:
  - Migration **`0011_events.sql`** adds `events.severity` / `store_page_id` / `dedupe_key`, the page event types, page-check columns on `store_pages`, `stores.featured_handles`, and the `user_events` fan-out table. Apply it after 0010.
  - **Optional env:** `ALERTS_PER_USER_PER_DAY` (default 5).
  - `ANTHROPIC_API_KEY` must be funded for Haiku classification in production; without it, Groq is used.
- Phase 4:
  - Migration **`0012_alerts_briefings.sql`** adds `alert_settings` (RLS on, no policies, service role only) and `briefings`. Apply it after 0011.
  - No new env vars. It reuses `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL` and the unsubscribe secret.
  - Without `ANTHROPIC_API_KEY`, briefings go out in their no-AI form.
  - The legacy `/api/cron/digest` (page-change digest) still runs for legacy pages. Retire it with the legacy-table cleanup.
- Phase 5:
  - Migration **`0013_own_store.sql`** adds `users.own_store_id` and an owner read policy on `stores`, `events.for_user_id` plus `price_undercut` (with per-user RLS), and `user_events.context`. Apply it after 0012.
  - No new env vars.
- Phase 6:
  - Migration **`0014_plans.sql`** sets the plan constraint to free/starter/pro/agency, turns `paid` into `pro`, and adds `users.is_founding_member` (default true for the beta). Apply it after 0013. When billing opens, flip that column's default to false (the SQL is in the file).
  - **New env vars:**
    - `NEXT_PUBLIC_BILLING_ENABLED`: leave unset for the beta; `true` opens checkout
    - `BETA_PLAN`: default `pro`
    - `BFCM_START` / `BFCM_END`: ISO datetimes
    - `NEXT_PUBLIC_PADDLE_PRICE_STARTER_MONTHLY` / `_ANNUAL`
    - the existing `NEXT_PUBLIC_PADDLE_PRICE_PRO_*` must point at the new **$79 / $790** prices
    - optional: `NEXT_PUBLIC_PADDLE_PRICE_AGENCY_*`, `NEXT_PUBLIC_PADDLE_FOUNDING_DISCOUNT_ID`
  - **Owner, in the Paddle sandbox:** create the Starter ($29 / $290) and Pro ($79 / $790) prices and a "Founding member" 40%-forever discount.
- Phase 7:
  - Migration **`0015_usage.sql`** adds `ai_usage`, `fetch_log` plus the `increment_fetch_log` RPC, and `app_settings` (seeded with `free_signups_per_day = 50`). It also re-creates `handle_new_user` with the signup-cap check. All service-role only. Apply it after 0014.
  - **New env vars:**
    - `ADMIN_EMAILS`: comma-separated; required to see `/admin`
    - optional: `MAX_AI_CALLS_PER_STORE_PER_DAY` (default 20)
  - To change the signup cap: `update public.app_settings set value = '100' where key = 'free_signups_per_day';`
- UI Step 6: migration **`0016_ui_settings.sql`** adds the briefing hour and time zone, `alert_settings.send_to`, and `events.meaning`. Apply it after 0015.
- Beta trust signals (2026-10-01):
  - Migration **`0017_user_role.sql`** adds `users.role`, the optional "What's your role?" answer from onboarding step 1, shown on `/admin`. Apply it after 0016. Until it's applied, the question is shown but the answer isn't saved.
  - Migration **`0018_competitor_suggestions.sql`** adds `users.suggestions`, `suggestions_store` and `suggestions_at`: the in-app competitor finder's cached result (a week per own store). Apply it after 0017. Until it's applied, suggestions still work but every open runs a fresh search.
  - Migration **`0019_product_matching.sql`** adds comparable-product matching: `product_classes`, `product_matches`, `match_state`, `match_feedback` and `stores.classified_snapshot_id`; renames `price_undercut` events, muted types and frozen briefing inputs to `price_position_change`; allows the `match_classify` / `match_judge` AI usage features. Apply it after 0018 and **before deploying** the matching code (the cron's matching step and the new event type need it).
  - Migration **`0020_previews.sql`** adds `previews` (homepage competitor lookups, claimable for 7 days) and `preview_lookups` (per-lookup log with a salted IP hash, for rate limits, the daily cap and `/admin` totals). Apply it after 0019, before deploying `/api/preview`. Optional env vars: `PREVIEW_IP_SALT` (falls back to `CRON_SECRET`), `PREVIEW_PER_IP_PER_DAY` (default 3), `PREVIEW_FRESH_PER_DAY` (default 300).
  - Migration **`0021_preview_cta.sql`** adds `previews.cta_clicked_at` (the widget's "Join the beta" click). Apply it after 0020.
  - No new env vars. Sign-up refuses throwaway inboxes using the `disposable-email-domains` npm list (MIT).

## 0. Git preservation (done 2026-09-30)

- `main` is up to date with origin at `56dcdd5`.
- `archive/founder-edition` (branch) and `v1-founder-edition` (tag) were created from `56dcdd5` and pushed. `git ls-remote` shows all three refs on origin at the same SHA.
- Git now uses `gh` as its credential helper (`gh auth setup-git`). That was the cause of the earlier push failure.
- The untracked files (`trailwatch-ecommerce-pivot-prompt.md`, `Scope decisions needed.zip`, `IA redesign, add plan, competitor/`) are your planning material. They are not product code and are not in the archive.

---

## 1. Current architecture (what we reuse)

Stack: Next.js 16 App Router (TS strict, CSS Modules), Supabase (Postgres + Auth + RLS), Vercel Cron, Resend, Paddle (sandbox), Groq/Anthropic behind provider seams. 26 test files, all run by a pre-commit hook.

| Area | Where | Reuse in pivot |
|---|---|---|
| Hardened fetching (SSRF guard, redirect re-validation, 10s timeout, 2 MB cap, UA `TrailwatchBot/1.0`) | `features/lastUpdated/fetch.ts` (`safeFetch`), `features/checks/fetchPage.ts` | **Yes.** Every catalog/page fetch goes through it. Catalog pages need a higher `maxBytes` (already an option). |
| robots.txt | `features/checks/robots.ts` | **Yes, with a fix needed.** It matches prefixes only and has no `*`/`$` wildcards. Shopify robots files use wildcards heavily, so wildcard support is needed to honor them correctly. |
| Page pipeline: extract → normalize → **hash, and skip if unchanged** → noise filter → LLM | `features/checks/{extract,normalize,hash,noiseFilter,runCheck}.ts` | **Yes.** It already has the "unchanged page = zero AI calls" property the spec asks for. Phase 3 swaps the summarizer for a classifier. |
| LLM seams (Groq gpt-oss preferred, `claude-haiku-4-5` fallback) | `features/summaries/*`, `features/insights/provider.ts`, `competitorFinder/*`, `competitorTeardown/*` | Seam pattern: yes. The model IDs are hardcoded in 5 files and have to move into one config file. |
| Weekly digest (grouped renderer, dark mode, logo, List-Unsubscribe) | `features/digest/{build,email,queries,run,mailer,unsubscribe}.ts` | The email shell, mailer, unsubscribe and per-send isolation are reused. The content model is replaced by the briefing. |
| Instant baseline on add, via `after()` | `features/competitors/warm.ts`, `SPEC-instant-snapshot.md` | The pattern is reused for the "instant first report". |
| Plans / comp / Paddle webhook (tested) | `features/plan/{limits,comp}.ts`, `features/billing/*`, `api/webhooks/paddle` | Reused. The plan enum and price→plan mapping change (Phase 6). |
| Cron | `vercel.json`: check `0 7 * * *` daily, digest `0 8 * * 1` (08:00 UTC Monday, which is 3–4am ET) | **Has to change.** See conflict C2. |
| Data model | `0001–0008`: `users → competitors → pages → snapshots/changes`, plus `page_insights`. Every table is **per-user** and RLS-scoped through `competitors.user_id` | **Has to change** for shared crawls. See §3. |

---

## 2. Conflicts with the brief (need your call — see §6)

- **C1. SPEC.md §6 and CLAUDE.md contradict the pivot.** SPEC §6 bans Slack/webhook alerts, instant/hourly alerting and multiple paid tiers. The pivot requires all three. CLAUDE.md says to stop and flag anything in §6, and it defines "done" as SPEC §9.
  → I'll treat the pivot brief as the new source of truth and rewrite SPEC.md and CLAUDE.md to match in Phase 0.
- **C2. Scheduling.** Checks every 6h (Starter), 2h (Pro) and hourly (BFCM) are sub-daily. Vercel's **Hobby** plan allows only daily crons, so I need to know which Vercel plan you're on. Separately, `maxDuration=300` can't crawl many full catalogs in one run.
  → Either way I'd switch to a **"due queue"**: a frequent tick claims N stores whose `next_check_at <= now()` and processes them. For the tick itself:
  - Supabase `pg_cron` + `pg_net` calling our endpoint every 10–15 min. Free, and we already have Supabase. **Recommended.**
  - Or Vercel Pro ($20/mo, paid).
- **C3. Storage vs "keep all snapshots".** A full `products.json` for a 1k-product store is roughly 2–5 MB. Stored every 2h, that's about 60 MB/day per store. Supabase free allows 500 MB of DB.
  → **Recommendation:**
  - Keep *current state* in compact tables.
  - Write a full snapshot **only when its hash changes**, gzipped, to **Supabase Storage** (1 GB free), with just a row reference in Postgres.
  - History = events + stored snapshots.
  - The other route is Supabase Pro ($25/mo, paid).
- **C4. Shopify robots.txt vs policy pages.** Shopify's default `robots.txt` disallows `/policies/`. I'll confirm this on a few live stores in Phase 1. Your brief and CLAUDE.md both say to respect robots.
  → **Recommendation:** honor it. Policy pages get watched only where robots allows, so `policy_change` events will be rare on Shopify.
- **C5. AI provider and cost.** The app prefers **Groq (free)** today, and Anthropic is only a fallback. The pivot calls for Haiku classification, Sonnet briefings, the **Batch API** and prompt caching, which means paid Anthropic spend.
  - The codebase only configures `claude-haiku-4-5`. **No Sonnet ID exists**, so I'd add `claude-sonnet-5` (current Sonnet).
  - The Batch API is async (usually under 1h, up to 24h). Briefings get **submitted Sunday night and collected/sent Monday morning ET** through a `briefings` table.
- **C6. The just-shipped IA redesign is page-centric.** The page-type dashboard cards, `AddPageDialog`, `EditPageDialog`, the `CompetitorSetup` page rows and the `/welcome` watchlist + competitor finder are all built around picking pages. The pivot removes page picking.
  → Keep the internals, remove the UI entry points in Phase 1, and replace the dashboard in Phases 3/4 (it becomes competitor list + events feed). This throws away a lot of recent UI work, so I'm flagging it explicitly.
- **C7. Plan data.** Your brief says today is "Free 2/6 pages, Pro $19 10/100". The code actually has **Free 2×2, Pro 5×5 at $29/mo ($290/yr)**, and the DB check constraint is `plan in ('free','paid')`.
  - The new Starter at $29 collides with today's Pro at $29. Payments aren't live, so there's no real customer to grandfather.
  - I'll migrate `paid → pro`, set the enum to `free|starter|pro|agency`, and map Paddle price IDs to plans. The price IDs are ones you create in the Paddle sandbox.
- **C8. Email volume.** Instant alerts go out through Resend (free tier: 3,000/mo, 100/day). With the default cap of 5 alerts per user per day, 20 active users already hit 100/day. That's fine for beta, but it's a paid upgrade later.
- **C9. Brief-internal:** "Free: weekly briefing only, **daily checks**" is fine. Monday "US Eastern" plus DST means the send tick runs hourly on Monday and sends once it's 8am ET.

---

## 3. Data-model changes (new migrations `0009+`, applied by you in the SQL editor as before)

Principle: **crawl data is global (per store) and user data is per user.** The new tables sit alongside the legacy ones. The legacy `pages/snapshots/changes/page_insights` tables become read-only and get dropped in a cleanup migration once nothing reads them. The archive branch keeps the old product intact.

**Global tables** (written by the service role; users can read a row only if they subscribe to that store):
- `stores`: `domain` (unique, canonical), `name`, `platform` (`shopify|generic`), `favicon`, `catalog_size`, `last_checked_at`, `next_check_at`, `check_status`, `check_error`.
- `store_pages`: the auto-discovered watched pages (`homepage|sale|shipping_policy|refund_policy`), with the existing page-pipeline fields (latest hash/snapshot, status).
- `catalog_products` and `catalog_variants`: current state, plus `first_seen_at`/`removed_at`. The diff is computed against these.
- `catalog_snapshots`: `store_id`, `fetched_at`, `product_count`, `content_hash`, `storage_path`. Written only on change (see C3).
- `events`: `store_id`, `type`, `severity` (`high|normal|low`), `payload jsonb`, `detected_at`, `source` (`catalog|page`), `dedupe_key`.

**Per-user tables:**
- `competitors`: keep it, add `store_id` with unique `(user_id, store_id)`. It becomes the user↔store subscription, which keeps the existing RLS pattern and a lot of code working.
- `user_events`: fan-out and delivery (`delivered_via instant|briefing`, `alerted_at`, `bundle_id`). Also backs throttling and the "moves caught this month" counter.
- `alert_settings`:
  - email instant on/off
  - Slack webhook URL (server-only, and must be a `hooks.slack.com` URL)
  - per-event-type toggles
- `briefings`: `user_id`, `week_start`, `batch_id`, `status`, `content`. Needed because the Batch API is async.
- Phase 5: `users.own_store_id` → `stores`, and `product_matches` (user product ↔ competitor product, score).
- `users`: plan enum `free|starter|pro|agency`, `is_founding_member`.
- Phase 7: `ai_usage` (user/store, model, tokens, cost, ts) and `fetch_log` (store, kind, count, day).

---

## 4. Design system → Case A (with one caveat)

**Case A applies. Evidence:**
- `src/styles/tokens.css`: a full token set as CSS variables — surfaces, borders, ink scale, lime accent, link, semantic washes, danger — and a zero-radius rule.
- The shared components live in `src/components/`: `Button`, `ConfirmDialog`, `Skeleton`, `ErrorState`, `CompetitorAvatar`, `Sidebar`, `FlashToast`, `UpgradeCta`.
- The design sources are the `.dc.html` artboards in `IA redesign, add plan, competitor/`, `trailwatch v2/` and `trailwatch v3/`, plus `DESIGN-BRIEF.md` and `EMAIL-DESIGN-BRIEF.md`.

**Gaps:**
- The type scale and spacing aren't tokenized; they're hardcoded px in the CSS Modules.
- There is **no dark mode in the app**; only the email has one.
- There is no `DESIGN_SYSTEM.md`.
- There are no severity colors (high/normal/low).

**Caveat:** your standing rule is that UI is built **1:1 from your artboards, never guessed**. None of the new screens exist as artboards yet:
- store card
- event cards with severity
- first report
- events feed
- alert settings
- briefing / instant-alert emails
- value counter
- plan table

**Recommendation:**
- Phase 0: write `DESIGN_SYSTEM.md`, documenting the existing tokens and components as they are, adding no new values.
- Also in Phase 0: write `DESIGN_BRIEF_FOR_CLAUDE_DESIGN.md`, scoped to **only the new screens**, in the v2 language, with fictional DTC brands.
- Backend work in Phases 1–3 runs while you design. New UI gets built once the artboards come back. That's Case A tokens with a Case C-style brief for the missing screens.

---

## 5. Phases → files

| Phase | Touches | New |
|---|---|---|
| **0 Groundwork** (no behavior change) | `SPEC.md`, `CLAUDE.md`, 5 provider files (model IDs → config) | `DESIGN_SYSTEM.md`, `DESIGN_BRIEF_FOR_CLAUDE_DESIGN.md`, `src/features/ai/models.ts` |
| **1 Store = competitor** | `competitors/{actions,domain,url,validation}.ts`, `plan/limits.ts` (competitor-only), `checks/robots.ts` (wildcards). UI entry points removed: `AddPageDialog`, `EditPageDialog`, `CompetitorSetup` page rows, `/welcome` watchlist | `features/stores/{detectPlatform,discoverPages,denylist.config}.ts` + tests; migration `0009_stores` |
| **2 Catalog tracking** | `checks/runDailyChecks.ts` → due-queue runner, `api/cron/check`, `vercel.json`/pg_cron | `features/catalog/{fetchCatalog,normalize,diff,sitemapFallback,firstReport}.ts` + tests (pagination, every event type); migration `0010_catalog`; Storage bucket |
| **3 Events + severity** | `checks/runCheck.ts` (summarizer → classifier), `summaries/*` | `features/events/{severity.config,classifyPageChange,route,throttle}.ts` + tests; migration `0011_events` |
| **4 Alerts + briefing** | `digest/{run,email,mailer}.ts` (reuse shell), `api/cron/digest`, `settings/page.tsx` | `features/alerts/{instant,slack}.ts`, `features/briefing/{prompt,batch,collect}.ts`, value counter; migration `0012_alerts_briefings` |
| **5 Own store** | `settings`, `events/route.ts` (`price_undercut`) | `features/matching/match.ts` + tests; migration `0013_own_store` |
| **6 Plans** | `plan/limits.ts`, `billing/resolvePlanChange.ts` (+tests), `api/webhooks/paddle`, `billing/page`, `plan/comp.ts` | `BILLING_ENABLED` flag, BFCM window config, per-plan cadence in the scheduler; migration `0014_plans` |
| **7 Cost guardrails** | AI provider seams (log usage), scheduler (caps), `auth/actions.ts` (daily free-signup cap) | `features/usage/*`, `/admin` gated by `ADMIN_EMAILS`; migration `0015_usage` |
| **8 Copy** | onboarding, dashboard, empty states, emails, billing page, `features/demo/demoFeed.ts`, `scripts/seed-sandbox.ts` | Fictional DTC sample content |

**Not touched (out of scope):** `(marketing)/*` (landing, compare, tools, hero competitor finder) and `(legal)/*`. Shared `tokens.css` and components stay backward-compatible so the landing page doesn't break.

**New env vars (to be noted per phase):**
- `ANTHROPIC_API_KEY`: must be funded
- `ADMIN_EMAILS`
- `BILLING_ENABLED`
- `BFCM_START` / `BFCM_END`
- `FREE_SIGNUPS_PER_DAY`
- `ALERTS_PER_USER_PER_DAY`
- Paddle price IDs for Starter/Pro (monthly and annual)

**Per phase:** tests, lint and typecheck run. I summarize, commit with a `pivot:` prefix, and **push only after your go-ahead.**

---

## 6. Decisions: RESOLVED 2026-09-30, all as recommended (in **bold**)

Follow-up answers from the owner:
- `/products.json` is public and allowed by robots on real stores. Checked allbirds.com and gymshark.com: HTTP 200. Only `/policies/` is disallowed (allbirds).
- Vercel Pro is **not** required: scheduling goes through Supabase `pg_cron`. Note that Vercel Hobby's terms are non-commercial, so a Pro upgrade will likely be needed anyway once paid billing goes live.

1. **Pivot brief supersedes SPEC.md §6 and the CLAUDE.md "done" definition** (C1). I rewrite both in Phase 0. **Yes.**
2. **Vercel plan?** If Hobby: **Supabase pg_cron → due-queue tick every 10–15 min (free)**. Otherwise Vercel Pro at $20/mo. (C2)
3. **Snapshot storage:** **compact current-state tables + gzipped snapshots written only on change, in Supabase Storage (free)**, or Supabase Pro at $25/mo. (C3)
4. **Honor Shopify robots on `/policies/`**, which means policy tracking only where it's allowed. (C4)
5. **Anthropic spend:** OK to require a funded `ANTHROPIC_API_KEY` for Haiku classification and **`claude-sonnet-5`** Batch briefings, with Groq kept only as the legacy fallback? (C5)
6. **Existing sandbox/test data:** payments aren't live, so **reset it and rewrite the seed with fictional DTC stores** rather than migrate.
7. **Remove from in-app onboarding:** the AI competitor finder and the Wayback backfill. **Yes.** The marketing-site finder stays; it's out of scope. _Reversed for the finder on 2026-10-02 (owner): it is now Shopify-only, so it comes back in onboarding step 2 and the Add competitor modal (`suggestCompetitors`), built from the owner's artboards. The Wayback backfill stays removed._
8. **Design:** Case A plus a **new-screens-only Claude Design brief**. Backend phases proceed while you design, and no new UI is built without artboards.
9. **Pricing:** annual prices are 10× monthly (Starter **$290/yr**, Pro **$790/yr**). You create the Starter/Pro prices and the 40%-for-life "founding member" discount in the Paddle sandbox.

Reply "all recommended", or give numbered overrides. After that I start **Phase 0**.
