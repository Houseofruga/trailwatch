# HANDOFF.md — TrailWatch (DTC pivot)

Cross-session build state, written so a fresh Claude Code session (or a different
account) can continue without prior chat memory. **Read `CLAUDE.md` (working rules)
and `SPEC.md` (scope) first, then this.** `PIVOT_PLAN.md` holds the phase-by-phase
detail, decisions, and the log of every migration and env var.

_Last updated: 2026-10-04. This file was rewritten for the pivot: the previous
version described the pre-pivot "founder edition" (page URLs, weekly digest), which
lives on `archive/founder-edition` / tag `v1-founder-edition`, and in git history up
to `56dcdd5`. `main` is at `223565d` and fully pushed._

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

`supabase/migrations/0009`–`0024` are all **applied to the hosted Supabase** (the owner
runs each in the SQL editor; there's no direct DB connection). The latest:
`0023_opportunities`, `0024_opportunity_dismissed_at`. Any other environment must
apply them in order. Details per migration in `PIVOT_PLAN.md`.

## Recent work (since 2026-10-02, all on `main`)

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

1. **Owner walkthroughs:** sign up from the homepage widget (new user, and signed in),
   and check `/opportunities` signed in.
2. **Matching review (A6)** once classification finishes (~2026-10-08): 50 real
   matches with confidence and reason, and the AI cost per store.
3. **Before real users** (`BACKLOG.md` pre-launch): a separate test environment
   (Supabase, Resend, Paddle sandbox), then the §9 checks there; block direct
   `*.vercel.app` access so the widget's per-IP limit can't be bypassed with a fake
   `cf-connecting-ip` header.
4. **AI provider decision:** stay on Groq's free tier or add an Anthropic key (paid).
5. Parked by the owner: SEO/growth work (`BACKLOG.md`), including time-sensitive
   Black Friday guides (publish by ~2026-10-20).
