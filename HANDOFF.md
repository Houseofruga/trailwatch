# HANDOFF.md — Competitor Radar / TrailWatch

Cross-session build state, written so a fresh Claude Code session (or a different
account) can continue without prior chat memory. **Read `SPEC.md` for scope and
`CLAUDE.md` for working rules first**, then this for "where things actually are".

_Last updated: 2026-09-08 (shipped: change-detail is now an overlay modal via an intercepting @modal route; dashboard multi-change expandable row (v3); editing a page URL now re-checks + re-profiles it (was leaving a stale "can't reach"); finder shows more competitor logos (favicon robustness + real Exa URLs); plus dashboard/modal UI polish. Still owed: Pro price raise on the Paddle dashboard ($29/$290) — code is display-only. Earlier: back-nav real browser-back; watched URLs require a real public domain; onboarding rework; auth Terms/Privacy + legal breadcrumbs)._

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

**Day-0 value expansion — COMPLETE (2026-09-06, across two sessions).** A deliberate
Phase-2-style expansion beyond `SPEC.md` §6, owner-driven, to justify the paid tier:
adding a page now gives immediate in-app value instead of a dashboard that's empty
until the first cron change. All four pieces are shipped, pushed, and verified live:
**Phase 1 (instant baseline profile)**, **Phase 2 (Wayback historical backfill)**,
the **adaptive dashboard** (value-forward when quiet, feed-forward when active), and
**background warming** (baseline + history pre-built after add/onboarding via Next's
`after()`). See Recent work. Two DB migrations (`0005`, `0006`) were added and
**applied to the hosted Supabase**; a different environment must apply them too.

**v3 UI overhaul — COMPLETE across the authed app (2026-09-06, this session).** The
owner supplied a Claude Design canvas (`trailwatch v3/`, committed like `v2`) and asked
to apply its visual design over the existing functionality. Done + verified live for:
app shell/Sidebar, Competitors (baseline+history as paired toggle **pills**), Billing,
Dashboard (v3 pass over the adaptive layout), Settings (grouped card), Change detail
(web-archive badge + callout), Add competitor + Auth/login (already matched), plan cards
(plain feature lists), and **Onboarding** — both the v3 visuals AND the proper v3 step-1↔
step-2 state machine (Pro-intent, "Select all & go Pro" → Pro-only "Check the benefits"
vs "Choose your plan"). **Owner decisions:** keep the **plain trailwatch logo** (NOT the
canvas's "by House of Ruga" lockup — the branding rule below stands); use **real values**
(not the mock's $15/$180/40); and **keep the existing animated landing** (`/1`) + finder
homepage (`/`) — the v3 canvas's simple static landing was NOT built. Typecheck/lint/build
clean; 137 tests pass.

**v3 follow-up fixes — DONE + verified live (2026-09-06, this session, commit `1bceeee`).**
Five owner asks on the v3 authed UI + a reworked quiet dashboard row. **Migration `0007`
was added and applied to the hosted Supabase this session — every other environment must
apply it.** See Recent work + Deviations. Highlights: unreachable/404 pages are now
surfaced everywhere (persisted `last_check_status`); the quiet dashboard row is a single
Wayback-sourced line ("Last notable change on <date> (Nd ago)" linked, else "No notable
change in the last 180 days"); background backfill warming now runs in the daily cron for
all pages, not just newly-added ones. 137 tests pass; verified with a real logged-in Pro
account (arrow, contrast, a 404 page end-to-end, the quiet line, and the dropdown).

**Summary-pipeline + quiet-card fixes — DONE + verified live (2026-09-06, this session,
commits `e0fbdae`…`8cd2126`, pushed).** A round of fixes triggered by an archive change
showing "(summary unavailable)". Two real *live-pipeline* bugs were found and fixed: the
Groq summarizer truncated mid-sentence (reasoning model ate the token budget) and was
"diff-blind" (only saw the first 2000 chars of each full page, so real changes lower down
were wrongly declined). Then: quiet dashboard cards now show the last-notable **summary**
(not just a date) with the **lime chevron chip** matching active rows; "Recent history" on
Competitors now includes **live** changes (was archive-only), newest-first, with archive
rows tagged "Web archive"; the 404 error line on Competitors was indented to the URL; copy
updated to reflect the **instant on-add baseline**; and backfill now retries a flaky decline
and never leaves "(summary unavailable)". The 13 pre-existing archive rows with that
fallback text were **re-summarised in the hosted DB** via a new repair script. All verified
live in the sandbox (Pro account, magic-link); 137 tests pass, typecheck/lint clean. No new
migrations. See Recent work + Deviations.

## Deviations from SPEC.md / CLAUDE.md (important)

These docs predate some decisions — trust the code, and reconcile the docs when
convenient:

- **Change detail is an overlay modal via an intercepting route (2026-09-08).** In-app clicks on
  `/changes/[id]` open the detail as a full-screen overlay over the current page (no left nav; 20px
  gap all sides, 10% scrim, X top-right, inner scroll) — it does NOT reload/replace the page behind
  it, so closing keeps that page's scroll/state. Built with a Next 16 parallel `@modal` slot +
  intercepting route: `src/app/(app)/@modal/(.)changes/[id]/page.tsx` (renders
  `ChangeDetailModal` + `ChangeDetailView`), `@modal/default.tsx` (null — REQUIRED by Next 16), and
  `@modal/[...catchAll]/page.tsx` (null, so soft-nav elsewhere unmounts it); `(app)/layout.tsx` takes
  the `modal` slot. A **direct visit / refresh / shared link** isn't intercepted and renders the
  **full page** (`changes/[id]/page.tsx`) with the sidebar — the owner-chosen fallback. Content is
  shared via `ChangeDetailCrumb` + `ChangeDetailBody` (both page and modal); `getChangeDetail(id,now)`
  in `changes/queries.ts` is the shared demo/real fetch. New `CloseIcon` in `components/icons.tsx`.
- **Editing a page URL re-checks + re-profiles it (2026-09-08).** `updatePage`
  (`competitors/actions.ts`) used to write only url/label, leaving a fixed URL showing the OLD
  "can't reach"/404 (and stale baseline/history/profile) until the nightly cron. Now, when the URL
  actually changes, it clears `last_check_status`/`last_check_error`, deletes the page's
  snapshots/changes/`page_insights`, nulls `latest_snapshot_id`/`backfilled_at`, then re-captures the
  new URL immediately (`captureBaselines` → clean first-check, no spurious change) and `warmPages`.
  Label-only edits are untouched. Deletes/resets use the **service client** (RLS gives users only
  read on snapshots/changes). Also: `PageIntel` now shows a quiet "We couldn't profile this page yet
  — we'll try again." note when the AI declines/errs, instead of rendering nothing.
- **Finder logos: favicon robustness + real URLs (2026-09-08).** `fetchFavicon` now probes the
  `www` host + post-redirect origin and more icon paths (favicon.png/.svg, apple-touch-icon-
  precomposed, icon.svg), bounded. And the finder corrects the model's guessed homepage with Exa's
  real result domains (a conservative name match in `competitorFinder/find.ts`; `exa.ts` now returns
  structured `{title, domain}` candidates) — fixing wrong domains like `loopshq.com`→`loops.so`.
  Still first-party only (no third-party icon service). Pages the AI/fetch genuinely can't handle
  fall back to initials + the note above.
- **Billing is Paddle** (docs now reconciled — `SPEC.md` and `CLAUDE.md` say Paddle).
  Webhook at `src/app/api/webhooks/paddle/route.ts`, signature verify in
  `src/features/billing/verifyPaddleSignature.ts` (unit-tested), plan resolution in
  `src/features/billing/resolvePlanChange.ts`.
- **Summaries are provider-pluggable.** `src/features/summaries/index.ts` picks
  Groq (`GROQ_API_KEY`) if present, else Anthropic (`ANTHROPIC_API_KEY`, model
  `claude-haiku-4-5`). Adding/swapping a provider is one new file + one line here.
  **Two fixes (2026-09-06, `e0fbdae`):** (1) Groq's `gpt-oss-20b` is a reasoning model
  and was truncating summaries mid-sentence — now `reasoning_effort: "low"` +
  `max_tokens: 700` (`summaries/groq.ts`). (2) The prompt was **diff-blind** — it sent
  the first 2000 chars of each full page, so on a long page the shared top boilerplate
  looked identical and the model wrongly declined a real change lower down. `prompt.ts`
  now feeds the model the actual **changed lines** via a shared `diffLines()` helper
  exported from `checks/noiseFilter.ts` (one definition of "what changed" for both the
  filter and the summarizer), falling back to truncated full text for within-line edits.
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
  `$29/mo` monthly or `$290/yr` annual (2 months free; per-month equiv `$24.17`), via
  `PRO_MONTHLY_USD` / `PRO_ANNUAL_USD` (**raised from $19/$190 on 2026-09-07, commit `518de7e`**).
  Landing pricing copy now says Pro = "100 pages", matching the enforced 100-page limit
  (owner-confirmed 2026-08-26). **These are DISPLAY-ONLY** — the actual charge is the Paddle
  price behind `NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY` / `_ANNUAL`. **Owner must set $29/$290 in
  the Paddle dashboard (new price IDs → repoint the env vars) for the raise to be real; until
  then checkout still charges the old amount while the site shows the new one.**
- **Prices exclude tax (2026-09-05, amounts updated 2026-09-07).** The shown $290/yr and $29/mo
  are the pre-tax base; Paddle (Merchant of Record) adds the buyer's local tax **on top** at
  checkout (India GST 18% → $342.20 / $34.22; VAT/sales tax elsewhere). This is a **Paddle
  dashboard** setting (both Pro prices have `tax_mode: external`), NOT in code — don't look for it
  in the repo.
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
- **Day-0 value beyond SPEC §6 (owner-driven, 2026-09-06).** SPEC §6 says "in-app change
  history beyond recent changes" is out of scope until paying users ask — the owner is
  driving this expansion anyway to justify $19 on day 0. Two shipped pieces:
  - **Phase 1 — instant baseline profile** (`src/features/insights/`, migration `0005_page_insights`).
    Per active page on the Competitors screen, a cached AI "What we're now watching" card,
    generated once from the page's baseline snapshot — no re-fetch. `getOrCreatePageInsight` reads
    RLS-scoped, writes via service role, caches in `page_insights` (owner-scoped SELECT policy only).
    UI is `PageIntel.tsx` (the old `BaselinePanel.tsx` was consolidated — see v3 notes).
    **REWORKED 2026-09-07 (`f39dab1`, `071af13`):** the card is now **page-focused**, not
    company-level. It originally reused the `competitorTeardown` seam fed a single page, so every
    page of a competitor showed the SAME (and drifting) whole-company positioning, plus a confusing
    "What to watch" list that named OTHER pages. Now insights has its **own** page-focused provider
    seam (`insights/prompt.ts` + `insights/provider.ts`, Groq→Anthropic→null, `reasoning_effort:"low"`)
    that describes what THIS page shows; `PageProfile` is `{ summary, pricingTiers }`
    (`positioning`→`summary`, `title`/`whatToWatch` dropped). The public teardown tool
    (`competitorTeardown/*`, `/tools/competitor-teardown`) is unchanged and stays company-level. When
    the shape changed, existing `page_insights` rows were cleared so they regenerate page-focused
    (lazy on view + via warm/cron). NB: `PageIntel` uses the canonical `live`-flag effect (a
    `startedRef` guard + StrictMode once left it stuck on the skeleton — fixed).
  - **Phase 2 — Wayback historical backfill** (`src/features/backfill/`, migration
    `0006_change_source`). A collapsed **"Recent history"** timeline per page (`HistoryPanel.tsx`,
    beside the baseline) reconstructs recent changes from the Internet Archive: CDX capture list
    (`collapse=digest`, **capped at 4** recent captures → ≤3 diffs) → raw `id_` fetch via the
    hardened `safeFetch` → the SAME `extract`/`normalize`/`hash` → the pure `isMeaningfulChange`
    → the existing summarizer seam → stored as `changes` rows with `source='archive'`,
    `from/to_snapshot_id=null`, excerpts on the row, `detected_at`/`compared_from_at` = the
    capture dates. Lazy-on-expand + cached via `pages.backfilled_at` (stamped before the work →
    runs once). `maxDuration=60` on the competitors route. Archive rows are kept OUT of the
    "this week" dashboard feed (`competitors/queries.ts` filters `source!=='archive'`) and the
    weekly digest (`digest/build.ts` guard + they're old-dated); the change-detail renders them
    with a Wayback provenance note and the archive before-date. New migration columns:
    `changes.source`, `changes.compared_from_at`, `pages.backfilled_at`.
  - **Adaptive dashboard** (`dashboard/page.tsx`, `DashboardBaseline.tsx`). The dashboard
    is now value-forward when quiet, feed-forward when active. Quiet week → header reframes
    to "All quiet — exactly the point"; a quiet-but-active page renders a value card (cached
    baseline positioning + pricing chips via `DashboardBaseline`, a compact client cmpt
    reusing `loadPageInsight`) plus a "last notable change" link **only if history already
    exists** — it never triggers a backfill. Active pages (meaningful change this week) keep
    the change link; competitors/pages with movement sort first. `queries.ts` now exposes
    each page's most recent archive change as `lastArchived` (a cheap read off rows already
    fetched, kept out of the "this week" feed). Paused pages stay a plain state.
    **SUPERSEDED by `1bceeee`, then extended by `0f00680`:** `DashboardBaseline` is gone.
    A quiet page's row now shows the **last notable change's summary** (clamped to 2 lines,
    calmer than an active row) with `Last notable change · <date> (Nd ago)` beneath, the
    whole card linking to the diff and carrying the **same lime chevron chip** as an active
    row (`--accent-wash`/`--accent-ink`, per the v3 design) — `dashboard/page.tsx`
    `lastNotable()` picks the newest of the live/`lastArchived` meaningful changes. When
    there's no notable change: `No notable change in the last 180 days` (once `backfilledAt`
    is set) else `Checking history…`. No AI baseline blurb. `queries.ts` exposes
    `backfilledAt` + `lastArchived`. Broken/unreachable pages render an error row (see the
    404 deviation) instead of a quiet card.
  - **Background warming** (`competitors/warm.ts`, wired into `createCompetitor`,
    `addPages`, `seedCompetitors`). After add/onboarding, `warmPages()` pre-builds each new
    page's baseline + Wayback history via Next 16's **`after()`** (post-response, same
    invocation). Bounded (`MAX_WARM_PAGES = 6`) and best-effort; the `/competitors/add` and
    `/welcome` routes have `maxDuration = 60`. **Updated `1bceeee`:** warming no longer does
    the removed `pageFreshness`; and the daily cron (`runDailyChecks`) now runs the same
    Wayback backfill for **every** page never backfilled (`backfilled_at` null), bounded
    `MAX_BACKFILL_PER_RUN = 8`/run and guarded once-per-page — so "Last notable change" fills
    in across all pages over the daily runs, not just newly-added/clicked-into ones.
- **"Recent history" now merges live + archive (2026-09-06, `c70cebf`).** `getPageHistory`
  (`backfill/queries.ts`) previously filtered `source='archive'`, so a page's most recent
  *live-detected* change never appeared in its own Competitors "Recent history" pill (it only
  showed on the dashboard). It now returns all meaningful changes newest-first; `PageIntel`
  tags archive-sourced rows "Web archive" and the note reads "Recent changes, newest first."
- **Backfill summaries retry a flaky decline (2026-09-06, `de4ff31`).** Archive changes are
  already judged meaningful by the noise filter, so a "declined as trivial" verdict from the
  nondeterministic Groq model was just noise (it left rows reading "<reason> (summary
  unavailable)"). `backfill.ts` now retries the summarizer once on a decline and, on genuine
  failure, uses plain user-facing wording ("This page changed — open it to see what's
  different.") — never the internal filter reason. **Repair scripts** `scripts/inspect-archive.ts`
  + `scripts/resummarize-archive.ts` (`8cd2126`) list/re-summarise rows still carrying the old
  fallback from stored excerpts (no Wayback refetch); idempotent, `--dry`. Run once this session
  → 0 rows left with "(summary unavailable)" in the hosted DB.
- **Auth consent + cookies (2026-09-07).** Login/signup shows "By continuing, you agree to our
  Terms and Privacy Policy" (links to `/terms`, `/privacy`, opened in a **new tab**) — in
  `features/auth/AuthForm.tsx`, both modes, covering Google + email. Legal pages carry a breadcrumb
  (Home › Legal › page) instead of a back link. **No cookie-consent banner** exists or is required:
  the app uses only essential/functional first-party storage (Supabase auth cookie; `localStorage`
  onboarding keys `tw_pending_competitors` / `tw_pending_company` / `tw_onboarded`) and Paddle's
  checkout cookies — **no analytics or tracking**. Privacy policy §6 says so. **If any analytics or
  marketing tracker is ever added, an EU-style opt-in consent banner becomes mandatory** — add it then.
- **Digest send time is 08:00 UTC Monday** (`vercel.json` `0 8 * * 1`); UI copy says "Mondays at 8am
  UTC". The dashboard's broken-page "Edit URL" opens the shared `EditPageDialog` modal in place
  (`DashboardEditUrl`), and the Competitors kebab item + dialog title are "Edit URL" (not "Edit page").
- **Back navigation is real browser-back (2026-09-07, `56b9e24`).** The shared `components/BackLink`
  is now a client component that reads a generic **"Back"** (chevron kept, destination name dropped).
  Default `mode="history"` renders a `<button>` that does `window.history.length > 1 ? router.back()
  : router.push(href)` — so it returns the user to wherever they came from, with the old hardcoded
  route kept only as a **fallback** for direct landings (email links, fresh tabs). `mode="link"`
  renders a fixed `<Link href>` for places where browser-back is unsafe. Call sites pass their old
  route as the fallback: change-detail → `/dashboard` (its redundant footer "Back to this week" link
  was removed), add-competitor → `/competitors` or `/dashboard`, edit-competitor → `/competitors`,
  forgot-password → `mode="link"` `/login`. Error/404 (`ErrorState.HomeLink`) deliberately kept as a
  fixed `/dashboard` **button** CTA (browser-back would bounce back into the broken page).
- **Watched URLs must be a real public domain (2026-09-07, `eb66be1`).** The shared `pageUrl` schema
  (`features/competitors/validation.ts`) gained a `hasPublicDomain` refine (hostname must end in a dot
  + a ≥2-letter TLD). `z.url()` alone accepted `https://asdf` (a dotless host is legal to the URL
  parser), so the onboarding "Add competitor" modal — which normalizes bare input to `https://…`
  before validating — appeared to accept junk. The refine sits at the single choke point, so it fixes
  every entry point at once (onboarding modal, main Add form, Add/Edit-page dialogs, server-side
  `pageRow`). Rejects `asdf`, `localhost`, raw IPs, and 1-char TLDs; real domains/paths/subdomains
  unaffected. Covered by `features/competitors/validation.test.ts`.
- **Sandbox seed script** (`scripts/seed-sandbox.ts`, dev tooling, run with
  `npx tsx --env-file=.env.local scripts/seed-sandbox.ts`). Idempotent Pro + Free **test**
  users (`pro-test@ / free-test@trailwatch.test`, throwaway passwords in the file) with sample
  competitors/pages/snapshots (Free seeded at its 2-competitor limit to exercise the upsell),
  optional baseline pre-warm, and **magic-link logins** minted via the Auth admin API (so a
  browser can log in without typing a password). `--teardown` removes them. Writes to the
  HOSTED project via the service-role key (no local Supabase — Docker isn't installed).
- **Vitest now resolves the `@/` alias** (`vitest.config.ts`) so tests can import modules that
  use it (the check pipeline reused by backfill does). Test count **130 → 137**.
- **v3 UI specifics (2026-09-06):**
  - `account.changesThisWeek` (new field on `getAccount`, one indexed count query) powers the
    Dashboard nav badge + mobile-tab badge (meaningful non-archive changes in the last 7 days).
    NOTE: the sidebar usage-card header was reverted to pre-v3 per owner — plan name only, no
    inline price, divider restored (`.usagePrice` CSS is now unused but left in place).
    The Dashboard active change-row chip uses an SVG right **chevron** (not a → arrow).
  - Competitors baseline + history are now ONE component — `src/app/(app)/competitors/PageIntel.tsx`
    (paired pills, one panel open at a time). The old `BaselinePanel.tsx`/`HistoryPanel.tsx` were
    **deleted**; the dashboard still has its own `DashboardBaseline.tsx`.
  - Plan-card feature lists are **plain** (no bullet markers) — the shared `ProPricingCard`
    (`.feature`) drives Billing, onboarding step 2, and the add-competitor upsell together.
  - Onboarding (`/welcome`, `WelcomeOnboarding.tsx`) — **REWORKED 2026-09-07** (commits
    `7093800`, `5a3bf15`, `4729801`). It's now plan-aware and single-screen for the watchlist:
    - **Existing Pro users skip the Free/Pro plan step entirely** — the primary button is
      "Start watching" (green/primary), which seeds the picks and goes straight to the
      dashboard; no `StepIndicator` shown (single step). **Free** users are unchanged:
      "Continue" → the Free/Pro plan step (`OnboardingPlanStep`), "1 — 2" indicator, and the
      Pro-intent path ("Select all & go Pro" → "Check the benefits" vs "Choose your plan").
    - **The separate first "domain" step is gone.** Everyone lands on the watchlist step, which
      now carries the **finder search bar** (same `findCompetitorsAction` as the homepage),
      **pre-seeded** with the company the visitor typed on the homepage (new `tw_pending_company`
      localStorage stash, written in `CompetitorFinder.persistPending`). A search **merges**
      suggestions into the list (dedup by URL, keeps curated picks, respects the free cap); the
      "Find competitors" button only appears once the input differs from the last/pre-seeded
      query (mirrors the homepage `dirty` logic). A no-picks visitor just starts with an empty
      list + the search bar.
    - **"Add one yourself instead" opens a modal** (`AddCompetitorDialog.tsx`, reuses
      `EditPageDialog.module.css`) collecting competitor name + homepage URL, adding a normal
      selected toggle row. The old inline name/URL editable rows are removed (`Row.editing` gone).
  - `trailwatch v3/` (the design canvas) is committed + eslint-ignored, like `trailwatch v2/`.
  - Landing was deliberately NOT changed to the v3 static mock — the animated `/1` + finder `/`
    stay (owner decision).

## Where things live (organized by domain, per CLAUDE.md)

- `src/features/` — `account`, `auth`, `backfill`, `billing`, `changes`, `checks`,
  `competitors`, `competitorFinder`, `competitorTeardown`, `demo`, `digest`, `insights`,
  `lastUpdated`, `plan`, `robotsTester`, `sitemapFinder`, `summaries`. (`insights` = Phase-1
  baseline; `backfill` = Phase-2 Wayback history — both reuse existing seams, see Deviations.) The noise filter (`isMeaningfulChange`),
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
- `src/components/` — shared UI incl. `Sidebar`, `SiteFooter`, `BackLink` (client, real
  browser-back — see Deviations), `Button`.
- `src/styles/tokens.css` — the whole design system (cream/ink palette, lime-green
  accent `--accent: #9ff50a`, blue links, DM Sans + Geist Mono, zero border-radius).
  `public/logo.svg` is the only logo in use (the branded variant was retired).

## Recent work (all pushed to `main`)

**Change-detail modal + finder logos + edit-URL re-check + UI polish (2026-09-08, commits
`65ad7d5`…`f6b3942`).** All shipped + verified live in the sandbox; typecheck/lint clean, 143 tests.
See Deviations for the load-bearing details.
- **Dashboard multi-change row** (`65ad7d5`): active rows show the newest change inline + a
  "N more this week" disclosure to the week's other changes (v3 design canvas `dashboard multi-change/`).
- **Change detail as an overlay modal** (`4f51719`, `0a2f96b`): intercepting `@modal` route; 20px gap,
  10% scrim, header (competitor + page + X), padded scroll body; external links use the blue `--link`.
- **Dashboard/hover/badge polish** (`36358e3`, `2a92b41`, `bb07104`): change rows have no
  background/opacity hover — hovering an item greens only its own summary (`--accent-ink`), applied to
  the active rows, sub-rows, the Competitors "Recent history" list, and the quiet card (which also got
  the `→` arrow chip); the sidebar Dashboard badge is a black chip with a white count.
- **Finder logos** (`9379d15`): favicon robustness + Exa real-URL correction (see Deviations).
- **Edit-URL re-check** (`f6b3942`): editing a page URL now re-checks + re-profiles it, and PageIntel
  shows a note instead of vanishing when profiling declines (see Deviations).

**Back-nav fix + URL domain validation (2026-09-07 — commits `56b9e24`, `eb66be1`, pushed).**
- **Back navigation** (`56b9e24`): every back control was a hardcoded link to a fixed route, so a
  user who reached `/changes/[id]` from Competitors was still sent to `/dashboard`. `BackLink` now
  does real `router.back()` with the old route as a fallback, reads a generic "Back" (chevron kept),
  and the redundant change-detail footer link was removed. Auth forgot-password uses the shared
  control (`mode="link"` → `/login`); error/404 kept as fixed-target button CTAs. Verified live
  (Competitors → Add → Back returned to `/competitors`). See Deviations.
- **URL validation** (`eb66be1`): the "Add one yourself instead" modal appeared to skip URL
  validation — really the shared `pageUrl` rule accepted any syntactic URL, so a normalized
  `https://asdf` passed. Added a `hasPublicDomain` refine (dot + ≥2-letter TLD) at the shared choke
  point; fixes onboarding modal + all add/edit flows + server. New unit fixtures; 141 tests pass.
  Verified live in the onboarding modal (`asdf` blocked with an inline error, `linear.app` accepted).
  See Deviations.

**Pro price raised $19→$29 / $190→$290 in code (2026-09-07 — commit `518de7e`, pushed).**
Display values only: `plan/limits.ts` (`PRO_MONTHLY_USD` 29, `PRO_ANNUAL_USD` 290, `PLAN_PRICE`),
which feed billing/ProPricingCard/onboarding/settings; hardcoded copy in `structuredData.ts`
(FAQ + Offer prices), the landing `MarketingSections.tsx` ($24.17/mo, $290/yr, $29/mo), and the 3
compare-page FAQs; test updated. **NOT YET REAL:** the Paddle dashboard prices must be changed to
$29/$290 (new price IDs → repoint `NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY`/`_ANNUAL`) — see Suggested
next steps. Until then the site shows $29/$290 but checkout still charges the old amount.

**Onboarding rework + auth/legal + dashboard UX (2026-09-07 — commits `08b6af6`…`acdcc99`,
pushed).**
- **Onboarding** (`7093800`, `5a3bf15`, `4729801`): existing **Pro users skip the Free/Pro plan
  step** (single-step, no indicator, green "Start watching" → dashboard); the **domain step is
  gone** — the watchlist step now carries the **finder search bar** pre-seeded with the homepage
  company (new `tw_pending_company` stash), a search **merges** results (dedup, keeps picks, free
  cap), and the CTA only shows when the query changes; **"Add one yourself instead" is now a modal**
  (`AddCompetitorDialog`, reuses the EditPageDialog chrome) — inline editable rows removed. See the
  onboarding deviation for details.
- **Auth Terms/Privacy** (`acdcc99`): a consent line — "By continuing, you agree to our Terms and
  Privacy Policy" — on the login/signup card (both modes, Google + email), linking to `/terms` and
  `/privacy` **in a new tab**. The legal pages (terms/privacy/refunds) swapped their "Back to home"
  link for a **breadcrumb** (Home › Legal › page) + `BreadcrumbList` JSON-LD, matching tools/compare.
  Privacy §6 (Cookies) tightened to cover cookies + local storage and state **no consent banner is
  needed** (no analytics/trackers — verified none in the codebase; add a banner the day analytics is
  introduced).
- **Dashboard/competitors UX** (`08b6af6`, `9d50ca4`, `936021a`): digest copy now says
  **"Mondays at 8am UTC"**; the dashboard broken-page **"Edit URL" opens the EditPageDialog modal
  in place** (new `DashboardEditUrl`) and the Competitors kebab item + dialog title were renamed
  **"Edit page" → "Edit URL"**; the seeded **demo dashboard** active rows got the lime chevron chip
  and the example box got proper top spacing; the dashboard **"Last notable change" line is tagged
  "Web archive"** when the pick is archive-reconstructed (matches Recent history).
- Verified live in the sandbox throughout (Pro/Free onboarding, auth pages, demo dashboard);
  typecheck/lint clean, 137 tests. No new migrations.


**Baseline card reworked page-focused (2026-09-07 — commits `f39dab1`, `071af13`; pushed).**
The Competitors "What we're now watching" card was showing a generic, company-level blurb that
drifted page-to-page (the homepage and pricing pages of the same competitor gave two different
Notion descriptions) and a "What to watch" list that named OTHER pages.
- `f39dab1`: removed the confusing **"What to watch"** section from the card (it was company-level
  "which pages to monitor" guidance, redundant per page). Dropped `whatToWatch` from the insights
  `PageProfile` (the public teardown tool keeps its own).
- `071af13`: gave insights its **own page-focused generation seam** (`insights/prompt.ts` +
  `insights/provider.ts`) instead of reusing the company-level teardown. The card now describes
  what THIS page shows — pricing card → the plans + tiers; homepage → the positioning message;
  changelog → what they ship. `PageProfile` is now `{ summary, pricingTiers }`. Cleared the 14
  cached `page_insights` rows so they regenerate in the new shape. Verified live in the sandbox
  (Notion Home vs Pricing now describe their own pages). Owner decisions this session: keep the
  card **per-page** (not competitor-level) and **remove** "What to watch". typecheck/lint/137 tests
  green; no new migration.

**Summary-pipeline + quiet-card fixes (2026-09-06, this session — commits `e0fbdae`,
`0f00680`, `74c2f45`, `6817e7c`, `de4ff31`, `c70cebf`, `8cd2126`; pushed to `8cd2126`).**
- **Groq summary truncation** (`summaries/groq.ts`): `gpt-oss-20b` reasoning ate the 256-token
  budget → summaries cut off mid-sentence. Now `reasoning_effort: "low"` + `max_tokens: 700`.
- **Summarizer diff-blindness** (`summaries/prompt.ts` + `checks/noiseFilter.ts`): the prompt
  saw only the first 2000 chars of each full page and wrongly declined real changes lower down.
  Now feeds the actual changed lines via a shared `diffLines()` helper.
- **Quiet dashboard cards show the summary** (`dashboard/page.tsx` + css): last-notable summary
  (2-line clamp) + date beneath + the lime chevron chip matching active rows; whole card links
  to the diff. (Corrected mid-session from a grey right-chip → inline blue → the design's lime
  chip per owner.)
- **Recent history includes live changes** (`backfill/queries.ts`, `types.ts`, `PageIntel.tsx`
  + css): merged live+archive newest-first; archive rows tagged "Web archive".
- **Competitors 404 line aligned to the URL** (`competitors/page.module.css`, `.rowError` 128px).
- **Copy** (`dashboard/page.tsx`, `competitors/add/AddForm.tsx`, `PageIntel.tsx`): reflect the
  instant on-add baseline ("We capture each page the moment you add it, then check daily").
- **Backfill retry + fallback** (`backfill.ts`) and **repair scripts** — see Deviations. The 13
  legacy "(summary unavailable)" archive rows were re-summarised in the hosted DB (0 left).
- Verified live in the sandbox (Pro account, magic-link); typecheck/lint clean, 137 tests. No
  new migrations.

**v3 follow-up fixes (2026-09-06, this session — commit `1bceeee`).**
- **URL arrow:** Competitors URL rows use a new SVG `ExternalLinkIcon` (was the `↗` glyph).
- **WCAG:** the "Quiet" sub-label + "Quiet this week" / "Not being checked" moved off
  `--ink-hint`/`--ink-5`/`--ink-faint` (~1.3–2.9:1) to `--ink-3` (~5:1, passes AA).
- **404 / unreachable pages** (see Deviations): migration `0007` adds
  `pages.last_check_status` + `last_check_error`; `safeFetch` exposes the HTTP status,
  `runCheck` persists 'broken' (4xx) vs 'error' (transient) and clears to 'ok' on success;
  add-time flash says "returned 404 — check the URL"; the dashboard renders a "Can't reach /
  HTTP 404 / Edit URL" row and Competitors a "Can't reach" badge + message (PageIntel hidden).
- **Quiet dashboard row → Wayback "last notable change"** (see Deviations): dropped the AI
  baseline blurb; one line now — `Last notable change on <date> (Nd ago)` (linked to the
  diff) when we have one, else `No notable change in the last 180 days` (plain), else
  `Checking history…`. Backfill window narrowed to 6 months (`HISTORY_MONTHS` 18→6) with the
  capture cap raised 4→8 so "180 days" is honest. The interim `pageFreshness` feature (a
  "Last updated" date from the last-updated finder) was built then removed in favour of this.
- **Background warming across all pages:** the daily cron (`runDailyChecks`) now also
  reconstructs Wayback history for any page never backfilled (bounded `MAX_BACKFILL_PER_RUN=8`
  per run, guarded once-per-page), so "Last notable change" fills in everywhere over time.
- **Settings** removed from the desktop profile dropdown (still in the sidebar nav).

**v3 UI overhaul (2026-09-06, this session — commits `2bf5d12`…`ff96fc3`).** Applied the
`trailwatch v3/` Claude Design canvas over the existing authed app, screen by screen,
verified live in a sandbox each step:
- Sidebar: plan price in the usage head, Dashboard changes-this-week badge
  (`account.changesThisWeek`), Settings in the profile menu (kept the custom nav icons +
  Add page/Edit/Delete icons + plain logo per owner).
- Competitors: baseline + history consolidated into `PageIntel.tsx` — two toggle **pills**
  ("What we're now watching" / "Recent history"), one panel open at a time.
- Billing: v3 scale, "Full change history & archive" Pro feature, amber cancelling note.
- Dashboard: v3 pass over the adaptive layout (lime "All quiet" pulse, colored stat icons,
  arrow chips on active rows, tinted quiet/paused rows).
- Settings: sections grouped into one bordered card.
- Change detail: "Web archive" badge + amber provenance callout for Phase-2 rows.
- Plan cards: dropped the square-bullet markers → plain feature lists (shared ProPricingCard).
- Onboarding: v3 step indicator + toggle-row watchlist (step 1) + the proper step-1↔step-2
  state machine (Pro-intent → "Check the benefits" vs "Choose your plan"). See Deviations.
- NOT changed (owner): the Landing — animated `/1` + finder `/` stay; the v3 static landing
  mock was not built.

**Design brief for the v2 redesign (2026-09-06).** Added `DESIGN-BRIEF.md` at the repo
root — a delta spec of everything dev has shipped/hosted since the "TrailWatch v2" design
file, written to feed **Claude Design** (a separate tool) so it redesigns the screens in
the v2 visual language; the redesigns come **back here to develop**. Covers, per route with
all states: the adaptive **Dashboard** (§1) and full **Competitors** manage board incl. the
baseline/history panels, row kebab menu, dialogs, upsell (§2), plus Change detail,
Onboarding, Billing, Settings, Auth, and marketing/legal. Keeps the v2 tokens fixed
(cream/ink, lime `#9ff50a`, DM Sans + Geist Mono, zero radius) and the **custom icon set**
(`src/components/icons.tsx` + a handful of unicode glyphs; **no external icon library**).
No code changed — this is a design-handoff artifact only. Paste-ready per-screen
follow-ups were also drafted in chat (not stored) for revising the already-pasted brief.

**Day-0 value: adaptive dashboard + background warming (2026-09-06, this session —
commit `f6e44e9`).** Completes the Day-0 expansion.
- **Adaptive dashboard** (`dashboard/page.tsx`, new `DashboardBaseline.tsx`): quiet-week
  header reframe, quiet-page value cards (baseline + pricing chips), "last notable change"
  link when history already exists, and movement-first ordering. `queries.ts` gained
  `lastArchived` per page. See Deviations for the full shape.
- **Background warming** (new `competitors/warm.ts`): `after()`-based post-response warming
  of baseline + Wayback history on add/onboarding, wired into `createCompetitor`/`addPages`/
  `seedCompetitors`; `/competitors/add` + `/welcome` got `maxDuration=60`.
- **Verified live** (seeded Pro account, local dev against hosted Supabase): the quiet
  dashboard rendered real baselines + pricing tiers (Notion/Linear) with no console errors;
  a freshly-added page (vercel.com) showed its baseline generated (`groq`) and backfill run
  (`backfilled_at` stamped) in the DB **without** visiting Competitors — proving warming.
  137 tests pass. NB: verification used the sandbox seed's magic-link login; the full §9
  production pass (real Paddle loop, real digest send) is still owed.

**Day-0 value: baseline profiles + Wayback history + sandbox (2026-09-06, this session —
commits `5c2fb1c`…`c9279aa`).**
- **Phase 1 — instant baseline profile** per page on the Competitors screen (`src/features/insights/`,
  `BaselinePanel.tsx`, migration `0005`). Cached "What we're now watching" card reusing the
  teardown provider. Verified live in the sandbox (Notion tiers, Linear positioning). Fixed a
  StrictMode bug that stuck the panel on its skeleton.
- **Phase 2 — Wayback historical backfill** (`src/features/backfill/`, `HistoryPanel.tsx`,
  migration `0006`). Collapsed "Recent history" timeline reconstructed from the Internet Archive,
  capped at 4 captures, reusing the whole check pipeline; stored as `source='archive'` changes,
  kept out of the feed + email, linking to the change-detail (with a Wayback note). Verified live:
  Linear/Home → a real reconstructed change ("Sub-Teams → Linear for Agents", 18 Apr 2025).
- **Sandbox seed** (`scripts/seed-sandbox.ts`) + **vitest `@/` alias**. See Deviations. 137 tests.
- (The adaptive dashboard + background warming that were "next" here are now DONE — see the
  `f6e44e9` entry above.)

**Pre-launch audit fixes, mobile-first rebuild, finder + favicons (2026-09-05, prior
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
  137 passing).
- TypeScript strict; validate all external input. Keep functions small and pure,
  simplest approach, stay in scope (`SPEC.md` §6 is off-limits).

## Suggested next steps for whoever picks this up

**OPEN DECISION — dashboard multi-change row cap (owner).** The multi-change expandable row is
shipped (see Deviations), but its design file (`dashboard multi-change/Dashboard Multi-Change Row.dc.html`)
case 4 (~5 changes) **caps the sub-list at 3** with a blue *"Older changes — see all N on
{Competitor}'s {Page} history"* link. Per the owner's instruction it currently shows **ALL** changes
(no cap, no link). If you switch to the capped version, that link needs a destination — there is
**no per-page history route** yet, so one must be built (or the link pointed at the Competitors page).
- **Test data note:** this session inserted synthetic `changes` rows into the sandbox `pro-test@`
  account (Notion/Linear pages) to exercise the cases; they vanish on the next `scripts/seed-sandbox.ts` run.

**v3 UI overhaul — COMPLETE (2026-09-06).** The `trailwatch v3/` canvas came back and has
been developed across the whole authed app (see Recent work + Deviations). Remaining:
- **Verify on production with a real login** — all v3 work was verified locally via the
  sandbox magic-link flow against hosted Supabase, not on `gettrailwatch.com` (this env can't
  reach that domain — Cloudflare/Vercel edge is blocked here; both curl and the in-app browser
  fail on it, though other sites load). Hard-refresh + check each authed screen in prod.
- **Landing stays as-is** (owner decision) — do NOT swap in the v3 static landing.
- Sandbox onboarding test users exist (`onb-test@`, `onb2-test@trailwatch.test`) from live
  flow testing; harmless, delete if you want to tidy.

**Day-0 value — COMPLETE (2026-09-06).** The adaptive dashboard and background warming are
shipped and verified (commit `f6e44e9`; see Recent work + Deviations). Nothing left in this
track except:
- **Apply migrations `0005` + `0006` in any new environment** (already applied to the hosted
  project). Re-run `scripts/seed-sandbox.ts` to get test logins.
- **A real production/authed pass would still help:** confirm the adaptive dashboard and the
  `after()` warming behave the same on Vercel (function budget under load, `after()` firing in
  prod) — local verification used the sandbox seed's magic-link login against hosted Supabase.

**Domain-migration loose ends (owner, mostly done):**
1. **Finish Search Console / Bing on the new domain** — the `gettrailwatch.com` Domain
   property is verified (DNS TXT); submit the sitemap on both, then run GSC **Change of
   Address** from the old `trailwatch.houseofruga.com` property → new domain.
2. Update the **X profile Website** field to `gettrailwatch.com`.
3. Auth was verified working end-to-end (reset cross-device, signup confirmation, Google
   OAuth on the new domain). Digest **email send** to real users still wants a live test
   (part of §9 below).

**⚠️ Pro price raise — Paddle side still owed (owner, blocking the raise):**
The code now shows **$29/mo · $290/yr** (commit `518de7e`) but that's display-only. To make the
raise real: in the **Paddle dashboard** create new Pro monthly ($29) + annual ($290) prices
(tax-exclusive, `tax_mode: external`), repoint `NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY` /
`_ANNUAL` (Vercel Production) to the new price IDs, and redeploy. Decide grandfather-vs-migrate for
existing subscribers (they keep the old price unless migrated). **Until this is done, the site shows
$29/$290 but checkout charges the old $19/$190 — do not launch the raise until the overlay matches.**

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
   - **Checkout tax:** confirm the Paddle overlay now shows tax **added on top** ($342.20
     annual / $34.22 monthly for India at 18% GST), not baked into $290/$29.
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
