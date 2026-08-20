# CLAUDE.md — Competitor Radar

Persistent context for Claude Code. Read `SPEC.md` before starting any feature.

## Project

A bootstrapped, solo SaaS. Users add competitor page URLs; the system checks them daily,
filters out trivial changes, summarizes meaningful ones with an LLM, and emails a weekly
digest. Free tier + one paid Stripe tier. The product's whole edge is **low noise** — a
readable digest, never a raw diff.

## Tech stack

- Next.js (App Router, TypeScript, strict mode)
- Supabase (Postgres + Auth)
- Vercel Cron (daily check job + weekly digest job)
- Anthropic API for change summaries (cheapest/fastest model — verify current model string in docs)
- Resend for transactional email
- Stripe for billing (Checkout + webhooks)

## Commands

- `npm run dev` — local dev server
- `npm run test` — run tests
- `npm run lint` — lint
- `npm run typecheck` — TypeScript check
- (add DB migration command here once set up)

## How to work here

- **Read `SPEC.md` first.** It is the source of truth for scope and behavior.
- **Plan before multi-file changes.** Use plan mode; outline the change before editing.
- **Build in vertical slices** in the order given in `SPEC.md` §7. Get one slice working
  end-to-end before starting the next.
- **Use the simplest possible approach.** Do not add abstractions, helper layers, wrapper
  utilities, or config that the current slice does not need. No premature refactoring.
- **Stay in scope.** Anything under `SPEC.md` §6 (Out of scope) must not be built. If a change
  seems to need it, stop and flag it instead of building it.

## Conventions

- TypeScript strict; validate all external input (URLs, form data, webhook payloads).
- Organize by feature/domain (auth, competitors, checks, digest, billing), not by technical layer.
- Keep functions small and pure where possible — especially the noise filter, which must be
  a pure, testable function.
- Clear names over cleverness. Comment only non-obvious logic.

## Security

- Never commit secrets or API keys. All keys go in environment variables.
- Only fetch **public**, non-authenticated pages. Respect robots.txt and use timeouts + a
  descriptive User-Agent. Never store personal data from scraped pages.
- Verify Stripe webhook signatures. Never trust client-supplied plan/limit values.

## Testing (only where money or data is at stake)

- Unit-test the noise filter (`isMeaningfulChange`) with fixture pairs.
- Test the Stripe webhook handler (plan flips to paid on checkout, reverts on cancel).
- A pre-commit hook must block commits when tests fail.
- End each feature with the matching end-to-end check from `SPEC.md` §9.
- Do not chase exhaustive coverage — manual QA covers the rest for the MVP.

## Definition of done

The MVP ships when the six end-to-end checks in `SPEC.md` §9 pass by hand. Bugs in
secondary paths get fixed from real user reports — do not block launch on them.
