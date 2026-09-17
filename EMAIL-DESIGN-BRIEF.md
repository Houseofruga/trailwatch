# TrailWatch — Email design brief

A complete spec of the product's emails and, for the weekly digest, **every
variant and state** — written to hand to Claude Design so the emails get
designed before they're re-built. Keep the app's visual language: cream/ink
palette, lime-green accent (`#9ff50a`, deep-lime ink `~#5a7d0a`), DM Sans / Geist
Mono, **zero border-radius**, calm and low-noise. The product's whole promise is
_low noise — a readable digest, never a raw diff_ — the email must feel that way.

> **The problem to fix first (why we're redesigning):** the current digest groups
> **competitor → flat list of lines**, each line tagged with the page's *type*
> ("HOMEPAGE", "PRICING", …). A competitor tracked on multiple pages — or one page
> with several changes — becomes a repetitive stack ("HOMEPAGE … HOMEPAGE …
> HOMEPAGE …") with no page grouping and no way to tell two same-type pages apart.
> The redesign must group **competitor → page → change(s)**, disambiguate pages by
> their URL/path (not just the type), and collapse multiple changes under one page.

---

## 1. Which emails the product sends

| Email | Who renders it | In scope now? |
|---|---|---|
| **Weekly digest** | Us (`features/digest/email.ts`) | **YES — the main design job.** |
| Magic-link / sign-in link | Supabase Auth template | Later (brandable via Supabase custom template + SMTP) |
| Password reset | Supabase Auth template | Later |
| Email-change confirmation | Supabase Auth template | Later |
| Upgrade receipt / payment | Paddle (Merchant of Record) | Not ours — Paddle-templated |
| Payment failed / dunning | Paddle | Not ours |
| Subscription cancelled / expiring | Paddle | Not ours |

So: **design the weekly digest fully now.** Optionally design a **branded auth
email** shell (magic-link / reset) as a second, simpler template we can later push
to Supabase — same header/footer chrome as the digest, one message + one button.
Everything below is the digest unless noted.

---

## 2. The digest data model (what design can actually use)

The job runs weekly (Mondays 08:00 UTC), and only emails users who have **≥1
meaningful change in the trailing 7 days** with the digest toggle on. Available
per email:

- **Recipient:** email; **display name** (from Settings — may be empty → fall back
  to a generic greeting or none); **plan** (Free / Pro).
- **`changeCount`** — total meaningful changes this week (drives the subject).
- **competitors[]** — each: `name`, home domain (for a favicon via
  `/api/favicon?domain=…`, initials fallback).
  - **pages[]** — each: **page type** (Homepage / Pricing / Product / Blog /
    Changelog / Other), **URL** (full, so the path disambiguates same-type pages),
    `lastCheckedAt`.
    - **changes[]** — each: **summary** (1–3 sentence plain-English AI summary; may
      be a fallback string "This page changed meaningfully (summary unavailable)."),
      **detectedAt** (timestamp → "2 days ago" / "Wed"), link to the in-app
      **change detail** (`/changes/[id]`) and to the **live page**.

**Available only if we add a query (flag for design so they can include/omit):**
- **Trivial edits filtered** count this week (reinforces the low-noise promise).
- **Broken/unreachable pages** this week (`last_check_status`).

**Deliberately excluded from email:** web-archive / backfilled changes
(`source='archive'`) are in-app only — never in the digest.

---

## 3. Shared chrome (every digest, and the optional auth shell)

- **Preheader** (hidden preview text): e.g. "3 changes across 2 competitors this
  week." — design must specify this; it's the inbox snippet.
- **Header:** TrailWatch wordmark/logo (plain — no "by House of Ruga"), thin rule,
  optional week range ("Week of Sep 8–14").
- **Greeting / lead:** "Here's what moved this week." (+ optional first-name).
- **Body:** the grouped changes (§4).
- **Primary CTA:** "Open your dashboard →" (`/dashboard`).
- **Footer:** why-you're-getting-this line; **Unsubscribe** (one-click, RFC 8058 —
  must be a real link we inject) + "manage in Settings"; company/legal line ("©
  2026 House of Ruga LLP"); calm, small, low-contrast.
- **Plain-text version required** (Resend sends both; some clients prefer text) —
  design should define the text hierarchy too, not just HTML.

---

## 4. Digest body — grouping & the change block (the core)

Hierarchy the design must express:

```
Competitor  (avatar/initials + name + domain)
  └─ Page   (type label + the distinguishing URL path)
       └─ Change  (summary + when + "view change")   ← may be several
```

Design each of these states of the **change block**:
1. **One change on a page** — type, path, summary, "2d ago", View change →.
2. **Multiple changes on the same page** in the window — collapsed under the one
   page header, each summary stacked (or "+N more this week").
3. **Multiple pages under one competitor**, including **two pages of the same
   type** — must be visually distinct via the URL/path (this is the bug to kill).
4. **Fallback summary** state — when the AI summary is unavailable, the plainer
   "This page changed — open it to see what's different." line still reads fine.
5. **Long vs short summary** — layout holds for a 1-line and a 3-line summary.

---

## 5. Whole-email volume variants (design all)

1. **Minimal:** 1 change · 1 page · 1 competitor. (Subject: "Your weekly digest — 1
   change".) Must not feel empty/broken.
2. **Typical:** ~3–6 changes across 1–2 competitors.
3. **Busy:** many changes across several competitors (5+). Consider a **summary
   line / count-by-competitor** at top, and whether to **truncate** ("showing the
   top N — see all on your dashboard") to keep the email scannable.
4. **Very long:** dozens of changes — define the cap + "and N more →" behavior.
5. **Subject-line variants:** "1 change" / "N changes"; consider naming the top
   competitor ("Notion + 2 others changed this week") — provide options.

---

## 6. Account / context variants

1. **Free vs Pro:** consider a subtle plan line, and — for **Free** users who look
   active — a tasteful **"Upgrade to Pro"** nudge in the footer area (matches the
   in-app CTA: black button, green text, ⚡ bolt). Pro users: none.
2. **First digest ever** vs **recurring** — optional warmer one-liner on the first.
3. **Optional new data blocks** (design as includable modules; we'll wire the data
   if we adopt them):
   - **"N trivial edits filtered"** — one calm line reinforcing low-noise.
   - **"Couldn't reach: [page]"** — a gentle heads-up for broken/unreachable pages,
     with a fix link. (Decide: include in the weekly digest, or a separate alert?)

---

## 7. States that send NO email (design awareness / a decision)

- **Quiet week** (no meaningful changes) → **currently no email is sent.** Options
  for the designer/owner to weigh: (a) keep silent (purest low-noise), or (b) an
  occasional **"All quiet — nothing worth flagging"** reassurance email. If (b),
  design a distinct, very short "quiet" variant. Default assumption: **stay silent**
  unless the owner wants the reassurance version.
- **Digest paused** in Settings → no email.

---

## 8. Technical constraints for the designer (email ≠ web)

- **Table-based layout, all styles inline**, ~600px max width; must render in
  Gmail (web/app), Apple Mail, Outlook. No external CSS, no web fonts guaranteed
  (system-font stack fallback; DM Sans as a nicety only).
- **Images are unreliable** (Gmail/Outlook block by default): the design must be
  fully legible with images off. Competitor favicons (`/api/favicon?domain=…`,
  absolute URLs) are a _nice-to-have with an initials fallback_, never load-bearing.
- **Dark mode:** provide a dark-mode treatment (many clients auto-invert; specify
  colors so it doesn't turn muddy).
- **Zero border-radius**, hairline rules, generous whitespace — match the app.
- **Accessible contrast** (the lime is bright — use the deep-lime ink for text/links
  on white, not the bright accent).

---

## 9. Deliverables to ask Claude Design for

1. Weekly digest — **HTML email** covering the §4 change block and the §5 volume
   variants (minimal / typical / busy / truncated), light + dark.
2. The **grouped competitor → page → change** layout that fixes the "multiple
   homepages" repetition.
3. Header/footer chrome + preheader + subject/preheader copy options (§3, §5).
4. The Free-user **upgrade nudge** module (§6).
5. (Optional) the **trivial-filtered** and **couldn't-reach** modules (§6).
6. (Optional, second template) a **branded auth email** shell reusing the chrome.

_Not for design:_ Paddle billing emails (their template), and the in-app
unsubscribe **confirmation page** (that's a web page, already exists).
