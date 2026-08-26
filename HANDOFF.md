# HANDOFF.md — Competitor Radar / TrailWatch

Cross-session build state, written so a fresh Claude Code session (or a different
account) can continue without prior chat memory. **Read `SPEC.md` for scope and
`CLAUDE.md` for working rules first**, then this for "where things actually are".

_Last updated: 2026-08-26._

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
- **Plan limits** (`src/features/plan/limits.ts`): free = 2 competitors × 3 pages
  each (6 total); paid = 10 competitors × 10 pages each (100 total). Pro pricing:
  `$19/mo` monthly or `$190/yr` annual (2 months free), via `PRO_MONTHLY_USD` /
  `PRO_ANNUAL_USD`. Landing pricing copy now says Pro = "100 pages", matching the
  enforced 100-page limit (owner-confirmed 2026-08-26).

## Where things live (organized by domain, per CLAUDE.md)

- `src/features/` — `account`, `auth`, `billing`, `changes`, `checks`, `competitors`,
  `demo`, `digest`, `plan`, `summaries`. The noise filter (`isMeaningfulChange`) and
  the Paddle signature verify are the pure, unit-tested functions.
- `src/app/(marketing)/` — landing at the subdomain root `/`.
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

## Recent work (this session, all pushed to `main`)

- Removed the mock `$19/mo` from the landing dashboard screenshot.
- Updated pricing copy to the monthly/annual Pro option (see the ⚠️ pages note above).
- Added a shared `SiteFooter` (logo, tagline, legal links, copyright) + the three
  legal pages under `(legal)`.
- Switched every logo to the regular `public/logo.svg`; deleted all `logo-branded.svg`
  usage (the file still sits in `public/` but is unreferenced).
- Signed-in users are now redirected off `/` and `/login` to `/dashboard`
  (`src/proxy.ts`); signing out restores the marketing page.
- Set up the cross-account workflow (see below): this `HANDOFF.md`, a `/handoff`
  skill, and a SessionStart warning hook. Also gitignored `.vercel/`.

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
  70 passing).
- TypeScript strict; validate all external input. Keep functions small and pure,
  simplest approach, stay in scope (`SPEC.md` §6 is off-limits).

## Suggested next steps for whoever picks this up

1. Do a full `SPEC.md` §9 end-to-end pass in a test environment; fix what fails.
2. Replace the placeholder legal copy and the footer support email
   (`SUPPORT_EMAIL` in `src/components/SiteFooter.tsx`) before launch.

_Resolved 2026-08-26: Pro copy fixed to 100 pages; Stripe→Paddle wording
reconciled across `SPEC.md` and `CLAUDE.md`._
