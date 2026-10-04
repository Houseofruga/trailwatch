# Trailwatch: UX spec (Shopify-admin-style web app)

Status: **approved 2026-09-30**. All open questions in §7 were resolved as recommended; see the
**Decisions** list there. This is Step 2 of `trailwatch-shopify-ui-prompt.md`. There is no app code in this step.

Trailwatch stays a standalone web app, with its own domain, login and billing. The UI adopts the
**patterns** of the Shopify admin, so Shopify merchants feel at home, but it's built from **our own
components and tokens**. That was the Step 1 decision (see `PIVOT_PLAN.md`). No Shopify code, token
values, logo, name or wording.

---

## 0. What the real data looks like

The database has no events yet, because migrations 0009–0015 aren't applied. So these numbers come
from running our crawler on 3 real Shopify stores (2026-09-30), shown under fictional names. Product
names are lightly genericized.

| Fictional name | Real type | Products | Variants | On sale | Sold out | Price range | Crawl |
|---|---|---|---|---|---|---|---|
| **Dewlane** | bedding & bath | 313 | 5,870 | 78 | 27 | $7.25–$1,084 | 3 requests, 6s |
| **Hearth & Pine** | home textiles | 1,632 | 4,538 | 199 | 203 | $3–$2,850 | 8 requests, 12s |
| **Northwind Knits** | shoes & apparel | 692 | 7,454 | 144 | 260 | $0.80–$165 | 4 requests, 5s |

The sample user's own store is **Glowfield Home** (glowfield.com), a bedding brand with about 214 products.

Edge cases the design must survive (all real):

- **Long product names.** Up to 83 characters: *"Women's Trail Runner Mid Waterproof - Stony
  Cream/Rugged Beige (Stony Cream Sole)"*, *"Organic Keys Jacquard Bolster Pillow Cover - FINAL SALE
  (Dusk and Evergreen)"*. Lists cut them to one line with an ellipsis; the full name shows on hover and on detail.
- **Big discounts.** Up to −85%: *"Breezeweave Crinkle Cotton Sham Set - Last Call"*, $13.35, was $89.
- **Busy competitor.** Hearth & Pine published 96 products in 30 days and has 199 items on sale, so
  it should produce about **30–40 moves a week** once history exists. The feed needs filters and pages
  from day one.
- **Quiet competitor.** Dewlane launched nothing in the last 7 days. An empty timeline is normal, not an error.
- **Bursts of near-identical names.** Hearth & Pine lists each colour as its own product (*"Boucle
  Ball Pillow (Ink)"*, *"(Tobacco)"*…). Launches arrive in bursts; the existing alert bundling groups
  them, and the UI shows "Launched 5 products" with an expand, not 5 rows.
- **Republish storm.** Northwind Knits shows 398 products "published" this week but 0 *created* in
  30 days. They re-published old products (see Open question 7).
- **Marketplace entered.** `amazon.com` gets the reply *"Add the brand's own website instead;
  marketplace tracking is coming soon."* This is the existing message, reused word for word.

---

## 1. Navigation

**App frame** (every signed-in screen):

- **Top bar** (full width, fixed): Trailwatch logo on the left. On the right, **account menu** (avatar
  initials + name) with *Settings*, *Help* and *Log out*. On mobile, a **menu button** on the left
  opens the sidebar as a drawer.
- **Left sidebar** (fixed on desktop, drawer on mobile):
  1. **Home**: `/dashboard`
  2. **Competitors**: `/competitors`, with a count ("6")
  3. **Settings**: `/settings`
  - Bottom of the sidebar: **Your store**: "glowfield.com · 214 products" → Settings › Your store,
    and a small "Free beta" badge.
- **Page header** (inside the content area): title, optional breadcrumb ("‹ Competitors"), one
  primary action on the right, and optional secondary actions / "More actions" menu.

**Routes not in the sidebar:**

| Screen | Route | Reached from |
|---|---|---|
| Sign up / log in | `/login`, `/login?mode=signup` | Marketing site, emails |
| Onboarding | `/welcome` | After first sign-up; Home redirects here until a competitor exists |
| First report | `/competitors/:id/report` | Right after adding a competitor; "View snapshot" on detail |
| Competitor detail | `/competitors/:id` | Competitors list, Home feed rows, every email item (`#move-{id}`) |

Screens that exist today and aren't in the new design:

- **Billing** (`/billing`) and **account** (name, password, delete account) become sections of Settings.
- **`/admin`** (internal costs) stays as it is.
- The **founder-edition screens** (page-change detail `/changes/:id`, the modal routes, the old
  per-page flows) are **removed**. They're preserved on `archive/founder-edition`.

---

## 2. User flow

```
Sign up (email + password, or Google) → confirm email
  → /welcome step 1: your store's domain (required since 2026-10-04)
  → /welcome step 2: add competitors (1+)
  → "Building your first report" (per competitor, ~10–60s)
  → First report for the first competitor
  → Home (daily use): moves feed, counter, next briefing
  → Instant alerts (email / Slack) and the Monday briefing link back into the app
```

- **Your store** powers "cheaper than you" moves and the "compared with yours" lines. We read its
  public catalog like any competitor's. If it's skipped or isn't on Shopify, everything else still
  works, and Home's setup guide keeps a "Add your store" step.
- **Onboarding ends** when one competitor has been added. From then on, `/dashboard` is the landing page.
- **Daily use**: the user mostly arrives from an email or Slack alert, lands on a competitor's detail
  at that move, and scans Home for anything else.

---

## 3. Components (our own, Polaris-style)

The brief's starting set, plus what the screens need. The spec only uses these.

| Component | Used for |
|---|---|
| **App frame** (top bar + sidebar + drawer) | Every signed-in page. *Beyond the brief's 8.* |
| **Page** (header: title, breadcrumb, primary + secondary actions) | Every page |
| **Card** (with optional header, footer and sections) | All content blocks |
| **Button** (primary, secondary, plain, critical; loading state) | Actions |
| **Badge** (neutral, info, success, attention, critical) | Priority, status |
| **Index table** (filters bar, rows, pagination; stacks into rows on mobile) | Feeds, lists |
| **Banner** (info, success, warning, critical; optional action; dismissible) | Page/section notices |
| **Text field** (label, help text, error, prefix) | Forms |
| **Empty state** (heading, text, action, optional illustration) | Empty lists |
| **Select** | Filters, settings. *Beyond the 8.* |
| **Toggle** (switch) | Settings. *Beyond the 8.* |
| **Stat** (label + big number + optional sub-line) | Home metrics, catalog stats. *Beyond the 8.* |
| **Modal** (confirm) | Remove competitor, delete account. *Beyond the 8.* |
| **Toast** | "Saved", "Competitor added". *Beyond the 8.* |
| **Spinner** + **Progress bar** | Loading, "building your first report". *Beyond the 8.* |
| **Setup guide** (checklist card) | Home, until setup is done. Built from Card + checkbox rows. |

**Loading pattern:** there are no skeleton placeholders. A spinner with a short label sits inside the card that's
loading; tables keep their header and dim their rows while refreshing. That's calmer and matches the
admin style.
**Errors:** a critical banner at the top of the affected card, with "Try again". Failed actions show a toast.
**Priority badges:** **High** = attention (orange), **Normal** = info (blue), **Low** = neutral
(grey). The text is always shown; colour is never the only signal. *Critical (red) is reserved for errors.*

---

## 4. Screens

Actions and data use existing server code wherever possible. **[new]** marks backend work the
screen needs that doesn't exist yet.

### 4.1 Sign up / log in (`/login`)

**Purpose:** get in fast. Uses the existing auth; this is a restyle only.

**Layout:** no app frame. A centred card on the neutral background, with the Trailwatch logo above it.

**Content (sign up):**
1. Heading "Create your account". Sub-line: "Know what your competitors change, as soon as they change it."
2. **Continue with Google** (secondary button, Google mark).
3. Divider "or".
4. Text fields **Email** and **Password** (help: "At least 8 characters").
5. Primary **Create account**.
6. Footer link: "Already have an account? Log in". Small print linking to Terms and Privacy.

**Log in:** same card with "Log in", **Forgot password?** link under the password, footer "New to
Trailwatch? Create an account". **Forgot / reset password** use the same card.

**Backend:** `signUp`, `logIn`, `signInWithGoogle`, `requestPasswordReset`, `updatePassword`
(existing).

**States:**

| State | What shows |
|---|---|
| Submitting | Primary button in loading state; fields disabled. |
| Check your email (after sign up) | Card replaced by "Check your inbox. We sent a link to jo@glowfield.com to confirm your account." + "Resend". |
| Wrong email or password | Critical banner in the card: "That email and password don't match." |
| Field errors | Inline: "Enter a valid email." / "Use at least 8 characters." |
| Daily sign-up cap hit | Info banner: "Today's beta spots are gone. Try again tomorrow." (existing copy) |
| Google cancelled / failed | Critical banner: "Google sign-in didn't complete. Try again." |
| Link expired (confirm / reset) | Warning banner + "Send a new link". |

### 4.2 Onboarding (`/welcome`)

**Purpose:** go from zero to a first report in under two minutes.

**Layout:** app frame with sidebar items disabled (just the logo and account menu). A narrow single
column, with a 2-step progress line at the top: "1 Your store · 2 Competitors".

**Step 1: Your store**
1. Page title "What's your store?" Sub-line: "We'll compare your competitors' prices with yours."
2. Card: text field **Your store's website** (placeholder "glowfield.com") + primary **Continue**.
3. Plain button **Skip for now**.
4. After Continue: the row shows "Glowfield Home · reading 214 products…" with a spinner, and we move
   on without waiting.

**Step 2: Competitors**
1. Page title "Who do you compete with?" Sub-line: "Add up to 10 stores during the beta. Use their
   own website, not an Amazon or Etsy page."
2. Card: text field **Competitor's website** (placeholder "dewlane.com") + button **Add**.
3. A list of added competitors: name, domain, status badge (**Reading catalog…** with a spinner,
   **Ready** success, **Pages only** info), and a remove "×".
4. Primary **See your first report** (enabled once at least 1 is added).

**Building your first report** (after the primary click, if the first competitor isn't ready yet): a card with a progress bar and
"Reading Dewlane's catalog: 250 of 313 products". It moves to the First report automatically when ready.

**Backend:** `setOwnStore` / `getOwnStore`, `addCompetitorByDomain` (returns coded results), `deleteCompetitor`,
**[new]** a small status read for the progress bar (the store's check status + product count from
`stores.catalog_stats`).

**States:**

| State | What shows |
|---|---|
| Empty | Field + helper text, no list. |
| Adding | Add button loading. |
| Invalid address | Field error: "Enter a website like dewlane.com." |
| Marketplace | Field error: "Add the brand's own website instead; marketplace tracking is coming soon." |
| Can't reach / blocked | Field error: "We couldn't open that site. Check the address, or try their main domain." |
| Not on Shopify | Row badge **Pages only** + note: "This store isn't on Shopify, so we'll watch its homepage, sale page and policies instead of its catalog." |
| Already added | Field error: "You're already watching this store." |
| Your own store entered as a competitor | Field error: "That's your store. Add a competitor's instead." |
| Limit reached (10) | Info banner: "That's 10, the beta limit." Field disabled. |
| Slow (over 60s) | Progress text: "Big catalogs take a minute. We'll email you when it's ready." + **Go to Home** |
| Catalog read failed | Row badge **Couldn't read** (critical) + "We'll try again in a few minutes." |

### 4.3 First report (`/competitors/:id/report`)

**Purpose:** instant value. Show what the competitor is doing *today*, with no history needed.

1. Page: title "Dewlane right now", breadcrumb "‹ Dewlane", primary **Go to Home**, secondary
   **Visit store** (external).
2. Stats card, 4 stats: **313** products · **78** on sale · **27** sold out · **$173.70** average price.
3. Card "Recently launched" (last 30 days, up to 8): table with Product (thumbnail + name), Price,
   Launched.
4. Card "On sale now" (biggest discount first, up to 8): Product, Price, Was, **−85%** badge.
5. Card "Sold out" (up to 8): Product, Price.
6. Card "Cheaper than yours" (only if the user's store is set and there are matches): their product, their
   price, your product, your price, difference.
7. Footer text: "From now on we check Dewlane every 2 hours and tell you what changes."

Product rows open the product on the competitor's site in a new tab.

**Example rows:**
- *Marlow Mini Pillow - Last Call*: $21.00, Sep 21
- *Breezeweave Crinkle Cotton Sham Set - Last Call*: $13.35, was $89.00, −85%
- *Wideboy Clock - Last Call*: $29.50, sold out

**Backend:** `getFirstReport` (existing). Matches come from the Phase 5 matching (**[new]** a read that
returns the undercuts for one competitor).

**States:**

| State | What shows |
|---|---|
| Still reading | Each card shows a spinner + "Reading Dewlane's catalog…". The page checks for updates every 5s. |
| A card has nothing | Plain text in the card: "Nothing launched in the last 30 days." / "Nothing on sale right now." / "Nothing sold out." |
| Pages only | Stats and cards replaced by an info banner: "This store isn't on Shopify, so there's no catalog snapshot. We're watching:" + the list of pages. |
| Very large store | Info banner: "This is a very large store. We've read the first 25,000 products." |
| Error | Critical banner: "We couldn't read Dewlane's catalog. We'll try again in a few minutes." + Try again. |

### 4.4 Home (`/dashboard`)

**Purpose:** the daily check-in. What moved, how much, and when the next briefing lands.

1. Page: title "Home", primary **Add competitor** (opens a modal with the onboarding add form).
2. **Setup guide** card (until done; dismissible): ☐ Add your store · ☐ Add a competitor · ☐ Choose
   where alerts go (email is on by default; Slack optional). Shows "2 of 3 done".
3. **Stats row** (3 stats):
   - **Moves caught this month**: 37
   - **High priority this week**: 4
   - **Next briefing**: "Mon, Oct 5, 8:00 AM" with the sub-line "to jo@glowfield.com"
4. **Card "Recent moves"** (index table):
   - Filters bar: **Competitor** (All / each), **Type** (All / New products / Price changes /
     Sales / Stock / Promotions / Pages / Cheaper than you), **Priority** (High & Normal by default / All / High only).
   - Columns: **Move** (summary, one line), **Competitor**, **Priority** (badge), **When** ("2 hours ago").
   - Example rows:
     - "Sitewide sale: 34% of products discounted, up to −60%" · Hearth & Pine · **High** · 2h ago
     - "Cheaper than you: Linen Duvet Cover is $169, yours is $189" · Dewlane · **High** · 5h ago
     - "Launched 5 products: Boucle Ball Pillow (Ink), (Tobacco), +3" · Hearth & Pine · **High** · yesterday
     - "Wideboy Clock sold out" · Dewlane · **Normal** · yesterday
     - "Changed the returns policy" · Northwind Knits · **Normal** · Sep 27
   - Bundled rows expand in place. Row click → competitor detail at that move.
   - 25 per page, with Previous / Next.
5. Footer help text: "Questions or feedback? Email support@…" (Open question 4).

**Backend:** `movesCaughtThisMonth` (existing); **[new]** `listMoves(userId, filters, cursor)` over
`user_events` joined to `events`; **[new]** high-priority count; **[new]** `nextBriefingAt(user)`
(from the briefing schedule + the user's time setting); setup state from existing data.

**States:**

| State | What shows |
|---|---|
| No competitors | Redirect to `/welcome`. |
| No moves yet (first day or two) | Empty state in the card: "No moves yet". Text: "We check your competitors every 2 hours. First changes usually show up within a day or two. Meanwhile, see what they're doing right now." + **View snapshots**. |
| Filters match nothing | Empty state: "No moves match these filters." + **Clear filters**. |
| Busy week (40+ moves) | Normal table with pages; Low priority hidden by default keeps it readable. |
| Loading | Stats show a spinner each; table rows dimmed with a spinner. |
| Error | Critical banner above the table: "We couldn't load your moves." + Try again. Stats show "—". |
| Briefing turned off | Next briefing stat: "Off" + link "Turn on". |

### 4.5 Competitors (`/competitors`)

**Purpose:** see and manage everyone being watched.

1. Page: title "Competitors", primary **Add competitor**. Sub-line: "6 of 10 (beta limit)".
2. Index table columns: **Store** (favicon, name, domain), **Products**, **On sale**, **Moves (7 days)**,
   **Last checked**, **Status** badge. Rows → detail.
   - Example: Hearth & Pine · 1,632 · 199 · 38 · 12 min ago · **Watching**
   - Dewlane · 313 · 78 · 0 · 40 min ago · **Watching**
   - Oakline Goods · — · — · 2 · 1 h ago · **Pages only**
   - Peak Tonic · 540 · 12 · 0 · Sep 28 · **Can't reach** (attention)

**Backend:** **[new]** `listCompetitors(userId)` (follows + `stores` stats, last checked, check status,
7-day move counts). Today's `getCompetitorsWithPages` is page-oriented and gets replaced.

**States:** Empty → empty state "Add your first competitor" + button. Loading → dimmed rows. Error →
critical banner. **Can't reach** → hovering the badge shows the reason in plain words ("The site
returned an error since Sep 28").

### 4.6 Competitor detail (`/competitors/:id`)

**Purpose:** everything about one competitor. This is where alert and briefing links land.

**Layout:** two columns on desktop (main + sidebar); on mobile the sidebar stacks under the page header.

**Main column:**
1. Page: title "Hearth & Pine" with the favicon, breadcrumb "‹ Competitors". Secondary actions
   **View snapshot** and **Visit store**. "More actions" menu → **Remove competitor** (critical).
2. **Card "Timeline"**: moves newest first, grouped by day. Filters: Type, Priority.
   - Each row: summary, priority badge, time. High-priority rows also show a "What it means" line
     (the interpretation from the alert) and "Compared with yours" when there's a match.
   - Example, **Sep 29**:
     - "Launched Organic Rib Knit Throw (Garnet), $99" (**High**). What it means: "Their third
       throw this month. They're building out the category ahead of the holidays."
   - Example, **Sep 28**:
     - "Started a sale on 12 products, up to −60%" (**High**)
     - "Mosaic Washcloth Set sold out" (**Normal**)
   - The row linked from an email is highlighted on arrival.
   - Paged, 25 days at a time ("Show older").

**Sidebar:**
3. **Card "Catalog"**: 1,632 products · 199 on sale · 203 sold out · $247.69 average. "Checked 14 min
   ago · every 2 hours".
4. **Card "Watched pages"**: Homepage, Sale page, Shipping policy, Returns policy, each with a "changed Sep 12"
   date and an external link. Read-only (Open question 5).
5. **Card "Compared with your store"**: "12 similar products · 3 cheaper than yours" → filters the
   timeline to Cheaper than you. Hidden if your store isn't set; shows "Add your store to compare
   prices" instead.

**Remove:** confirm modal: "Stop watching Hearth & Pine? You'll stop getting alerts about them. If you
add them back later, their history comes back too." → toast "Hearth & Pine removed" → Competitors.

**Backend:** `deleteCompetitor` (existing); **[new]** `getCompetitorOverview(userId, id)` (stats,
pages with last-changed dates, match summary); `listMoves` filtered by competitor.

**States:**

| State | What shows |
|---|---|
| No moves yet | Timeline empty state: "No moves since you added Hearth & Pine on Sep 30. That's normal for the first day or two." + **View snapshot**. |
| Quiet (none in 30 days) | "No moves in the last 30 days. We're still checking every 2 hours." |
| Pages only | Catalog card replaced by "This store isn't on Shopify, so we watch its pages." |
| Can't reach | Warning banner under the header: "We haven't been able to reach hearthandpine.com since Sep 28. We'll keep trying." |
| Not found | Empty state "This competitor isn't in your list" + **Back to competitors**. |
| Loading / error | As on Home. |

### 4.7 Settings (`/settings`)

**Purpose:** where alerts go, which ones fire, when the briefing arrives, your store, plan and account.

**Layout:** Shopify-settings style. Each section is a row with a **title + description on the left** (1/3) and
a **card on the right** (2/3); this stacks on mobile. **Save bar:** when anything changes, a bar appears at the top
of the content with "Unsaved changes", **Discard** and **Save**.

1. **Alerts: where they go**
   - Toggle **Email alerts** (on) · text field **Send to** (defaults to the account email).
   - Text field **Slack webhook** (optional; help: "Starts with https://hooks.slack.com/"). Once saved, it shows
     only "Connected to Slack" + **Send test** + **Disconnect**. The URL is never shown again.
2. **Alerts: which moves**: "We only alert you about big moves. Everything else waits for Monday."
   One toggle per type: **Sitewide sales** · **Promotions and banners** · **Cheaper than you** · **Big
   sales (30%+ off one product)** · **New products** · **Best-sellers selling out**.
3. **Monday briefing**: toggle **Send the weekly briefing** · select **Time** (6 AM–11 AM) · select
   **Time zone** (defaults from the browser) (Open question 1).
4. **Your store**: text field **Your store's website**, with "214 products · checked 3 h ago" +
   **Remove**.
5. **Plan**: "**Free beta** · Founding member" (success badge). "10 competitors · checks every 2 hours
   · instant alerts · Slack". Text: "Free while we're in beta. Founding members keep a discount when
   paid plans start." No upgrade button while billing is off.
6. **Account**: Name, Email (read-only), **Change password** (hidden for Google-only accounts),
   **Delete account** (critical, with a confirm modal where you type "delete").

**Backend:** `getAlertSettings` / `saveAlertSettings`, `setOwnStore` / `clearOwnStore`,
`setDigestEnabled`, `updateDisplayName`, `changePassword`, `deleteAccount`, `isFoundingMember`
(existing); **[new]** briefing time + time zone columns and the send logic; **[new]** "Send test" to Slack.

**States:** Loading → a spinner per card. Save failed → error toast, save bar stays. Invalid Slack URL
→ "Paste a Slack webhook URL. It starts with https://hooks.slack.com/". Slack test failed → toast
"Slack didn't accept the test message. Check the webhook." Email off *and* no Slack → warning banner:
"You won't get instant alerts. They'll only show up here and in your Monday briefing."

---

## 5. In-app copy

Rules: talk to "you", put verbs first, keep sentences short. These words never appear in the UI: event, severity, diff,
snapshot (except "View snapshot"), crawl, catalog hash.

| Internal | In the UI |
|---|---|
| event | move |
| severity high / normal / low | High / Normal / Low priority |
| followed store | competitor |
| own store | your store |
| first report | snapshot |
| briefing | Monday briefing |
| `product_launched` | New product |
| `price_changed` | Price change |
| `sale_started` / `sale_ended` | Sale started / Sale ended |
| `sitewide_sale_detected` | Sitewide sale |
| `sold_out` / `restocked` | Sold out / Back in stock |
| `product_removed` | Removed from store |
| `promo_launched` | Promotion |
| `policy_change` | Policy change |
| `positioning_shift` | New messaging |
| `price_undercut` | Cheaper than you |

Move summaries come from the existing `describeEvent`, so the app, alerts and briefing all use the same words.

---

## 6. Emails (email-safe HTML)

Both templates already exist (Phase 4). This spec restyles them to match the app.

**Visual rules:**
- Single column, 600px max, mobile-first, table layout, inline CSS.
- System font stack. The app's neutral background, white cards with a light border and rounded
  corners, near-black body text, grey secondary text.
- One dark primary button. Priority pills in the same colours as the app badges.
- Product thumbnails only, with alt text. No other images; the logo is text.

**Links:** every item links to `https://<app>/competitors/{id}#move-{eventId}`. The footer links to
Settings and to the unsubscribe link.

### 6.1 Instant alert

**Subject:** "Hearth & Pine started a sale: up to 60% off"

1. **Preheader:** "12 products on sale, including Honeycomb Duvet Cover."
2. **Header:** Trailwatch · "Instant alert".
3. **Card:** **High** pill · "Hearth & Pine started a sale" · "12 products, up to −60%. Honeycomb Duvet
   Cover is now $108 (was $269)."
4. **Compared with yours** (when matched): "Your Waffle Duvet Cover is $189, $81 more."
5. **What you could do:** one line.
6. **Button:** **See it in Trailwatch**.
7. **Footer:** "Moves caught this month: 37" · Change alerts · Unsubscribe.

**Bundled variant:** "Hearth & Pine launched 5 products", with a list of 5 names and prices.

### 6.2 Monday briefing

**Subject:** "Your Monday briefing: 3 competitors, 41 moves"

1. **Preheader:** the first sentence of "What this means".
2. **Header:** "Monday briefing · week of Sep 28".
3. **What this means for you:** 2–3 sentences, for example: "Hearth & Pine is clearing bedding ahead
   of the holidays: 12 sale starts and a sitewide sale on Friday. Dewlane now undercuts you on 3
   duvet covers."
4. **One move for this week:** one action, for example: "Hold your duvet prices. Their sale is
   clearance, not a permanent cut."
5. **Top moves:** up to 5, each with a pill, a one-line summary and a link.
6. **By competitor:** one card per competitor, with counts ("38 moves · 5 new products · 12 sales"),
   their top 3 lines and "See all 38". A quiet competitor gets one line: "Dewlane: quiet week, nothing changed."
7. **Button:** **Open Trailwatch** → Home.
8. **Footer:** same as the alert.

**Quiet-week variant:** "A quiet week. None of your 3 competitors made a big move." + snapshot links.

---

## 7. Open questions

**Decisions (2026-09-30, "all recommended"):**
1. Briefing stays on **Monday**; users pick the **time and time zone**.
2. Removal list confirmed: billing and account move into Settings, `/admin` is unchanged, and the
   founder-edition screens are removed.
3. Keep Trailwatch's current **lime accent** (`--accent` #9ff50a) and **DM Sans** from `tokens.css`.
   Both are clearly distinct from Shopify's look.
4. Support email: **to be decided**. The design uses a placeholder.
5. Watched pages are **read-only**.
6. Your store is **required** (since 2026-10-04: beta members compare against it; no skip in onboarding, no remove in Settings).
7. Both first-report data fixes happen **during the build**.
8. Mobile is **daily use** for Home, competitor detail and the emails. Every other screen must work at
   narrow widths.

The original questions:

1. **Briefing timing.** The brief asks for day *and* time. My recommendation: keep **Monday** (it's the
   product promise, and one weekly batch keeps AI costs down) and let users pick the **time and time
   zone**. That needs new columns and a small scheduler change; today it's Monday 8:00 AM Eastern for
   everyone. Monday-only OK?
2. **Screens not in the brief.** As agreed: billing and account fold into Settings, `/admin` is
   unchanged, and the founder-edition screens are removed. Confirm the removal list (page-change
   detail, the modal routes, the per-page add/edit flows). The marketing site's free tools stay untouched.
3. **Accent colour.** The design uses a neutral palette with one accent. Keep Trailwatch's current
   accent from `tokens.css`, or pick a new one in Claude Design? It must not be Shopify green.
4. **Support email** for the footer and "Help" menu item.
5. **Watched pages.** Read-only for now (auto-picked homepage, sale page and policies), or should users
   add and remove pages? Recommend read-only.
6. **Your store: optional or required?** Recommend optional (skippable), since "cheaper than you" is a
   bonus and asking for it could slow sign-up.
7. **Two small first-report data fixes** found while pulling real data: count "recently launched"
   by *created* date (Northwind Knits' 398 republished products would otherwise show as new) and
   drop helper products (types like `return`, `package_protection`). Do them during the build?
8. **Mobile scope.** Every screen gets a narrow-width design. Is mobile a daily-use target (people
   open alerts on their phone), or just "must not break"? Recommend daily-use for Home, competitor
   detail and emails.
