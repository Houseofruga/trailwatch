# HANDOFF.md — Competitor Radar / TrailWatch

Cross-session build state, written so a fresh Claude Code session (or a different
account) can continue without prior chat memory. **Read `SPEC.md` for scope and
`CLAUDE.md` for working rules first**, then this for "where things actually are".

_Last updated: 2026-08-31._

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
  working domain/email/user-agent (`trailwatch.houseofruga.com`, `trailwatch@houseofruga.com`).
  Do not reintroduce "House of Ruga" into hero/landing/app prose. One domain today; future
  products go on their own subdomains under the same org.
- **Plan limits** (`src/features/plan/limits.ts`): free = 2 competitors × 3 pages
  each (6 total); paid = 10 competitors × 10 pages each (100 total). Pro pricing:
  `$19/mo` monthly or `$190/yr` annual (2 months free), via `PRO_MONTHLY_USD` /
  `PRO_ANNUAL_USD`. Landing pricing copy now says Pro = "100 pages", matching the
  enforced 100-page limit (owner-confirmed 2026-08-26).

## Where things live (organized by domain, per CLAUDE.md)

- `src/features/` — `account`, `auth`, `billing`, `changes`, `checks`, `competitors`,
  `demo`, `digest`, `plan`, `summaries`. The noise filter (`isMeaningfulChange`) and
  the Paddle signature verify are the pure, unit-tested functions.
- `src/app/(marketing)/` — landing at the subdomain root `/`. `page.tsx` composes four
  scroll-driven client components: `HeroScene` (pinned full-sky hero), `StepsScroller`
  ("Set it once" 3-step pinned scroller with built product-UI mockups), `CloudScene`
  (pins why→pricing and flies a cloud through to reveal pricing), `FounderReveal`
  (before/after Ghibli image slider). All scroll effects are desktop-only (≥1041px, no
  reduced-motion); each has a static/stacked fallback. Also `tools/` (sitemap-finder,
  robots-txt-tester, when-was-a-website-last-updated) — small public utility pages.
- `src/app/(auth)/` — `login`, `forgot-password`, `reset-password`.
- `src/app/(app)/` — authed shell: `dashboard`, `competitors`, `billing`, `settings`,
  `changes/[id]`. Guarded by `src/proxy.ts` + a belt-and-braces check in the layout.
- `src/app/(legal)/` — `terms`, `privacy`, `refunds` (placeholder content, real routes).
- `src/app/api/cron/` — `check` (daily) and `digest` (weekly), Bearer-guarded by
  `CRON_SECRET`. Schedules in `vercel.json`: check `0 7 * * *`, digest `0 8 * * 1`.
- `src/components/` — shared UI incl. `Sidebar`, `SiteFooter`, `BackLink`, `Button`.
- `src/styles/tokens.css` — the whole design system (cream/ink palette, lime-green
  accent `--accent: #9ff50a`, blue links, DM Sans + Geist Mono, zero border-radius).
  `public/logo.svg` is the only logo in use (the branded variant was retired).

## Recent work (all pushed to `main`)

The last several sessions were a large **marketing-landing visual overhaul** (no
product/back-end logic changed — the §7 slices and their tests are untouched):

- **Hero** (`HeroScene`): full-sky background (`fullBG.webp`); pinned scene where copy
  fades and the product screenshot centers; foreground hill (`HillFG.webp`, flipped,
  rest 8.5%). Mobile hero is static layers with only the hill drifting.
- **"Set it once" steps** (`StepsScroller`): pinned 3-step scroller; the right panel is
  three built product-UI mockups (add-competitor, daily-check/noise-filter, and a
  Gmail-flavored weekly email) over Ghibli times-of-day backgrounds
  (`step-1/2/3-bg.webp`). Email sender shows `weekly@trailwatch.houseofruga.com`, CTA
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
LLM: `GROQ_API_KEY` and/or `ANTHROPIC_API_KEY`.
Paddle: `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `NEXT_PUBLIC_PADDLE_ENV`,
`NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_PRICE_PRO_MONTHLY`,
`NEXT_PUBLIC_PADDLE_PRICE_PRO_ANNUAL`.

## Commands & conventions

- `npm run dev` / `npm run test` / `npm run lint` / `npm run typecheck`.
- A pre-commit hook runs the tests and blocks the commit if they fail (currently
  104 passing).
- TypeScript strict; validate all external input. Keep functions small and pure,
  simplest approach, stay in scope (`SPEC.md` §6 is off-limits).

## Suggested next steps for whoever picks this up

1. Do a full `SPEC.md` §9 end-to-end pass in a test environment; fix what fails.
2. Replace the placeholder legal copy before launch (footer support email is
   `trailwatch@houseofruga.com` — confirm it's live).
3. Set up Resend subdomain sending for `weekly@trailwatch.houseofruga.com` (DKIM/SPF/MX/
   DMARC on Cloudflare) so the digest sends from the subdomain shown in the landing mockup.
4. Landing is visually polished but has **no automated coverage** (scroll animations are
   verified by hand in-browser). Manual QA on real desktop + mobile before launch;
   the scroll effects are gated to ≥1041px and fall back to static/stacked below that.

_Resolved 2026-08-26: Pro copy fixed to 100 pages; Stripe→Paddle wording
reconciled across `SPEC.md` and `CLAUDE.md`._
