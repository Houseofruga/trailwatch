# Email templates

## `auth-magic-link.html` — Supabase paste-in (owner step)

The **weekly digest** is rendered in code (`src/features/digest/email.ts`) and
sent via Resend, so it is not a static file here. This folder holds the one
email the product sends that Supabase renders, not us: the **magic-link sign-in**.

To use it: Supabase Dashboard → Authentication → Email Templates → **Magic Link**,
and paste the contents of `auth-magic-link.html`. It keeps the Supabase
`{{ .ConfirmationURL }}` placeholder for the sign-in button and the paste-in link.

It shares the digest's chrome and the same logo treatment:

- `email-logo-dark.png` (dark-ink wordmark) on light backgrounds, and
  `email-logo-light.png` (light-ink wordmark) in dark mode, swapped by
  `prefers-color-scheme`. Both live in `/public` and are served at
  `https://gettrailwatch.com/email-logo-*.png` (referenced absolutely in the
  template). `alt="Trailwatch"` keeps the brand legible when images are blocked.

The design source (all digest variants, quiet-week, dark/light) came from the
Claude Design canvas; only the digest variants are wired into code. The
quiet-week email is intentionally **not** sent — a quiet week sends nothing
(the low-noise default).
