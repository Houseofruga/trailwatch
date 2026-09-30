# Design → components map

Step 4 of `trailwatch-shopify-ui-prompt.md`. Source: the owner's Claude Design canvas **"TrailWatch web
app"** (https://claude.ai/artifact/Tjog93X7x5Ffbe5tym7MGr), read 2026-09-30. It has 137 artboards on 9
pages: a component sheet, a "New components" list, screens 01–07 at 1440 and 390, and emails E1–E2
at 600 and 375.

Every artboard labels its parts with `data-component="…"` (e.g. `Button/primary/loading`,
`Index table/mobile stacked`). That makes the mapping one-to-one. Since we're building our own components
(Step 1, option 3), **everything in the designs can be built**. Nothing needs to be approximated.
The open items are in §4: places where the design differs from the brief or spec, or needs data the backend
doesn't have yet.

Components live in `src/components/ui/` as a `.tsx` + `.module.css` pair each (small relatives share
a file: `Feedback.tsx` holds Stat/Spinner/ProgressBar/DividerWithLabel, `Guides.tsx` holds
Stepper/SetupGuide, `Overlay.tsx` holds Tooltip/PopoverMenu). Screens are in `src/components/app/`.
Values come from the artboards' inline styles, moved into `tokens.css` (`--ui-*`).

---

## 1. Component set: the brief's 16, plus the designer's 9 additions

| # | Component | Variants / states drawn | Notes |
|---|---|---|---|
| 1 | **AppFrame** | desktop (top bar + sidebar, account menu open), mobile top bar, mobile drawer, onboarding (nav disabled) | Sidebar footer: "Your store" card + "Free beta" badge. Active item: white pill, bold. |
| 2 | **Page** | index header (title + count badge + primary), detail header (breadcrumb, favicon, secondary buttons, "More actions") | |
| 3 | **Card** | body only · title row + action link · sectioned with dividers · footer strip (`#fbfaf8`) | Radius 12, border `#e6e2da`, hairline shadow. |
| 4 | **Button** | primary · secondary · plain · plain-dark · critical; each default / loading (spinner, label kept for width) / disabled; mobile 44px | **Primary is near-black (`#1a1a17`), not lime.** See §4, D1. |
| 5 | **Badge** | neutral, info, success, attention, critical; priority High / Normal / Low; statuses Watching, Pages only, Can't reach, Reading catalog… (with spinner), Ready, Couldn't read, Free beta | Text colours are darker than the brief's (`#2f6b42`, `#7a5210`, `#c42020`) to pass 4.5:1 contrast. We adopt them. |
| 6 | **IndexTable** | filter bar (inline selects, one active), header, hover rows, **bundled row expanded** (child rows with thumbnail + price), pagination "1–10 of 37", **mobile stacked** list, loading (header stays, rows dim under a spinner pill) | |
| 7 | **Banner** | info (dismissible), success, warning, critical; title, text, action | |
| 8 | **TextField** | default, focused (dark border + soft ring), error (icon + red text), disabled/read-only (sunken fill), with prefix `https://` | |
| 9 | **EmptyState** | icon in a circle, heading, text, primary or secondary action | Three drawn: No moves yet · Add your first competitor · No moves match. |
| 10 | **Select** | inline filter pill ("Priority: High", active = sunken), form select | |
| 11 | **Toggle** | on (black), off, with label + description | |
| 12 | **Stat** | value, value + sub-line, "Off" + link, loading | |
| 13 | **Modal** | form (Add competitor), confirm-critical (Remove), type-to-confirm (Delete account) | |
| 14 | **Toast** | default (dark), error (red), dismiss × | |
| 15 | **Spinner** / **ProgressBar** | spinner + label; bar with label + % | |
| 16 | **SetupGuide** | title, "2 of 3 done" + bar, done rows struck through, pending row with action, dismiss × | |
| 17 | **SaveBar** *(new)* | replaces the top bar while there are unsaved changes: "Unsaved changes", Discard, Save | Settings |
| 18 | **Tooltip** *(new)* | dark, 12px, max 250px | "Can't reach" reason on Competitors |
| 19 | **PopoverMenu** *(new)* | action list with icons + divider | Account menu, "More actions" |
| 20 | **Stepper** *(new)* | "1 Your store · 2 Competitors", done/current | Onboarding |
| 21 | **ResourceList** *(new)* | avatar, name, domain, status badge, helper line, remove ×; "Show all 10" | Onboarding store list |
| 22 | **Timeline** *(new)* | day headers ("Today · Wed, Sep 30"), rows with icon, summary, badge, time, "What it means", "Compared with yours", **highlighted row** ("From your alert email"), "Show older" | Competitor detail |
| 23 | **Avatar** *(new)* | lettered square for stores (real favicon when we have one), round initials for the account | We already have `/api/favicon`. |
| 24 | **Thumbnail** *(new)* | product image slot, placeholder icon | Reports, bundled rows |
| 25 | **Divider with label** *(new)* | the "or" line | Sign-up / log-in |

Also: **Logo**. The designs use a placeholder mark; we use the real `public/logo.svg`.

---

## 2. Screens

The per-screen **states** listed are all drawn at 1440 and 390 unless noted.

### 01 Sign up / log in (12 states)
States: sign up (default, submitting, field errors, sign-ups full today, check your inbox) · log in
(default, submitting, wrong password) · forgot password (default, link sent) · set a new password
(default, link expired).

| Element | Component |
|---|---|
| Logo above card | Logo |
| Form card with footer strip ("New here? Create an account") | Card (footer) |
| Continue with Google | Button/secondary (full width, 44px) |
| "or" | Divider with label |
| Email, Password (+ "At least 8 characters") | TextField (default / error / disabled) |
| Submit | Button/primary (full width, loading) |
| Errors / notices | Banner critical / info / warning / success |
| Terms · Privacy | plain links |

Not drawn: *Google sign-in failed*. It uses the same critical banner as "wrong password", with the spec's text.

### 02 Onboarding (13 states)
States: step 1 your store · step 2 empty / adding / with stores / invalid address / marketplace /
can't reach / not on Shopify / already added / own store / limit reached · building report · slow.

| Element | Component |
|---|---|
| Frame with nav disabled | AppFrame (onboarding) |
| "1 Your store · 2 Competitors" | Stepper |
| Website field + Add | TextField (prefix `https://`, error) + Button/secondary |
| "Added · 4 of 10" list | ResourceList (Avatar, Badge success/info/neutral/critical, helper line, remove) |
| Limit reached | Banner/info + TextField disabled + "Show all 10" |
| See your first report / Back | Button/primary / Button/plain |
| Building report | Card + ProgressBar ("Reading Dewlane's catalog: 250 of 313 products") |

Data: store status and product counts come from `stores.check_status` + `catalog_stats` (**[new]** status read, as in the spec).

### 03 First report (6 states)
States: default · still reading · a card empty · pages only · very large · error.

| Element | Component |
|---|---|
| Header "Dewlane right now", Visit store, Go to Home | Page (breadcrumb, Avatar) |
| Products / On sale / Sold out / Average price | Stat ×4 in a Card |
| Recently launched, Sold out, On sale now, Cheaper than yours | Card with list rows (Thumbnail, name, date, price, Badge −%) + "See all N" link |
| Footer line | text |

Differences to decide: "See all N" (§4, D3) and "Sold out since Sep 29" (§4, D4).

### 04 Home (9 states)
States: populated · busy week · no moves yet · filters match nothing · loading · error · briefing off ·
add-competitor modal · mobile menu drawer (390 only).

| Element | Component |
|---|---|
| Header + Add competitor | Page + Button/primary |
| Finish setting up | SetupGuide |
| 3 metrics | Stat (value / sub-line / "Off" + Turn on / loading) |
| Recent moves | IndexTable (filters Competitor / Type / Priority, bundled row, pagination, mobile stacked) |
| Row avatars | Avatar (lettered) |
| Empty / no match | EmptyState |
| Add competitor | Modal (form) |

Differences to decide: default filter and page size (§4, D6).

### 05 Competitors (5 states)
States: populated · empty · loading · error · tooltip.

| Element | Component |
|---|---|
| Header "Competitors" + "5 of 10 (beta limit)" + Add | Page (count Badge) |
| Store table | IndexTable (Avatar, numbers right-aligned, Badge statuses) + mobile stacked |
| Can't reach reason | Tooltip |
| Footer "We check every competitor every 2 hours." | text |

### 06 Competitor detail (9 states)
States: busy · quiet · no moves yet · pages only · can't reach · not found · loading · error · remove modal.

| Element | Component |
|---|---|
| Header: favicon, name, "38 moves this week" badge, domain, More actions / View snapshot / Visit store | Page (detail) + Badge/attention + PopoverMenu |
| Timeline with filters | Timeline + Select filters |
| Catalog | Card + Stat ×4 + "Checked 14 min ago · every 2 hours" |
| Watched pages | Card list with "changed Sep 25" + external links |
| Compared with your store | Card + "See the comparison" link (filters the timeline to Cheaper than you) |
| Can't reach | Banner/warning |
| Remove | Modal (confirm-critical) + Button/critical |

Difference to decide: where the "What it means" text comes from (§4, D2).

### 07 Settings (10 states)
States: default · save bar · saved toast · save failed · invalid Slack URL · Slack connected · Slack test
failed · no alert channels · delete-account modal · loading.

| Element | Component |
|---|---|
| Sections: description left, Card right (stacks on mobile) | Card + a two-column settings row (layout, not a component) |
| Email alerts, the 6 alert types, Monday briefing | Toggle |
| Send to, Slack webhook, Your store's website, Name, Email | TextField (error, disabled) |
| Time, Time zone | Select |
| Plan | Badge/success "Founding member" + text |
| Unsaved changes | SaveBar |
| Saved / failed | Toast / Toast/error |
| No channels | Banner/warning |
| Delete account | Button/critical + Modal (type "delete") |

Difference to decide: "Password · Last changed Sep 2" (§4, D5).

### E1 Instant alert (sale, bundled) · E2 Monday briefing (default, quiet week)
Drawn at 600 and 375, with system fonts, a grey background, a white card, a priority pill and a dark button, as briefed.
These aren't app components. The existing templates (`src/features/alerts/render.ts`,
`src/features/briefing/render.ts`, `src/features/email/shell.ts`) get restyled to match. The artboards
use `div`/flex; the emails will use **tables** so they render the same in Outlook and Gmail. Same look,
safer markup.

---

## 3. Data the designs rely on (all planned in `UX_SPEC.md` as **[new]** backend work)

Moves feed with filters + paging · competitor list stats (products, on sale, 7-day moves, last checked,
status) · competitor overview (catalog stats, watched pages with last-changed dates, match summary) ·
moves-this-week count · next briefing time · briefing time + time zone settings · Slack test ·
onboarding status read. No surprises beyond §4.

---

## 4. Decisions

**Resolved 2026-09-30: all as recommended.**
- D1 (a): black primary buttons, lime only in the logo.
- D2 (a): one-line AI insight per high-priority move.
- D3 (a): cards expand in place, up to 50.
- D4: "since…" only once there's history.
- D5: drop the password date.
- D6: follow the design (Priority All, 10 per page).

**D1. Accent colour.** The brief said primary buttons, the active nav item and focus rings should be lime
(`#9ff50a`). The designs use **near-black primary buttons and black toggles**, and lime appears **only in the
logo**. It's consistent everywhere and reads closer to the Shopify admin, but it wasn't flagged as a
change.
→ (a) **Follow the design** (black primary, lime only in the logo), or (b) switch primaries to lime.
*Recommend (a).* Black-on-grey has stronger contrast, and it's what you approved visually.

**D2. "What it means" on each move.** The timeline and alerts show a specific insight per move ("Their
third throw this month. They're building out the category ahead of the holidays."). Today the backend
only has a **templated** suggestion per move type (`suggestedAction`), which reads like generic
advice. The per-move insight only exists weekly, in the briefing.
→ (a) **Add a one-line AI insight per high-priority move**: one Haiku call per store move, shared
by every follower, fitting inside the existing per-store daily AI cap, with the template as a
fallback. Cost ≈ $0.001 per move. (b) Show the templated text instead. (c) Hide the line.
*Recommend (a).* It's the product's edge ("interpretation"), and it's cheap.

**D3. "See all N" on the first report** (See all 8 / 27 / 78). No full-list view was designed.
→ (a) **The card expands in place** to show up to 50 items (then "See the rest on their store ↗"),
(b) drop the links.
*Recommend (a).* It needs the report to return more than 8 items per list, which is a small change.

**D4. "Sold out since Sep 29" on the first report.** On the very first read we can't know when something
sold out. We only know it is sold out now.
→ **Show "since …" only once we have history** (from the second check on); otherwise show just "Sold out".
*Recommend this.*

**D5. "Password · Last changed Sep 2" in Settings.** We don't record when a password changed.
→ **Drop the date**, keeping "Password" + Change password. *Recommend this* (storing it isn't worth it).

**D6. Home feed defaults.** The spec said Low priority is hidden by default and shows 25 per page. The design shows
Priority **All** (Low rows included) and **10 per page** ("1–10 of 37").
→ **Follow the design.** *Recommend this.* On a busy week the Priority filter is one click away.

Not decisions, just noting what I'll do:
- **The 9 new components** are all fine to build.
- **Google sign-in failed** reuses the wrong-password banner pattern.
- **The logo** is the real `public/logo.svg`, not the placeholder mark.
- **Emails** are built with tables.
