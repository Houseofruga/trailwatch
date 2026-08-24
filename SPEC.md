# SPEC.md — Competitor Radar MVP

> This is the implementation spec for Claude Code. It is intentionally scoped to the
> smallest thing that delivers the core value: **a user adds competitor pages and
> receives a plain-English weekly digest of what actually changed.**
> Anything not listed under "In scope" is out of scope for the MVP — do not build it.

---

## 1. What we're building

A web app where a user adds a few competitor page URLs, the system checks them daily,
detects meaningful text changes, summarizes each change in plain English using an LLM,
and emails the user a weekly digest. Free tier + one paid tier via Stripe.

The single differentiator is **low noise**: trivial changes must be filtered out, and
each surfaced change must come with a short, readable summary — not a raw diff.

---

## 2. Tech stack

Recommended (swap any layer for what you're fastest in — but keep it boring and few moving parts):

- **Frontend + backend:** Next.js (App Router, TypeScript)
- **DB + Auth:** Supabase (Postgres + Supabase Auth)
- **Scheduled jobs:** Vercel Cron (or Supabase scheduled functions) — a daily check job and a weekly digest job
- **Change summaries:** Anthropic API, cheapest/fastest model (Claude Haiku tier) to control cost — verify the current model string in the API docs
- **Email:** Resend (transactional)
- **Billing:** Stripe (Checkout + webhooks)

Constraint: total infra cost must stay under ~$50/mo at MVP scale. Prefer free tiers.

---

## 3. Data model

```
users            # profile row per auth user
  id (uuid, = auth user id)
  email
  plan               # 'free' | 'paid'
  stripe_customer_id # nullable
  last_digest_sent_at (timestamp, nullable)
  created_at

competitors        # a competitor is a named group of pages
  id (uuid)
  user_id (fk users)
  name
  created_at

pages              # one monitored URL
  id (uuid)
  competitor_id (fk competitors)
  url
  label              # e.g. 'pricing', 'homepage', 'blog'
  is_active (bool, default true)
  last_checked_at (timestamp, nullable)
  latest_snapshot_id (fk snapshots, nullable)
  created_at

snapshots          # captured content of a page at a point in time
  id (uuid)
  page_id (fk pages)
  content_text       # normalized main-content text
  content_hash       # hash of content_text for fast equality
  fetched_at

changes            # a detected meaningful change between two snapshots
  id (uuid)
  page_id (fk pages)
  from_snapshot_id (fk snapshots)
  to_snapshot_id (fk snapshots)
  summary            # LLM plain-English summary
  diff_excerpt       # short before/after excerpt for context
  detected_at
```

Notes:
- Digests are **derived** from `changes` in the last 7 days — do not store a digest table for MVP.
- Enforce plan limits in application logic (see §5).

---

## 4. Plan limits

| | Free | Paid |
|---|---|---|
| Competitors | 2 | 10 |
| Pages per competitor | 3 | 10 |
| Check frequency | daily | daily |
| Digest | weekly email | weekly email |

(Instant/daily alerting and more channels are Phase 2 — not now.)

---

## 5. In scope — features & behavior

### F1. Auth (self-serve)
- Email/password or Google sign-in via Supabase Auth.
- On first sign-in, create a `users` row with `plan = 'free'`.
- No manual onboarding steps.

### F2. Add / manage competitors and pages
- User creates a competitor (name), then adds one or more pages (url + label).
- Enforce plan limits from §4 — block with a clear message + upgrade prompt when exceeded.
- User can edit label, pause/resume (`is_active`), and delete pages and competitors.

### F3. Daily check engine (scheduled job)
For each `page` where `is_active = true`:
1. Fetch the URL with a plain HTTP GET (no headless browser). Set a sane timeout and a
   descriptive User-Agent. Respect robots.txt; skip and log if disallowed.
2. Extract the **main content text** (readability-style extraction; strip nav/footer/scripts).
3. Normalize: collapse whitespace, drop volatile boilerplate (timestamps, CSRF tokens, etc.).
4. Compute `content_hash`. If equal to the latest snapshot's hash → no change; update
   `last_checked_at` and stop.
5. If different, run the **noise filter** (F4). If the change is not meaningful → store the
   new snapshot (so future diffs are against current) but create **no** `change` row.
6. If meaningful → create a new `snapshot`, generate a summary (F5), create a `change` row,
   and update `latest_snapshot_id` + `last_checked_at`.

The job must be resilient: one failing URL must not break the batch. Log fetch errors per page.

### F4. Noise filter (the core differentiator — unit-tested)
A pure function `isMeaningfulChange(oldText, newText) -> { meaningful: bool, reason: string }`.
- Ignore whitespace-only and case-only differences.
- Ignore changes below a small character/line threshold unless they touch price/number/CTA-like tokens.
- Ignore obviously volatile fragments (dates, counters, session tokens).
- This function MUST have unit tests with fixtures (see §8).

### F5. Change summary (LLM)
- Input: the meaningful diff (old vs new main text, or a focused excerpt).
- Prompt the model to return a **one-to-two sentence** plain-English summary of what changed
  and, if obvious, why it might matter — no raw HTML, no fluff.
- If the model judges the diff to be trivial, it may return a "no meaningful change" signal;
  in that case suppress the change (belt-and-suspenders with F4).
- Store the summary on the `change` row. Keep prompts/token use small (cost control).

### F6. Weekly digest (scheduled job)
- Runs weekly per user.
- Collect that user's `changes` from the last 7 days.
- If there are changes → send an email (Resend) grouping changes by competitor, each line =
  page label + summary + link to the page. Update `last_digest_sent_at`.
- If there are **no** changes → send nothing (do not email "nothing changed").

### F7. Dashboard
- List competitors → their pages → recent changes (summary + detected_at + link).
- Add/edit/delete/pause controls from F2.
- Show current plan and an Upgrade button.
- Empty state for a brand-new user that guides them to add their first competitor.

### F8. Billing (Stripe)
- Upgrade via Stripe Checkout (one paid plan, monthly, USD).
- Webhook handler updates `users.plan` on `checkout.session.completed` and reverts on
  cancellation/subscription deletion. Store `stripe_customer_id`.
- Webhook handler MUST be unit/integration-tested (see §8) — this touches money.

---

## 6. Out of scope (do NOT build for MVP)

Headless/JS rendering · screenshot or visual (pixel) diffs · Slack/Discord/Teams/webhook alerts ·
instant or hourly alerting · visual element/CSS selector UI · team seats / multi-user accounts ·
public API · native mobile app · multiple paid tiers · in-app change history browser beyond
"recent changes." These are Phase 2+, only after paying users ask.

---

## 7. Build order (vertical slices — ship each working before the next)

1. **Auth + empty dashboard.** User can sign up, log in, see an empty dashboard, sign out.
2. **Add competitor + page + list them.** CRUD for competitors/pages with plan limits enforced.
3. **Check engine + noise filter, manually triggerable.** A dev endpoint runs the check for one
   page; changed content produces a snapshot + (if meaningful) a change row. Unit-test F4.
4. **LLM summary on detected changes.** Change rows get plain-English summaries.
5. **Dashboard shows recent changes.** Competitor → pages → changes with summaries and links.
6. **Weekly digest email.** Wire the scheduled job; verify the email for a user with changes and
   the no-send for a user without.
7. **Daily check on a schedule.** Move the manual trigger to the daily cron.
8. **Stripe billing.** Checkout + webhook flips plan; limits update live. Test the webhook.

Each slice must work end-to-end before starting the next. Prefer the simplest approach; do not
add abstractions, helper layers, or config that a slice doesn't need yet.

---

## 8. Tests (only where it hurts — money + data)

- **`isMeaningfulChange` (F4):** unit tests with fixture pairs — whitespace-only (not meaningful),
  price change (meaningful), added paragraph (meaningful), timestamp-only (not meaningful).
- **Stripe webhook handler (F8):** given a `checkout.session.completed` event, `plan` becomes
  `'paid'`; given a cancellation event, `plan` reverts to `'free'`.
- Add a pre-commit hook that blocks commits when tests fail.
- No exhaustive coverage elsewhere for MVP — manual QA covers the rest.

---

## 9. End-to-end verification (the definition of "done")

The MVP is done when all of these pass by hand in a test environment:

1. A new user signs up, adds a competitor with one page URL, and sees it on the dashboard.
2. Running the check when the page's content has changed creates a change row **with an
   AI summary**; running it when nothing changed creates **no** change row.
3. A whitespace-only or timestamp-only change produces **no** change row (noise filter works).
4. The weekly digest job emails a user who has changes (grouped, with links) and sends
   **nothing** to a user with none.
5. A free user is blocked from adding a 3rd competitor; completing Stripe Checkout (test mode)
   flips them to paid and lifts the limit immediately.
6. Cancelling the subscription reverts the user to the free plan and re-applies the limit.

When 1–6 pass, stop building and ship. Fix everything else from real user reports.
