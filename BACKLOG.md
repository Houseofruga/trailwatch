# BACKLOG.md — Competitor Radar / TrailWatch

Post-MVP items intentionally deferred. Not blockers for the §9 definition of done.
Newest at top. When you pick one up, move the reasoning into a commit, not here.

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

- **Legal pages' contact sections still use bare `mailto:`.** The footer Contact
  link now copies the address to the clipboard on click (`ContactLink`), but the
  inline `mailto:` links inside the Terms/Privacy/Refund pages don't — a
  webmail-only visitor clicking those still gets nothing visible. Low priority;
  fold them into the same treatment (or a `/contact` page) if we build one.

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
