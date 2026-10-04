# CLAUDE.md — Trailwatch (DTC pivot)

Persistent context for Claude Code. Read `SPEC.md` before starting any feature,
`PIVOT_PLAN.md` for the phase plan and recorded decisions, and `HANDOFF.md` for the
current build state before continuing in a fresh session.

## Project

A bootstrapped, solo SaaS, mid-pivot: **competitive briefings for US Shopify DTC brands.**
Users add competitor stores by domain; we track their catalogs (launches, prices, sales,
stock) and key pages, turn changes into typed events with a severity, send **instant alerts**
for high-severity moves and a **Monday briefing** that interprets what it means for the
user's own products. The edge is **interpretation** — and low noise (cosmetic changes never
reach the user). The pre-pivot "founder edition" lives on `archive/founder-edition` /
tag `v1-founder-edition` — never modify, rebase, or delete them, and never force-push.

## Tech stack

- Next.js (App Router, TypeScript, strict mode) on Vercel
- Supabase (Postgres + Auth + RLS; Storage for catalog snapshots; `pg_cron` + `pg_net` for
  sub-daily scheduling — Vercel Cron is daily-only on our plan)
- Anthropic: Haiku for classification, Sonnet (Batch API + prompt caching) for briefings.
  Model IDs live ONLY in `src/features/ai/models.ts`. Groq is a legacy fallback.
- Resend for transactional email
- Paddle for billing (sandbox; billing disabled during the free beta)

## Commands

- `npm run dev` — local dev server
- `npm run test` — run tests
- `npm run lint` — lint
- `npm run typecheck` — TypeScript check
- DB migrations: `supabase/migrations/NNNN_*.sql`, applied by the owner in the Supabase SQL
  editor (no direct DB connection in `.env.local`). Note every new migration + env var in
  `PIVOT_PLAN.md`.

## How to work here

- **Read `SPEC.md` first.** It is the source of truth for scope and behavior.
- **Plan before multi-file changes.** Use plan mode; outline the change before editing.
- **One pivot phase at a time**, in the order in `SPEC.md` §7. After each phase: tests +
  lint + typecheck, summarize, commit with a `pivot:` prefix, and **wait for the owner's
  go-ahead before pushing** or starting the next phase.
- **Use the simplest possible approach.** Do not add abstractions, helper layers, wrapper
  utilities, or config that the current phase does not need. No premature refactoring.
- **Stay in scope.** Anything under `SPEC.md` §6 (Out of scope) must not be built — in
  particular, don't touch the landing/marketing/SEO pages (but don't break them). If a change
  seems to need it, stop and flag it instead of building it.
- **Ask before adding any new paid third-party service.**
- **UI is built 1:1 from the owner's Claude Design artboards** — read the relevant artboard
  in full, build every state, use tokens from `DESIGN_SYSTEM.md`, never guess visuals. If a
  screen has no artboard yet, build the backend and stop.

## Conventions

- TypeScript strict; validate all external input (URLs, form data, webhook payloads).
- Organize by feature/domain (auth, stores, catalog, events, alerts, briefing, billing), not
  by technical layer.
- Keep functions small and pure where possible — especially the noise filter, catalog diff
  and severity routing, which must be pure, testable functions. Severity rules, the
  marketplace denylist, caps and cadences live in config, not scattered conditionals.
- Clear names over cleverness. Comment only non-obvious logic.

## Security

- Never commit secrets or API keys. All keys go in environment variables.
- Only fetch **public**, non-authenticated pages. Respect robots.txt and use timeouts + a
  descriptive User-Agent. Never store personal data from scraped pages.
- Verify Paddle webhook signatures. Never trust client-supplied plan/limit values.
- Every outbound fetch goes through the SSRF-safe `safeFetch`. Crawl politely: delay
  between catalog pages, back off on 429/5xx, identify as TrailwatchBot.
- Slack webhook URLs are user-supplied outbound targets — accept only `https://hooks.slack.com/`
  and never expose them to the client after saving.

## Testing (only where money or data is at stake)

- Required (`SPEC.md` §8): platform detection, catalog pagination, snapshot diffing (every
  event type), severity routing + throttling, marketplace denylist, robots.txt wildcards,
  the noise filter, and the Paddle webhook (price → plan).
- A pre-commit hook must block commits when tests fail.
- Do not chase exhaustive coverage — manual QA covers the rest.

## Definition of done

The pivot is done when the checks in `SPEC.md` §9 pass. Bugs in secondary paths get fixed
from real user reports — do not block launch on them.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
