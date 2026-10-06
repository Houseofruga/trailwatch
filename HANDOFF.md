# HANDOFF.md — Trailwatch (DTC pivot)

Cross-session build state, written so a fresh Claude Code session (or a different
account) can continue without prior chat memory. **Read `CLAUDE.md` (working rules)
and `SPEC.md` (scope) first, then this.** `PIVOT_PLAN.md` holds the phase-by-phase
detail, decisions, and the log of every migration and env var.

_Last updated: 2026-10-06. This file was rewritten for the pivot: the previous
version described the pre-pivot "founder edition" (page URLs, weekly digest), which
lives on `archive/founder-edition` / tag `v1-founder-edition`, and in git history up
to `56dcdd5`. `main` is fully pushed except the commit that carries this update._

## Product in one line

Competitive briefings for US Shopify DTC brands. Users add competitor stores by
domain; we track their catalogs (launches, prices, sales, stock) and key pages, turn
changes into typed events with a severity, send **instant alerts** for high-severity
moves and a **Monday briefing**, compare competitors' comparable products with the
user's own store, and surface **Opportunities** (gaps and momentum). Live at
`gettrailwatch.com` (`trailwatch.houseofruga.com` 301-redirects there).

## Current status

All pivot phases (1–7, `SPEC.md` §7) and the UI restyle are built, deployed and pushed.
On top of that, since 2026-10-02:

- **Competitor search in the app**: suggestions in onboarding step 2 and the Add
  competitor modal (DESIGN 02b), cached a week per own store.
- **Comparable-product matching (matching prompt Part A)**: products classified into
  a fixed taxonomy, sizes parsed in code, unit prices, a shortlist then a model
  judgement with confidence and a one-line reason; users confirm, reject or link
  matches. `price_position_change` replaced `price_undercut`. Runs in the cron tick.
- **Homepage "Try it on a competitor" widget** (DESIGN 09) and **onboarding from it**
  (DESIGN 10, `/claim` → `/welcome/widget`). Since 2026-10-04 it's three steps (Your
  store, required → Competitors, with theirs already added → Done); the snapshot
  step was dropped.
- **Opportunities (Part B)**: each competitor's own Best Sellers collection read
  daily, demand signals, assortment gaps, up to 3 in the Monday briefing, and the
  **Opportunities screen** (DESIGN 11, `/opportunities`, `/opportunities/dismissed`).

- **Since 2026-10-04 (all live):**
  - **Database moved to the US.** New Supabase project in US East (`jbxcluwqifgonyhbsgie`),
    functions in `iad1` (`vercel.json`). The old Singapore project is a fallback only;
    its values sit in `.env.local` as `OLD_…`. Accounts started fresh (not copied).
    Scheduling is `pg_cron` + `pg_net` calling `/api/cron/catalog` every 10 minutes
    with the vault secret `trailwatch_cron_secret` (`supabase/setup/pg_cron_catalog.sql`).
  - **Onboarding** is three steps for both flows (Your store, required → Competitors →
    Done), with back and forward. An account with no own store is sent to `/welcome`.
  - **Report:** product links open on the competitor's store; a Categories card
    (DESIGN 13, migration 0026); "Compared with your store" says it is still comparing
    until pairs are judged.
  - **Beta offer:** up to 20% off for life (5% on joining, 5% per feedback call, three
    calls) and a price lock. Monthly billing only: annual was removed from the code,
    the price-id mapping and the Refund Policy on 2026-10-06. Own-store matching is
    in Starter as well as Pro.
  - **Prospect preload** (migration 0027, `stores.preload`): 198 prospect stores are
    read daily and classified last, so a prospect who signs up finds data waiting.
  - **Name:** always "Trailwatch", never "TrailWatch".
  - **Guides** (DESIGN 14-content): `/guides` hub and nine guides as typed data in
    `src/features/guides/content/`, published under the owner's name.
  - **Footer:** Free tools, Resources, Legal. No Contact link (see `BACKLOG.md`).
  - **Homepage reworked** (DESIGN 15-landing A, live 2026-10-06): `src/app/(marketing)/page.tsx`
    with sections in `home/sections.module.css`. It keeps the earlier hero
    (`home.module.css`), the pinned three-step scroller (`StepsScroller`, `fresh` look)
    and the cloud scene (`CloudScene`, comparison → Black Friday). The previous homepage
    is at `/v1`, not indexed. The "X of 25 spots left" line appears once 5 spots are taken
    (`home/betaSpots.ts`).
  - **Go-to-market plan:** `GO_TO_MARKET.md`. Outreach week 1 was planned for ~2026-10-12.

**Not yet verified end to end:** the `SPEC.md` §9 checks have never run in a separate
test environment (there isn't one yet — see next steps). Sign-up from the homepage
widget and the signed-in `/opportunities` page have only been checked with mock data;
the owner needs to walk through them (Claude can't create accounts on hosted services).

**Data still filling in (as of 2026-10-04):** matching had classified almost nothing
in production until the 2026-10-04 cron hotfix; it now classifies ~15–30 products per
10-minute tick under a daily token cap, so the first pass over current stores takes
about 4–5 days. Gap opportunities wait on that; Best Sellers movement needs at least
two daily reads; restock patterns need weeks.

## Deviations from SPEC.md / CLAUDE.md (important)

- **AI runs on Groq, not Anthropic.** There's no `ANTHROPIC_API_KEY`, so
  `callFastModel` uses Groq's free tier: `openai/gpt-oss-20b` for page classification
  and "what it means", `openai/gpt-oss-120b` for the briefing and competitor finder,
  and **`qwen/qwen3.8-27b` for matching** (its own free allowance, called with
  reasoning off). Free limits are per model: gpt-oss 8K tokens/min and 200K/day;
  qwen also caps **output at 1,000 tokens/min** (hence classify batches of 15 and
  `max_tokens` ≤ 1000). Matching stops at `MATCHING_DAILY_TOKENS` (default 150K).
  Model IDs live only in `src/features/ai/models.ts`. Adding an Anthropic key is a
  paid-service decision for the owner.
- **No `catalog_products` tables.** The latest gzipped snapshot in Supabase Storage is
  the catalog's current state; stats are cached on `stores.catalog_stats`.
- **Best Sellers:** `sort_by=best-selling` is disallowed by Shopify's default
  robots.txt (10 of 10 stores tested), so B1 reads the store's own Best Sellers
  collection: membership from `products.json`, positions only when the store's page
  lists enough of them; otherwise "unavailable". Never a guessed ranking.
- **Opportunities use no AI**: copy is templated from the data so nothing is invented,
  and signals are never phrased as sales ("#4 in their Best Sellers").
- **Sub-daily scheduling is Supabase `pg_cron` → `/api/cron/catalog` every ~10 min**
  (`supabase/setup/pg_cron_catalog.sql`). Each tick: alerts → briefing step → store
  checks (pages, catalog, daily Best Sellers read) → matching → opportunities refresh.
  Cloudflare returns 524 to callers after 100 s, but the function keeps running.
- **The pre-pivot crons are retired** (2026-10-04): `vercel.json` no longer schedules
  `/api/cron/check` or `/api/cron/digest` (the old weekly digest). There were no real
  users; old-model rows (`pages`, `changes`, competitors without a store) remain but
  nothing updates or emails them. The routes still exist, guarded by `CRON_SECRET`.

## Where things live

Feature folders under `src/features/` (pivot ones):
- `stores/` domain handling, platform detection, page discovery, homepage featured products
- `catalog/` fetch (`products.json`, sitemap fallback), normalize, diff, snapshots, tick scheduler (`schedule.ts`)
- `events/` event model, severity config, page-change classifier, "what it means"
- `alerts/` instant alerts (email, Slack), routing, settings
- `briefing/` Monday briefing: prepare/submit/collect/send, render (E2)
- `matching/` taxonomy, classify, units, candidates, judge, annotate, cron work
- `opportunities/` Best Sellers crawl + parsing, demand, gaps/ranking (`build.ts`), daily refresh, queries
- `preview/` homepage widget backend and the claim flow
- `competitorFinder/` suggestions and search
- `plan/` plan limits (single source), beta plan resolution
- `usage/` AI cost and fetch logging, admin report
- `appData/` view models for the app screens: `queries.ts` (real), `mock.ts` (dev preview states), `actions.ts` (server actions)

UI: `src/components/ui/` (shared components), `src/components/app/` (screens),
routes in `src/app/(app)`, `(onboarding)`, `(marketing)`, `claim/`, `api/`.

Design source: the owner's Claude Design canvas
`https://claude.ai/artifact/Tjog93X7x5Ffbe5tym7MGr` (artboards 01–11, E1/E2). UI is
built 1:1 from it; `CLAUDE_DESIGN_BRIEF.md` is the brief used to make it.

## Migrations

All migrations through `0027` are **applied to the hosted Supabase** (the US project;
the owner runs each in the SQL editor, there's no direct DB connection). The latest:
`0025` (beta member cap), `0026_store_categories`, `0027_store_preload`. A fresh
project can be built from `supabase/setup/all_migrations_fresh_project.sql`. Details
per migration in `PIVOT_PLAN.md`.

## Recent work (since 2026-10-02, all on `main`)

- 2026-10-06: homepage rework live (`5fdec01` and follow-ups to `24aab4b`); annual
  billing removed and Starter given own-store matching.
- 2026-10-05: nine guides (`b48b3c3`, `fb52191`), footer columns (`f46b241`), 20% beta
  offer with price lock (`4f804a5`).
- 2026-10-04: US database move (`76156e2`), prospect preload (`c3145e3`), categories
  (`d36d826`), onboarding in three steps, name change to "Trailwatch" (`88548f3`).
- `be4160d` **Cron hotfix.** Migration 0019's `match_feedback` linked `stores` and
  `users` a second way, so the due-stores query's bare `users!inner` embed became
  ambiguous (PostgREST PGRST201), `runCatalogTick` threw, and every tick returned 500
  for ~10 hours. Fixed by naming the FK (`users!users_own_store_id_fkey`); the cron
  route now also catches catalog-tick errors like its other stages.
- `75aedbb` Matching kept on Groq's free tier (own model, daily cap, smaller prompts,
  own store first).
- `b57353b` Opportunities backend (B1–B4), `223565d` Opportunities screen.
- `f52f68c`…`f484be5` matching (A1–A5), homepage widget, onboarding from the widget.
- Earlier: competitor suggestions, Shopify-only adding, briefing card, UI restyle.

## Gotchas

- **Embeds between `stores` and `users` must name the foreign key** (see the hotfix).
  Any new table referencing both can make other bare embeds ambiguous; test with the
  service client after a migration.
- **Run the local dev server and scripts on Node 22** (`.nvmrc`). Shopify's bot
  protection returns 429 to Node 20's fetch. `.claude/launch.json` (uncommitted,
  machine-specific) points the preview server at Node 22.
- **Tests:** `npm run test` (pre-commit hook runs it). One-off scripts that need env:
  `~/.nvm/versions/node/v22.23.2/bin/node --env-file=.env.local node_modules/vitest/vitest.mjs run <file>`;
  put scratch tests and temporary `src/app/zz-preview` routes in place only while
  using them, and delete them before committing.
- **Preview states:** in development, app pages take `?state=…` (see each page's
  `STATES`) and render mock data with buttons that save nothing. Signed-in pages need
  a login; for screenshots use a temporary unguarded route rendering the view with mocks.
- **Email key and sender domain.** `founder@gettrailwatch.com` is Cloudflare Email
  Routing (a forwarder). Until 2026-10-06 the `RESEND_API_KEY` was limited to
  houseofruga.com, so sends from `weekly@gettrailwatch.com` were refused ("This API
  key is not authorized to send emails from gettrailwatch.com"). The owner replaced
  the key locally and in Vercel; a test from gettrailwatch.com to founder@ arrived.
  Still to confirm: feedback sent from the live app after a redeploy.
- **Design skills** (`.agents/`, `skills-lock.json`, uncommitted): Emil Kowalski's and
  Impeccable. Read their files as guidance; do not run Impeccable's launcher, which
  downloads and runs a program.
- **Marketing UI** is still built from the owner's Claude Design artboards. The homepage
  departs from DESIGN 15 where the owner asked (hero, scroller, cloud scene, timelines).
- `.env.local` points at the **single hosted Supabase project** — local runs write to it.

## Switching between Claude accounts

Git is the only shared memory. Never work from two accounts at once. Start each
session with `git pull` and read `CLAUDE.md` → `SPEC.md` → this file. End with
**`/handoff`** (`.claude/skills/handoff/SKILL.md`). A SessionStart hook warns if the
tree is dirty, commits are unpushed, or this file is stale.

## Environment variables

- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Site and cron: `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, `ADMIN_EMAILS`, `COMP_EMAILS`
- Email: `RESEND_API_KEY`, `EMAIL_FROM`, optional `UNSUBSCRIBE_SECRET`
- AI: `GROQ_API_KEY` (in use), `ANTHROPIC_API_KEY` (not set), `EXA_API_KEY` (finder)
- Paddle (sandbox; billing off in the beta): `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `NEXT_PUBLIC_PADDLE_*`, `NEXT_PUBLIC_BILLING_ENABLED`, `BETA_PLAN`
- Optional knobs: `MAX_AI_CALLS_PER_STORE_PER_DAY`, `ALERTS_PER_USER_PER_DAY`, `MATCHING_DAILY_TOKENS`, `PREVIEW_IP_SALT`, `PREVIEW_PER_IP_PER_DAY`, `PREVIEW_FRESH_PER_DAY`, `BFCM_START`, `BFCM_END`

## Commands & conventions

`npm run dev` / `test` / `lint` / `typecheck`. Commits use a `pivot:` prefix and the
co-author trailer; push only with the owner's go-ahead; never touch the archive
branch or tag; never force-push. `npm run lint` on the whole repo also lints other
sessions' `.claude/worktrees`; lint `src` to check this work.

## Suggested next steps

1. **Outreach** (`GO_TO_MARKET.md`): pick the first 50 prospects, add each one's top
   competitor to the owner's account, start the 50 messages a week.
2. **Owner:** send feedback from the live app to confirm email end to end, read the nine guides, add the second
   author-card line, submit the new pages in Search Console, set "Trailwatch" in
   `EMAIL_FROM`, the Supabase email templates, Google sign-in and the booking page.
3. **Before billing turns on:** let Free users through the required-store step
   (`BACKLOG.md`), create the monthly Paddle prices and the 5 to 20% discounts.
4. **When the first real user signs up:** raise the paid-AI question again (the owner
   chose to stay on Groq's free tier until then).
5. **Content still to write:** comparison pages (need artboards and checked facts) and
   category reports (need about a month of data, early November).
6. **Before real users** (`BACKLOG.md` pre-launch): a separate test environment, then
   the `SPEC.md` §9 checks there; block direct `*.vercel.app` access.
7. Delete `/v1` and the old Singapore Supabase project when the owner says so.
