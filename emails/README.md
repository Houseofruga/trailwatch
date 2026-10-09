# Email templates

Alerts and the Monday briefing are rendered in code (`src/features/alerts/render.ts`,
`src/features/briefing/render.ts`) and sent through Resend, so they are not files here.
This folder holds the two emails Supabase renders, not us. The owner pastes them in:
Supabase Dashboard → Authentication → Emails → Templates.

| Template in Supabase | File | Subject to set |
| --- | --- | --- |
| Confirm signup | `auth-confirm-signup.html` | Confirm your email for Trailwatch |
| Reset Password | `auth-reset-password.html` | Reset your Trailwatch password |

Both are deliberately plain: a few lines of text and one link, with no logo, colours,
button or layout table. A designed template reads as marketing and Gmail files it under
Promotions (seen 2026-10-09); a plain note from a person does not give it that reason.
Keep the `{{ .ConfirmationURL }}` placeholder exactly as written.

The app signs people in with a password or Google, so the Magic Link template is not used.
The earlier designed magic-link template is in git history if it's ever wanted.

Two settings that matter as much as the template:

- Supabase → Authentication → Emails → SMTP Settings: the sender should be the same
  address the app sends from (`EMAIL_FROM`), so a reader's trust in one carries to the other.
- Resend → Domains → gettrailwatch.com: click tracking and open tracking off. Click
  tracking rewrites the confirmation link to a tracking address.
