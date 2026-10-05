# BACKLOG.md — Competitor Radar / Trailwatch

Post-MVP items intentionally deferred. Newest at top. When you pick one up, move
the reasoning into a commit, not here.

## 🚀 PRE-LAUNCH — do NOT launch to real users before clearing these

- **Set up an isolated test/staging environment.** ⚠️ _Remind the owner before
  launch._ Today `.env.local` points at a **single Supabase project** (Paddle is
  already sandbox). That means local testing and any pre-launch change can create
  junk data in — and potentially **email real users from** — what may be the
  production database. Before launch, stand up:
  - a **separate Supabase test project** (free tier) — its own URL + keys,
  - a **test Resend** setup (or a safe test recipient) so digest sends can't hit
    real users,
  - keep Paddle on **sandbox** for the test env.
  This is the prerequisite for the safe workflow the owner wants: test any live-app
  change in staging first, then promote to production.

- **Run the SPEC §9 live-integration steps in that test env.** The *logic* of all
  six §9 checks is verified (89 unit tests + a live-LLM pipeline check + code
  inspection, done 2026-08-28). What still needs a real run, once the test env
  above exists: (1) UI signup → add competitors to hit the free limit → dashboard;
  (4) an actual digest **email send** via Resend; (5)+(6) a real Paddle **sandbox
  checkout → plan flips to paid → cancel → reverts to free**. These need the
  owner (account creation + entering the test card can't be automated).

## Landing page rework: live 2026-10-06

The reworked homepage is live at `/` (DESIGN 15-landing A, with the earlier hero,
three-step scroller and cloud scene kept). The previous homepage is at `/v1`, not
indexed. Left to do:

- Delete `/v1` (`src/app/(marketing)/v1`, `MarketingSections.tsx`, the old `FAQ` in
  `structuredData.ts`, and their styles in `page.module.css`) once the owner no
  longer wants it for reference.
- The page says Starter includes comparing with your own products (`SPEC.md` §4).
  The plan checks in the code still treat it as Pro only; change before billing.
- The live "X of 25 spots left" line appears once 5 beta spots are taken
  (`src/app/(marketing)/home/betaSpots.ts`).

## SEO / growth — parked 2026-10-02, resumed 2026-10-04 (content pages built from DESIGN 14-content)

Plan and status: `SEO_PLAN.md`. Live so far: `/tools` hub and all four free tools.

- **Submit the new pages in Google Search Console** (owner): `/tools`,
  `/tools/shopify-store-checker`, `/tools/store-snapshot`, `/tools/sale-checker`,
  `/tools/competitor-finder`.
- **Black Friday guides** (time-sensitive: publish by ~2026-10-20). G1 draft is ready for
  owner review in `content/guides/competitor-black-friday-sale-start.md`; G2 (checklist) and
  G3 (real vs fake discounts) not started. Needs a **guide-page design** in Claude Design first.
- **Evergreen guides G4–G9** and **comparison pages C1–C6** (Visualping rewrite, Prisync,
  Price2Spy, Particl, spreadsheet, Google Alerts) — need a comparison-page design.
- **Result-card designs** for store snapshot / sale checker / competitor finder: built from
  existing parts; match them if the owner designs specific ones.
- **Homepage hero line**: optionally change "…and what to do about it" to "…and one move to
  make this week" (matches the briefing card).
- **Old founder-edition competitor rows** (Linear, Notion… with no store) are still in the
  database; harmless, delete if the owner wants.

## Data retention

- **Rolling snapshot prune (~90 days).** Page snapshots currently accumulate
  forever for active accounts. Add a cleanup step to the daily check cron
  (`src/app/api/cron/check`) that deletes snapshots older than ~90 days, while
  keeping each page's `latest_snapshot_id` and any snapshots referenced by a
  recent change row. Storage hygiene + privacy (we don't hoard competitors' page
  content longer than needed). _Note: the Privacy Policy does NOT promise this
  prune yet — add the promise only once this ships._
  - Account deletion already cascades fully (auth.users → users → competitors →
    pages → snapshots + changes) and is immediate, so nothing to do there.

## UX / marketing site

- **Bring back a Contact link in the footer.** Removed from the footer's Legal
  column on 2026-10-05 at the owner's request; the old `ContactLink` component
  (mailto plus copy-to-clipboard) was deleted with it and is in git history
  (before this change) if we want it back. Options when we return to it:
  1. A `/contact` page with the support address and a short form that sends
     through Resend (needs an artboard). Best for visitors on webmail, where a
     bare `mailto:` does nothing visible.
  2. Restore the copy-to-clipboard link as it was.
  Decide which address it shows first: the footer used
  `trailwatch@houseofruga.com`, while replies and feedback go to
  `founder@gettrailwatch.com`.
  The Terms/Privacy/Refund pages still have inline `mailto:` links in their
  contact sections; give them the same treatment at that point.

## Legal / compliance

- **Annual auto-renewal reminder.** Some jurisdictions (e.g. California ARL, parts
  of the EU) require a clear reminder email before an annual subscription
  auto-renews and charges again. Confirm whether Paddle sends this on our behalf;
  if not, add a pre-renewal reminder. Monthly plans are lower-risk here. Ties to
  the Refund Policy's "renews automatically until you cancel" language.

- **Physical business address.** House of Ruga LLP currently lists only
  `trailwatch@houseofruga.com` as a contact. A registered address may be required
  for strict GDPR/India-DPDP compliance and Paddle merchant verification. Add to
  the legal docs' contact sections if/when we're comfortable publishing one.
