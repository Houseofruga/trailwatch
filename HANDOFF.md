# HANDOFF.md — Competitor Radar / TrailWatch

Cross-session build state, written so a fresh Claude Code session (or a different
account) can continue without prior chat memory. **Read `SPEC.md` for scope and
`CLAUDE.md` for working rules first**, then this for "where things actually are".

_Last updated: 2026-09-05._

## Product in one line

Users add competitor page URLs → a daily cron checks them → a pure noise filter
drops trivial changes → an LLM summarizes meaningful ones → a weekly digest email
goes out. Free tier + one paid tier. The edge is **low noise**.

## Current status

All eight vertical slices in `SPEC.md` §7 are implemented in the codebase (auth,
competitor/page CRUD with limits, check engine + noise filter, LLM summaries,
dashboard, weekly digest, daily cron, billing). The marketing landing, auth
pages, app shell, and legal pages all exist and render.

**Not yet signed off:** the six end-to-end checks in `SPEC.md` §9 (the definition
of done) have not been re-verified end-to-end in this workspace. Treat MVP as
"feature-complete, needs a full §9 pass in a test environment" — especially the
Paddle checkout→plan-flip→cancel→revert loop and the digest send/no-send.

**Pre-launch hardening + mobile pass done (2026-09-05, this session).** A launch
audit fixed the real blockers: an authenticated **SSRF** in the check engine, a
total absence of **error boundaries**, and a **non-responsive app shell**. The
whole authed app was rebuilt mobile-first (bottom tab bar, account sheet,
bottom-sheet dialogs). Also: one-click **email unsubscribe**, **fail-closed
crons**, a stricter Paddle webhook, competitor **favicons** via a first-party
proxy, and finder accuracy work. 130 tests pass. Details under Recent work. The
authed-page changes were verified by compiling every route + a throwaway mock
harness (screenshotted), **not** by a real logged-in walkthrough — that's still
the owner's job (§9 / production login).

## Deviations from SPEC.md / CLAUDE.md (important)

These docs predate some decisions — trust the code, and reconcile the docs when
convenient:

- **Billing is Paddle** (docs now reconciled — `SPEC.md` and `CLAUDE.md` say Paddle).
  Webhook at `src/app/api/webhooks/paddle/route.ts`, signature verify in
  `src/features/billing/verifyPaddleSignature.ts` (unit-tested), plan resolution in
  `src/features/billing/resolvePlanChange.ts`.
- **Summaries are provider-pluggable.** `src/features/summaries/index.ts` picks
  Groq (`GROQ_API_KEY`) if present, else Anthropic (`ANTHROPIC_API_KEY`, model
  `claude-haiku-4-5`). Adding/swapping a provider is one new file + one line here.
- **Branding: "House of Ruga" is legal/ownership only** (owner decision 2026-08-31).
  House of Ruga is the parent company; TrailWatch is a product under it and is the only
  brand surfaced in visible marketing copy. The parent name appears ONLY in: the `(legal)`
  pages ("House of Ruga LLP"), the `SiteFooter` copyright ("© 2026 House of Ruga"), the SEO
  `Organization` publisher in `structuredData.ts` (machine-only; TrailWatch is the
  `SoftwareApplication` published by it — do NOT rename the org to TrailWatch), and the
  working domain/email/user-agent (`gettrailwatch.com`, `trailwatch@houseofruga.com`).
  Do not reintroduce "House of Ruga" into hero/landing/app prose.
- **Domain: the app now lives at its OWN root domain `gettrailwatch.com`** (migrated
  2026-09-01 from the old subdomain `trailwatch.houseofruga.com`). House of Ruga is just
  the operating company / portfolio — NOT a product-brand umbrella, and there is NO
  plan for product-per-subdomain (that earlier note is retired). The old subdomain
  **301-redirects** (path+query preserved) to the new domain via a Cloudflare Redirect
  Rule on the houseofruga.com zone. Same Supabase/Vercel/Cloudflare-fronts-Vercel stack;
  registrar is now Cloudflare. `NEXT_PUBLIC_SITE_URL=https://gettrailwatch.com` (Vercel)
  drives all canonicals/OG/sitemap/robots. Contact email stays `trailwatch@houseofruga.com`;
  sending is `weekly@gettrailwatch.com` (`EMAIL_FROM`).
- **Plan limits** (`src/features/plan/limits.ts`): free = 2 competitors × 3 pages
  each (6 total); paid = 10 competitors × 10 pages each (100 total). Pro pricing:
  `$19/mo` monthly or `$190/yr` annual (2 months free), via `PRO_MONTHLY_USD` /
  `PRO_ANNUAL_USD`. Landing pricing copy now says Pro = "100 pages", matching the
  enforced 100-page limit (owner-confirmed 2026-08-26).
- **Prices exclude tax (2026-09-05).** The shown $190/yr and $19/mo are the pre-tax base;
  Paddle (Merchant of Record) adds the buyer's local tax **on top** at checkout (India GST
  18% → $224.20 / $22.42; VAT/sales tax elsewhere). This is a **Paddle dashboard** setting
  (both Pro prices have `tax_mode: external`), NOT in code — don't look for it in the repo.
  The app reflects it with "Plus applicable taxes — calculated at checkout" on the checkout
  surfaces only (`ProPricingCard` + the add-competitor upsell); the marketing landing has no
  tax line. If the Paddle prices ever revert to inclusive, that copy would be wrong.
- **Competitor finder model is `openai/gpt-oss-120b`** (was `gpt-oss-20b`) — same free
  Groq tier, much better recall + more accurate homepage URLs (`competitorFinder/groq.ts`).
  Anthropic Haiku stays the fallback. `runFind` now DNS-verifies each suggested homepage and
  blanks the URL (keeping the name) if it doesn't resolve.
- **Finder live web grounding via Exa (`EXA_API_KEY`, optional).** When set, `runFind`
  calls Exa `/search` (`competitorFinder/exa.ts`) for current competitor candidates and
  feeds them to the Groq model as grounding — so it finds RECENT/niche competitors, not just
  famous ones (verified in prod: Formbricks → Heyform/Typebot/Form.io/SurveyJS, not the
  offline model's analytics-tool miscategorisation). The prompt BLENDS live results with
  known competitors. Exa free tier = monthly credits, no card → no overage; on error/quota
  it degrades to the offline model. **Must be set in Vercel (Production) for the live finder
  to be grounded** — without it, prod silently falls back to offline (famous-only). Also
  disclosed as a sub-processor in the privacy policy. (Note: Gemini/Groq-Compound grounding
  were trialed and rejected — Compound 413s on free tier, Gemini grounding is no longer free
  for new keys; see git history.)
- **Competitor logos are favicons via a first-party proxy** — `/api/favicon?domain=…`
  (`features/favicon/fetchFavicon.ts`, SSRF-safe) resolves each competitor's own favicon
  server-side and edge-caches it; the browser never hits a third-party icon service. The
  shared `components/CompetitorAvatar` renders it with initials fallback, used on the
  dashboard, demo dashboard, Competitors board, change detail, and the marketing finder.
- **Digest email has one-click unsubscribe** — signed `/api/unsubscribe?u=&t=` (HMAC keyed by
  `UNSUBSCRIBE_SECRET`, falling back to `CRON_SECRET`) + `List-Unsubscribe` /
  `List-Unsubscribe-Post` headers (RFC 8058). GET confirms, POST flips `digest_enabled=false`.
- **Both cron routes fail closed** — if `CRON_SECRET` is unset they 500 instead of running
  wide open (previously the auth check was skipped when the secret was missing).

## Where things live (organized by domain, per CLAUDE.md)

- `src/features/` — `account`, `auth`, `billing`, `changes`, `checks`, `competitors`,
  `competitorFinder`, `competitorTeardown`, `demo`, `digest`, `lastUpdated`, `plan`,
  `robotsTester`, `sitemapFinder`, `summaries`. The noise filter (`isMeaningfulChange`),
  the Paddle signature verify, the teardown/finder prompt parses, and `competitors/url`
  `normalizeUrl` are the pure, unit-tested functions. `competitors/actions.ts` also
  exports `seedCompetitors` (onboarding pre-seed) + a shared `insertCompetitorWithPages`
  helper reused by `createCompetitor`.
- `src/app/(marketing)/` — **`/` is the finder homepage** (the "Find your competitors"
  hero: `CompetitorFinder.tsx` + `actions.ts` + `home.module.css`); it is indexed
  (canonical `/`) and carries the site JSON-LD. The old **animated landing lives at `/1`**
  (`1/page.tsx`, `noindex`, signed-in→`/dashboard`) — it composes the four scroll-driven
  client components: `HeroScene` (pinned full-sky hero), `StepsScroller` ("Set it once"
  3-step pinned scroller with built product-UI mockups), `CloudScene` (pins why→pricing and
  flies a cloud through to reveal pricing), `FounderReveal` (before/after Ghibli image
  slider). All scroll effects are desktop-only (≥1041px, no reduced-motion); each has a
  static/stacked fallback. `MarketingSections.tsx` (below-hero content) is shared by both
  `/` and `/1` so pricing/FAQ can't drift. **`/try` is gone (404)** — its content became `/`.
  `page.module.css` is the shared marketing stylesheet. Also `tools/` — free public
  SEO/marketing tools: `competitor-teardown` (the flagship — AI competitor analysis),
  `sitemap-finder`, `robots-txt-tester`, `when-was-a-website-last-updated`. All follow
  one pattern (page.tsx + content.ts + actions.ts + Form + css; server action → a
  `src/features/<name>` module; FAQPage + BreadcrumbList JSON-LD; SiteFooter Tools nav).
- `src/app/(auth)/` — `login`, `forgot-password`, `reset-password`. Email links land at
  `src/app/auth/confirm/route.ts` (token_hash `verifyOtp` — cross-device safe);
  `src/app/auth/callback/route.ts` handles Google OAuth (PKCE code). Auth actions in
  `src/features/auth/actions.ts` are env-driven off `NEXT_PUBLIC_SITE_URL`.
- `src/app/(app)/` — authed shell: `dashboard`, `competitors`, `billing`, `settings`,
  `changes/[id]`. Guarded by `src/proxy.ts` + a belt-and-braces check in the layout.
- `src/app/(onboarding)/` — authed but **chrome-free** (no sidebar): its own
  `layout.tsx` — a top bar mirroring the public `SiteHeader` (**logo top-left, profile +
  Log out top-right**, 1280/48 container), content centered below. Holds `welcome/` — the
  post-signup onboarding. **New signups land here directly** (auth redirects to `/welcome`,
  not `/dashboard` — see Recent work); it's a **two-step** flow: `WelcomeOnboarding.tsx`
  (watchlist) → `OnboardingPlanStep.tsx` (in-flow Free/Pro; the Pro card is the **shared
  `ProPricingCard`** from `features/billing`, so it can't drift from billing). `/welcome`
  is in `proxy.ts` `APP_PREFIXES` and self-guards (→`/dashboard` if the account already has
  competitors), so it's safe as the universal post-signup landing. NB: `.plansWrap`/`.wrap`
  need `width:100%` because `layout.tsx`'s `.main` is a flex column (an auto-margined child
  otherwise collapses to content width and ignores `max-width`).
- `src/app/(legal)/` — `terms`, `privacy`, `refunds` (placeholder content, real routes).
- `src/app/api/cron/` — `check` (daily) and `digest` (weekly), Bearer-guarded by
  `CRON_SECRET`. Schedules in `vercel.json`: check `0 7 * * *`, digest `0 8 * * 1`.
- `src/components/` — shared UI incl. `Sidebar`, `SiteFooter`, `BackLink`, `Button`.
- `src/styles/tokens.css` — the whole design system (cream/ink palette, lime-green
  accent `--accent: #9ff50a`, blue links, DM Sans + Geist Mono, zero border-radius).
  `public/logo.svg` is the only logo in use (the branded variant was retired).

## Recent work (all pushed to `main`)

**Pre-launch audit fixes, mobile-first rebuild, finder + favicons (2026-09-05, this
session — commits `7cf3c97`…`813de66`).**
- **Perceived perf:** added `(app)/loading.tsx` skeletons (no more blank-screen navigations)
  and wrapped `getAccount` in React `cache()` so the layout + page share one query per request.
- **Onboarding domain-first:** a no-pre-picks signup now hits a **domain step** in `/welcome`
  that runs the finder and seeds the editable watchlist, instead of blank URL rows.
- **Security — SSRF:** the daily check engine (`features/checks/fetchPage.ts`) now routes every
  fetch (page + robots.txt) through the SSRF-safe `safeFetch` (DNS/private-IP block, per-hop
  redirect re-validation, byte cap) — it previously used naive `fetch` and stored the response,
  an authenticated SSRF+exfil hole.
- **Error boundaries:** added `error.tsx`, `global-error.tsx`, `not-found.tsx`, and an
  `(app)/error.tsx` (keeps the shell) built on a shared `components/ErrorState`. No more bare
  "Application error" white screen.
- **Mobile app rebuild:** the authed shell was desktop-only (fixed 252px sidebar, no media
  queries). Now below 860px it's a fixed top bar + **bottom tab bar** + an **account sheet**
  (`components/Sidebar.tsx`); dialogs become **bottom sheets**; the Competitors board and all
  page paddings/grids reflow; inputs forced to 16px (no iOS zoom); safe-area insets. Desktop
  unchanged. Marketing/tools pages were already responsive (audited, no changes needed).
- **Competitor favicons:** see Deviations — `CompetitorAvatar` + `/api/favicon` first-party proxy.
- **Digest email + crons:** one-click unsubscribe + `List-Unsubscribe` headers; crons fail closed
  (see Deviations). New `features/digest/unsubscribe.ts` (token unit-tested).
- **Paddle webhook robustness:** falls back to customer-id even when a stamped userId matched
  nothing; an upgrade matching no user now returns 500 (Paddle retries + loud) instead of a
  silent 200; a downgrade matching nothing still acks. All no-match cases error-log with context.
- **Finder accuracy:** `gpt-oss-120b`, DNS URL verification, website-first copy, cleared stale
  results on a new lookup, and a de-cluttered "No competitors found" no-results state (see
  Deviations). Test count 126 → **130**.

**Homepage swap, onboarding polish, upsell + tax model (2026-09-05, all in production
on `gettrailwatch.com`).**
- **Routing swap:** the finder page is now the homepage `/` (indexed, JSON-LD); the
  animated landing moved to **`/1`** (`noindex`, canonical `/1`, signed-in→`/dashboard`);
  **`/try` removed (404)** — no links pointed at it. Shared bits (`MarketingSections`,
  `HeroScene`, `CloudScene`, `structuredData`, `page.module.css`) stayed at the group root;
  `/try`'s files moved to root (`CompetitorFinder`, `actions.ts`, `try.module.css`→`home.module.css`).
- **New signups land on `/welcome` directly** (`features/auth/actions.ts`): password
  `signUp`→`/welcome` (+ confirmation email `next=/welcome`), Google OAuth carries
  `next=/welcome` for signup / `/dashboard` for login (hidden field read by
  `signInWithGoogle`). `/welcome` is idempotent so it's safe universally; returning
  password logins still →`/dashboard`. `PendingSeedRedirect` stays as a safety net.
- **Onboarding UI:** the Choose-your-plan cards now match Plan & billing 1:1 by **reusing
  `ProPricingCard`** (square accent bullets, surface-sunken toggle w/ "Best value" badge);
  header rebuilt as logo-left/profile-right; **width bug fixed** (`.plansWrap`/`.wrap`
  `width:100%` — flex-column `.main` was collapsing them, so the earlier max-width bumps had
  no visible effect).
- **Add-competitor upsell** (free user at the limit): the "Upgrade to Pro" block no longer
  links to `/billing` — it renders the **shared `ProPricingCard`** and opens the **Paddle
  overlay in place** (Monthly/Annual toggle, annual default); on success it polls until the
  account flips to Pro and the page re-renders unblocked. Applies to competitor-limit AND
  page-limit upsells.
- **Competitors page empty state:** 0-competitor `ManageBoard` was a blank area; now a
  line-art page-under-magnifier SVG + "No competitors yet" + Add CTA. (Dashboard 0-state
  already had the demo dashboard / guided empty state — unchanged.)
- **Tax model — prices now EXCLUDE tax:** app shows "Plus applicable taxes — calculated at
  checkout" under the Pro price on the checkout surfaces (`ProPricingCard` + upsell;
  marketing landing left alone). And the **Paddle prices were flipped to tax-exclusive**
  (`tax_mode: external`, a dashboard change, not code) so GST is added **on top** of the
  $190/$19 base. Verified via Paddle's pricing-preview API for an India address:
  annual **$190 + $34.20 GST = $224.20**, monthly **$19 + $3.42 = $22.42**. See Deviations.
- `CLAUDE.md` gained the auto-generated `nextjs-agent-rules` block (written by `next dev`).

**`/try` interactive landing + competitor pre-seeding (2026-09-04).** A promotable,
`noindex` (canonical→`/`) landing variant for the Product Hunt launch. Same content
as `/` below the hero (extracted into `src/app/(marketing)/MarketingSections.tsx`,
shared by both so pricing/FAQ can't drift) — only the hero differs.
- **`/try` hero = "Find your competitors"** (`CompetitorFinder.tsx` + `try/actions.ts`
  → new `src/features/competitorFinder/`): enter your company (name/URL) → we ground on
  your site (`extractSite`) and LLM-suggest 3–4 direct competitors (Groq→Anthropic→null
  seam; declines return `{competitors:[]}` and providers catch errors so an unknown
  company degrades to manual entry, never a 500). Editable list, dirty-aware "Find
  competitors" button, one accent CTA at a time. Same homepage **sky** background
  (static, scrim for legible copy), square UI, WCAG-safe inks. The earlier teardown
  hero was replaced (the standalone teardown tool at `/tools/competitor-teardown`
  stays). It first went in as a teardown hero, then swapped to the finder per owner.
- **Pre-seeding:** the finder CTA stashes the chosen `{name,url}` list in
  `localStorage` (`tw_pending_competitors`) → signup. That onboarding (in the
  **chrome-free `(onboarding)` group**) prefills each competitor with its homepage
  page, lets the user **pick which N** via checkboxes capped at the free limit, and
  creates them via `seedCompetitors` (re-caps server-side, skips invalid; each seeded
  competitor gets exactly one page labeled `"Homepage"`). Over-limit / upgrade opens
  an **in-flow plans step** (`OnboardingPlanStep.tsx`, Free/Pro + Paddle checkout —
  a6e0256), not the billing page; the old `/billing?from=welcome` "Back to setup"
  link was removed (47526cd).

**Onboarding rework — runs for every signup + in-product UI (2026-09-04, merged to
`main` via PR #2 `onboarding-ui-parity`; deploying to production on Vercel).**
- **Every signup now onboards, not just `/try` pre-picks.** `PendingSeedRedirect`
  (dashboard 0-competitor state) sends **any** not-yet-onboarded user to `/welcome`,
  tracked by a `tw_onboarded` localStorage flag (set on successful setup) so it can't
  loop. Plain "Start free" signups (no `tw_pending_competitors`) get **blank watchlist
  rows** to fill in instead of bouncing to the dashboard.
- **Onboarding is now mandatory:** the "Skip for now" CTA was removed. A user who
  leaves mid-flow is re-routed to `/welcome` next empty-dashboard visit; Log out is
  the escape hatch.
- **UI parity:** both steps rebuilt on the shared `Button`/`PlusIcon` and mirror the
  add-competitor form styling (mono URL field, `Competitor / Homepage URL` column
  headers, bordered actions); bespoke button/input CSS deleted from
  `welcome.module.css`.
- **Homepage default** is spelled out: an intro note ("we watch each competitor's
  homepage; add up to N pages per competitor once you're in", N from the plan limit)
  + the column headers. Seed logic unchanged (still one Homepage page each).
- **Still needs authed E2E verification** (couldn't drive `/welcome` from the preview
  — it's behind auth): a fresh account should be forced through `/welcome`, blank-row
  and pre-pick paths both seed correctly, and no "Skip" is present.

**Landing motion polish (2026-09-04, no back-end change).** A per-step scroll-progress
rail on the pinned `StepsScroller` ("Set it once") that shows only on the active step;
a short content zoom-in on the pricing reveal in `CloudScene` (content settles ~60%
into the hold, after the cloud fully fades, while the sky keeps its longer zoom).

**Tooling:** `graphify-out/` is gitignored (local knowledge-graph artifacts from the
`/graphify` skill — per-machine, not shared).

**Domain migration → `gettrailwatch.com` + auth/email hardening (2026-09-01).**
- **Migrated** the app from the subdomain to `gettrailwatch.com`: one env var
  (`NEXT_PUBLIC_SITE_URL`) + all product-URL references renamed in code/docs; old
  subdomain 301-redirects. Verified live (canonical/OG/sitemap/robots on new domain,
  301 path+query preserved, AI-crawlers allowed on the new Cloudflare zone).
- **Email is now real:** Resend sending domain `gettrailwatch.com` verified (SPF+DKIM
  +DMARC all live); **Supabase custom SMTP → Resend** (so auth emails aren't rate-limited
  / generic); **"Confirm email" enabled** in Supabase.
- **Auth email links fixed for cross-device** (`src/app/auth/confirm/route.ts`): recovery
  + signup-confirmation emails now use Supabase's `token_hash` + `verifyOtp` flow instead
  of the PKCE code flow, so a link requested on a laptop and opened on a phone works. The
  Supabase **email templates** were repointed to
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery|email&next=…`.
  `/auth/callback` still handles Google OAuth (genuine PKCE). Login page now shows a
  proper "link invalid/expired" message (`?error=link`) vs the Google one.
- Google OAuth consent screen + authorized domains updated to `gettrailwatch.com`
  (kept the `*.supabase.co` authorized domain — required for the callback).
- **Marketing (earlier this session):** the three `/compare/*` pages
  (Visualping/Crayon/Kompyte) + shared `CompareTable`; `DISTRIBUTION.md` (phased,
  cost-tagged off-site playbook + step-by-step runbook) and `LAUNCH-COPY.md` (PH kit,
  AlternativeTo, Reddit/IH, X copy); a real **favicon** (`src/app/icon.svg`); an **LCP**
  fix (preload hero images); and the founder **X link** on the landing.

**Marketing lane 1 — AI Competitor Teardown tool (2026-08-31).** Shipped
`/tools/competitor-teardown`, the flagship linkable asset from `SEO.md` Layer 2:
paste a competitor URL → instant plain-English teardown (positioning, pricing
tiers, "what to watch") → "get this weekly → start free" CTA (`?src=teardown`).
New `src/features/competitorTeardown/` reuses `safeFetch` (SSRF) + cheerio and a
Groq→Anthropic→null provider seam mirroring `summaries`; unit-tested prompt parse
+ HTML→text. Guardrails: public pages only, ~4/min IP limit, page/text caps.
Verified end-to-end in-browser (real teardown of linear.app, SSRF error path,
JSON-LD, sitemap, mobile). Also folded in two `SEO.md` items: shared
`BreadcrumbList` JSON-LD (`src/components/breadcrumbJsonLd.ts`, on all four tools)
and `?src=teardown` CTA attribution. `SEO.md` updated to mark these done. The
owner's remaining marketing lanes (compare pages, blog, off-site playbook) are the
sequenced follow-ons — see below.

Before that, the last several sessions were a large **marketing-landing visual
overhaul** (no product/back-end logic changed — the §7 slices and tests untouched):

- **Hero** (`HeroScene`): full-sky background (`fullBG.webp`); pinned scene where copy
  fades and the product screenshot centers; foreground hill (`HillFG.webp`, flipped,
  rest 8.5%). Mobile hero is static layers with only the hill drifting.
- **"Set it once" steps** (`StepsScroller`): pinned 3-step scroller; the right panel is
  three built product-UI mockups (add-competitor, daily-check/noise-filter, and a
  Gmail-flavored weekly email) over Ghibli times-of-day backgrounds
  (`step-1/2/3-bg.webp`). Email sender shows `weekly@gettrailwatch.com`, CTA
  "Open dashboard", avatar uses the TrailWatch mark.
- **why→pricing cloud fly-through** (`CloudScene`): pins the "big tools" (why) section,
  zooms one cloud of `clouds.webp` through "the lens" (curved downward-arc path, whiteout
  guarantees full coverage, why layer hidden at the peak), and reveals the pricing section
  centered in its place. After the reveal it **holds** pinned for ~½ screen while the sky
  (`cloudreveal.webp`) zooms in on scroll. Desktop full-bleed sky is on `.cloudLayerPrice`;
  mobile puts it on `.cloudLayer .pricing` (see the double-background seam fix in
  `page.module.css`). The placeholder sky was `#bcdcf2`, now the real `cloudreveal.webp`.
- **Founder trust section** (`FounderReveal`): before/after image slider
  (`chandanghibli.webp` over `chandanoriginal.webp`) with caption "Chandan Dongre /
  Indie founder, TrailWatch".
- **Footer** now full-bleed `FooterHiils.webp` at the bottom; header/footer aligned to the
  1280/48 content width. The why callout is restyled like the product's active nav item
  (green accent bar on the left). Compare-table TrailWatch logo enlarged.
- **Copy / branding (2026-08-31):** the landing's trust copy now frames TrailWatch as built
  by **one indie founder** (was "founders / a studio / the people who built it"), and
  **"House of Ruga" was removed from all visible marketing copy** — see the branding note
  under Deviations. Kept in legal pages, footer copyright, SEO schema, and the domain/email.

Earlier (pre-overhaul) work still in place: pricing copy = monthly/annual Pro; shared
`SiteFooter` + the three `(legal)` pages; every logo uses `public/logo.svg`; signed-in
users redirected off `/` and `/login` to `/dashboard` (`src/proxy.ts`); cross-account
workflow (`HANDOFF.md` + `/handoff` skill + SessionStart hook); `.vercel/` gitignored.

## Switching between Claude accounts

The owner alternates between Claude accounts on this repo. Per-account memory does
not transfer — **git is the only shared memory.** Rules:

- **Never work from two accounts at once** — switch, don't run in parallel.
- **Start** each session with `git pull`; read `CLAUDE.md` → `SPEC.md` → this file.
- **End** each session by running **`/handoff`** (project skill at
  `.claude/skills/handoff/SKILL.md`) — it refreshes this file and pushes it.
- A **SessionStart hook** (`.claude/settings.json` →
  `.claude/hooks/handoff-check.sh`) warns at the start of every session if the
  working tree is dirty, commits are unpushed, or this file is 3+ commits stale —
  i.e. if the previous session didn't hand off cleanly. Local-only, never fetches.

## Environment variables

Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`.
Site/cron: `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`.
Email (Resend): `RESEND_API_KEY`, `EMAIL_FROM`, `COMP_EMAILS`.
Unsubscribe (optional): `UNSUBSCRIBE_SECRET` — HMAC key for the one-click digest
unsubscribe link; falls back to `CRON_SECRET` if unset, so nothing new is required.
LLM: `GROQ_API_KEY` and/or `ANTHROPIC_API_KEY`.
Paddle: `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `NEXT_PUBLIC_PADDLE_ENV`,
`NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY`,
`NEXT_PUBLIC_PADDLE_PRICE_PRO_ANNUAL`.

Post-migration values (Vercel Production): `NEXT_PUBLIC_SITE_URL=https://gettrailwatch.com`,
`EMAIL_FROM=TrailWatch <weekly@gettrailwatch.com>`. Auth email is sent via **Supabase
custom SMTP → Resend** (`smtp.resend.com:465`, user `resend`, password = a Resend API key)
— configured in the Supabase dashboard, not env. Supabase **Site URL** = the new domain,
and the recovery/confirm email templates point at `/auth/confirm` (token_hash flow).

## Commands & conventions

- `npm run dev` / `npm run test` / `npm run lint` / `npm run typecheck`.
- A pre-commit hook runs the tests and blocks the commit if they fail (currently
  126 passing).
- TypeScript strict; validate all external input. Keep functions small and pure,
  simplest approach, stay in scope (`SPEC.md` §6 is off-limits).

## Suggested next steps for whoever picks this up

**Domain-migration loose ends (owner, mostly done):**
1. **Finish Search Console / Bing on the new domain** — the `gettrailwatch.com` Domain
   property is verified (DNS TXT); submit the sitemap on both, then run GSC **Change of
   Address** from the old `trailwatch.houseofruga.com` property → new domain.
2. Update the **X profile Website** field to `gettrailwatch.com`.
3. Auth was verified working end-to-end (reset cross-device, signup confirmation, Google
   OAuth on the new domain). Digest **email send** to real users still wants a live test
   (part of §9 below).

**Onboarding + checkout (owner's active track):**
0. **Verify end-to-end on production with a real login** (all behind auth — couldn't be
   driven from the preview; only static/compiled + Paddle-API checks were possible):
   - Homepage `/` finder path: pick 3–4 → Start free → sign up → land **directly** on
     `/welcome` → pick which 2 (or Upgrade → in-flow plans step) → dashboard shows real
     competitors with baselines, demo gone.
   - Plain "Start free" path: sign up with no pre-picks → `/welcome` with **blank rows** →
     seeds correctly. Google + email-confirm signups also land on `/welcome`.
   - Free user at the 2-competitor limit → **Add competitor** → the upsell shows the shared
     Pro card with the **Monthly/Annual toggle** and opens the Paddle overlay in place.
   - **Checkout tax:** confirm the Paddle overlay now shows tax **added on top** ($224.20
     annual / $22.42 monthly for India), not baked into $190/$19.
   NB: the `/try` graduation question is **resolved** — the finder IS `/` now (indexed),
   animated landing is `/1` (noindex).

**Pre-launch (still the gate):**
4. Do a full `SPEC.md` §9 end-to-end pass in a test environment (`BACKLOG.md`) — the real
   Paddle sandbox checkout→flip→cancel loop and a real digest send. Auth email is now real
   (Supabase SMTP → Resend), so the signup/reset legs are effectively covered.
5. Replace the placeholder legal copy before launch (`(legal)` pages now have real drafts —
   needs a lawyer pass, not drafting).
6. Landing has **no automated coverage** for the scroll animations — manual QA on real
   desktop + mobile (effects gated ≥1041px, static/stacked fallback below).
7. **Walk the authed app on a real phone** — this session's mobile rebuild was verified by
   compiling every route + a mock harness, not a live logged-in session. Open the digest link →
   `/dashboard`, tap the bottom tabs, open the account sheet, add/delete a competitor (bottom
   sheets), and confirm it all reads well on a 375px screen.

**Audit blockers from this session — DONE** (SSRF, error boundaries, mobile, email unsubscribe,
fail-closed crons, webhook no-match). Remaining finder idea if niche-company misses persist:
`groq/compound` (Groq's free web-search model) as a grounding step — a spike, not started.

**Marketing (owner's active track — see `DISTRIBUTION.md` + `LAUNCH-COPY.md`):**
7. Lanes done: teardown tool, 3 compare pages, distribution playbook + copy kit. Remaining
   lanes: `/compare/*` #4+ (optional), a blog, and executing the off-site playbook
   (AlternativeTo ×3 first). GEO: AI crawlers are allowed on the new zone.

### Marketing / SEO (owner is actively working these — see `SEO.md`)

The owner wants to keep pushing marketing + backlink generation. Lane 1 (AI
Competitor Teardown tool) is done. Remaining lanes, in the owner's chosen order —
each gets its own plan when picked up:
1. **`/compare/*` pages** — 2–3 honest alternative pages (Visualping alternative,
   vs Crayon, Kompyte alternative). Cheap static pages; add to `sitemap.ts`.
2. **Blog / content engine** — MDX under `(marketing)/blog/` + first SEO articles;
   add to sitemap; per-post OG image.
3. **Off-site distribution playbook** — non-code doc (directories, Product Hunt,
   Indie Hackers, subreddits, outreach targets) pitching each free tool as the
   linkable asset.
Owner still-to-do from `SEO.md` Layer 1: verify the subdomain in Google Search
Console + Bing (needs account access).

_Resolved 2026-08-26: Pro copy fixed to 100 pages; Stripe→Paddle wording
reconciled across `SPEC.md` and `CLAUDE.md`._
