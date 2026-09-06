# TrailWatch v2 → design update: everything shipped in dev since v2

Context: You already have the **TrailWatch v2** design file. Since v2, we built and
hosted a batch of new features and states in dev. I need you to design/redesign the
screens below **in the v2 visual language** so I can bring them back and build them
1:1. Don't reinvent the look — extend it.

## Keep the v2 design system exactly
- Palette: cream/ink neutrals; single lime-green accent `#9ff50a` (accent-ink for
  text-on-accent); blue for links.
- Type: DM Sans (UI) + Geist Mono (URLs, numbers, code-ish labels).
- **Zero border-radius everywhere** (square UI), thin borders, generous whitespace.
- Mobile-first. Deliver **both desktop and mobile (~375px) artboards** for every
  screen, plus the key states listed per screen.

## Global app shell (authed)
- Desktop: left sidebar (Dashboard, Competitors, Plan & billing, Settings) + plan
  usage box (Competitors x/N, Pages tracked x/N) + account at bottom.
- Mobile (<860px): fixed top bar + **bottom tab bar** + an **account sheet**; all
  dialogs become **bottom sheets**. Please design the bottom tab bar + account sheet.
- States to include across the app: **loading skeletons** (no blank navigations),
  **error boundary** state (keeps the shell, friendly message + retry), 404/not-found,
  and a global-error fallback.

---

## 1) Dashboard — the biggest change: make it ADAPTIVE (top priority)
The dashboard is now **value-forward when quiet, feed-forward when active.** The whole
product edge is *low noise*, so a quiet week must read as "the product working," not a
dead screen.

**Header (adaptive):**
- Active week (≥1 meaningful change): "This week" + "N meaningful changes across your
  tracked pages."
- Quiet week (0 meaningful changes): "All quiet" + "Exactly the point — here's what
  we're watching for you." (This voice is approved — please design for it.)

**Three stat tiles:** Changes this week · Pages tracked · Trivial edits filtered.
**Meta row:** "Checks start within an hour of adding a page" · "Digests go out Mondays 8am".

**Competitor cards** (ordered so the ones with movement float to top): favicon avatar
+ name + domain, and a right-aligned "N changes this week" / "Quiet this week".

**Page rows inside each card — three variants (design all three):**
1. **Active page** (meaningful change this week): a clickable row — page label, the
   change summary sentence, and a "Xh/Xd ago" timestamp. (This is roughly the v2 feed row.)
2. **Quiet page — the NEW value card** (this is the key new pattern): instead of "no
   changes," show the page's cached **baseline profile**: a one-line positioning
   sentence + a row of **pricing chips** (tier name + price, e.g. "Plus $10/seat/mo"),
   and, only when we already have history, a subtle **"Last notable change · Xd ago"**
   link. Design its loading skeleton too.
3. **Paused page:** a plain, muted "Paused" state.

**Empty / zero states:**
- Brand-new user with 0 competitors: a clearly-labeled **example/demo dashboard**
  (dotted "example" framing, full-fidelity cards inside) — it disappears once they add
  a real competitor.
- Fallback guided empty state: "Nothing on the radar yet" + primary CTA + a short
  "Most people start with" suggestion list.
- Over-limit banner (Free plan over its limit): extras are read-only until upgrade.

---

## 2) Competitors page (manage board) — full page + new intelligence panels (second priority)
This is the management screen: a list of **competitor cards**, each containing its watched
**page rows**. Please design the whole card, not just the new panels — the panels below
are new since v2, but the surrounding controls are the live UX and must be laid out too.

**Competitor card — header:**
- Left: favicon avatar + competitor name + a muted "**N of N pages**" count.
- Right (card controls): an **"Add page"** button — OR, when the competitor is at its
  page limit, an **"Upgrade to add more pages"** link in its place — plus an **"Edit"**
  link and a **"Delete competitor"** button.

**Page row (one per watched page):**
- Page label + the **URL in mono** (opens in a new tab, with a small ↗ icon).
- A **status badge**: "Checking daily" (active) or "Paused".
- A **kebab (⋮) overflow menu** with four actions — **Check now**, **Edit page**,
  **Pause / Resume checking** (toggles), and **Delete page** (danger styling).
- Design the menu open state and its mobile form.

**Two NEW panels, rendered under each ACTIVE page** (paused pages show neither):
- **"What we're now watching"** (baseline profile): positioning paragraph, a set of
  **pricing tiers** (name + price), a short **"what to watch"** bullet list (≤4), and a
  quiet footer "Captured now — you'll get an email when this changes." States: loading
  skeleton; a "we'll profile this page right after its first check" pending note; and a
  hidden/absent state (no card) when unavailable.
- **"Recent history"** (collapsed by default): a toggle row with a chevron and, once
  loaded, a **count badge**; expanding reveals a compact **timeline** of dated entries
  reconstructed from the web archive, each linking to a change detail. States to design:
  collapsed, loading skeleton (on first expand), the ready list, an **empty** note ("No
  archived history for this page yet — we'll track changes from here."), and an
  **unavailable** note ("Couldn't load history right now.").

**Feedback + dialogs:**
- A brief **toast** for row actions ("…paused/resumed", "Check now" result).
- **Add-page dialog** and **Edit-page dialog** (bottom sheets on mobile).
- **Confirm/delete dialog** for deleting a page or a whole competitor (include the
  "this removes N pages" context for a competitor delete).

**Empty state** (0 competitors): the line-art "page under a magnifier" motif + "No
competitors yet" + "Add your first competitor" CTA.

**Upsell** (Free user at the competitor/page limit): the shared **Pro pricing card with a
Monthly/Annual toggle** (annual default, "Best value" badge) that opens checkout *in
place* — not a redirect. Design this inline upsell block.

**Related flows on this route family:**
- **Add competitor** (`/competitors/add`): competitor name + repeatable page rows (URL in
  mono + a "Page name" label), "Add another page", "Start tracking". Show the **capture
  confirmation flash** ("✓ Captured Homepage as of [date]…").
- **Edit competitor** (`/competitors/[id]/edit`): name + editable page list + a "move all
  pages to a new domain" affordance.

---

## 3) Change detail (`/changes/[id]`)
Summary headline, before/after text excerpts (with short dated labels), and page/competitor
meta. **New:** archive-sourced changes need a distinct **"reconstructed from the web
archive"** provenance note + the archive's before-date. Design normal vs archive variants.

## 4) Onboarding (`/welcome`) — mandatory, chrome-free
Own minimal top bar (logo left, profile + Log out right). **Two steps:**
1. **Watchlist:** either pre-filled competitor rows (from the homepage finder) with
   **checkboxes to pick which N** (capped at the plan limit, with an over-limit → upgrade
   path), or **blank rows** for a plain signup. Intro note explaining "we watch each
   competitor's homepage; add more pages once you're in."
2. **Choose your plan:** Free vs Pro using the **same Pro pricing card** as billing
   (Monthly/Annual toggle). No "skip" — onboarding is required.

## 5) Billing / Plan (`/billing`)
Current plan, usage, and the shared **Pro pricing card** (Monthly/Annual toggle; "Plus
applicable taxes — calculated at checkout" line on checkout surfaces). Upgrade + manage states.

## 6) Settings (`/settings`)
Account info + a **weekly digest on/off** toggle, and account actions. Simple, calm.

## 7) Auth (`/login`, `/forgot-password`, `/reset-password`)
Email + password **and Google** sign-in; sign-up vs log-in; "reset link sent"; and
distinct **"link invalid/expired"** messages. Keep these lightweight.

## 8) Marketing / legal (lower priority — mostly exists, flag any drift)
Homepage `/` is the **"Find your competitors" finder** hero (enter company → suggested
competitors → editable list → start free). Also: `/1` animated landing, the free tools
(competitor teardown, sitemap finder, robots tester, last-updated checker), 3 compare
pages, and legal (terms/privacy/refunds). Only redesign if they diverge from v2.

---

## Deliverable
For each screen above: desktop + mobile artboards and the enumerated states, consistent
with v2 tokens. Prioritize **Dashboard (adaptive, all 3 row variants + quiet header +
demo/empty)** and **Competitors (baseline + history panels + upsell)** — those carry the
most new UX. Group by the sections above so I can map artboards back to routes.

---

_Notes for me (strip before pasting into Claude Design):_
- **Background warming** (baseline/history pre-built after signup) is invisible to users —
  it just means the panels are usually already populated, no first-view spinner. Nothing to draw.
- The **marketing/tools/legal** block (§8) is likely already covered by v2 — marked
  "flag drift only" so Design doesn't waste effort. Delete §8 if v2 already nails it.
