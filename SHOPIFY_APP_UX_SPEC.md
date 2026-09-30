# TrailWatch — Embedded Shopify App: UX spec

Status: **draft for owner review** (Step 2 of `trailwatch-shopify-app-prompt.md`). No app code yet.

The app is the main UI; it runs inside the Shopify admin (App Home, iframe model) and is built with
**Polaris web components** (`s-*`, loaded from Shopify's CDN) plus **App Bridge**. The existing
TrailWatch backend (phases 1–7) stays the source of truth — the app is a thin front end.

Sources checked through the Shopify AI Toolkit docs search (2026-09-30):
App Home v1.0 components + patterns (Homepage, Index, Details, Settings templates; Empty state, Setup
guide, Metrics card, Index table compositions), App Bridge (`s-app-nav`, title bar via `s-page`, Toast,
Save Bar, Loading), App Design Guidelines + Built for Shopify requirements, distribution, billing,
compliance webhooks, token exchange / managed installation.

---

## 0. What the real data looks like

The database has no events yet (migrations 0009–0015 aren't applied), so these numbers come from
running our own crawler on 3 real Shopify stores today. Brand names are replaced with fictional
ones; product names are lightly genericized.

| Fictional name | Real type | Products | Variants | On sale | Sold out | Price range | Crawl |
|---|---|---|---|---|---|---|---|
| **Dewlane** | bedding & bath | 313 | 5,870 | 78 | 27 | $7.25–$1,084 | 3 requests, 6s |
| **Hearth & Pine** | home textiles | 1,632 | 4,538 | 199 | 203 | $3–$2,850 | 8 requests, 12s |
| **Northwind Knits** | shoes & apparel | 692 | 7,454 | 144 | 260 | $0.80–$165 | 4 requests, 5s |

Edge cases the design must survive (all real):

- **Long product names.** Longest seen: *"Women's Trail Runner Mid Waterproof - Stony Cream/Rugged Beige
  (Stony Cream Sole)"* (83 chars); *"Organic Keys Jacquard Bolster Pillow Cover - FINAL SALE (Dusk and
  Evergreen)"* (76). Truncate to one line in lists, full name on hover and on detail.
- **Big discounts.** Up to −85% (*"Breezeweave Crinkle Cotton Sham Set - Last Call"*, $13.35, was $89).
- **Busy competitor.** Hearth & Pine published 96 products in 30 days, 5 in the last 7, and has 199
  items on sale → roughly **30–40 events a week** once history exists. The feed needs filters and
  pagination from day one.
- **Quiet competitor.** Dewlane: 0 launches in 7 days. Empty per-competitor timelines are normal,
  not an error.
- **Republish storm.** Northwind Knits shows 398 products "published" in the last 7 days but 0
  *created* in 30 — they re-published old products. Our first report currently counts these as
  "recently launched" (see Open question 9). The diff engine is unaffected (it uses new product IDs).
- **Helper products.** Northwind Knits has non-products (type `return`, `package_protection`, $0.80).
  Brooklinen-style $0 helpers are already dropped; these low-price ones aren't (Open question 9).
- **"Colour per product" catalogs.** Hearth & Pine lists each colour as its own product
  (*"Boucle Ball Pillow (Ink)"*, *"Boucle Ball Pillow (Tobacco)"*) → launches arrive in bursts of
  near-identical names. The alert bundling from Phase 4 already groups them; the UI should show
  "5 new products" with an expand, not five rows.
- **Marketplace entered.** `amazon.com` → *"Add the brand's own website instead; marketplace tracking
  is coming soon."* (existing denylist message, reused verbatim).

---

## 1. Navigation

App Bridge **`s-app-nav`** (desktop: admin sidebar; Shopify mobile: title-bar dropdown). Labels are
short nouns, per the design guidelines. The app name itself links to Home, so Home isn't a nav item.

| Nav item | Route | Template |
|---|---|---|
| *(app name → Home)* | `/app` (`rel="home"`) | Homepage |
| **Competitors** | `/app/competitors` | Index |
| **Settings** | `/app/settings` | Settings |

Not in the nav (reached by links):

- **Onboarding** `/app/welcome`: shown instead of Home until the merchant has added ≥1 competitor.
- **First report** `/app/competitors/:id/report`: opened right after adding a competitor; linked from
  competitor detail ("View snapshot").
- **Competitor detail** `/app/competitors/:id`: from Home feed rows, the Competitors list, and every
  alert/briefing email item.

Every sub-page has a breadcrumb back to its parent (`s-page` `breadcrumb-actions` slot — a Built for
Shopify requirement). No in-page tabs; the nav is enough.

> Added beyond the brief: a **Competitors** list (Index template). The brief's screens have no place
> to see all competitors at once, and a nav item needs a destination. Confirm (Open question 1).

---

## 2. User flow

```
Install (Shopify managed install, scope read_products)
  → App opens in admin → token exchange (template handles it)
  → Backend: find or create the TrailWatch account for this shop            [new]
  → Backend: read the merchant's own catalog via Admin API (products)        [new, replaces
                                                                              manual "your store" domain]
  → Onboarding: welcome → add competitors → "Building your first report"
  → First report (per competitor, within ~10–60s)
  → Home (daily use): feed of moves, counter, next briefing
  → Instant alerts (email / Slack) and the Monday briefing link back into the app
```

**Account mapping.** One shop = one TrailWatch account. Key: the shop's `myshopify.com` domain
(stable; the public domain can change). On first install we create the account with the shop's
contact email (Admin API `shop { email }`) as the alert recipient, `founding_member = true`, beta
plan. Re-install reconnects the same account. Existing web-app users are not linked automatically
(Open question 3).

**Own catalog.** On install, the backend reads the merchant's products through the Admin GraphQL API
(title, handle, product type, tags, variants with price / compare-at price / availability) and stores
it as the account's own store: the same normalized shape the crawler produces, so matching and
undercuts (Phase 5) work unchanged. Refresh: once a day before the check tick, plus a manual
"Refresh" (Open question 4 covers product webhooks). For installed shops, the manual "your store
domain" field disappears.

**Onboarding ends** the moment one competitor is added. The first report opens; Home becomes the
landing page from then on.

---

## 3. Screens

Conventions for every screen:

- **Page shell:** `s-page` with `heading`, optional `slot="primary-action"` (one `s-button`
  `variant="primary"`), `slot="secondary-actions"`, `slot="breadcrumb-actions"`. There is no `s-card`:
  blocks are `s-section` (with `heading`).
- **Loading:** Polaris web components have **no skeletons**. Use the App Bridge Loading API for page
  loads, `s-spinner` with an `accessibilityLabel` inside the section that's loading, and
  `s-table loading` for table refreshes. `s-progress` (Polaris 1.1+, included in the stable `polaris.js`)
  for measurable progress.
- **Errors:** `s-banner tone="critical"` at the top of the affected section, with a "Try again"
  button. Action failures use a toast (`shopify.toast.show(..., { isError: true })`).
- **Success feedback:** toasts ("Competitor added", "Settings saved").
- **Severity badges:** `s-badge` with explicit text, since the tone alone can't carry meaning:
  **High** → `tone="warning"`, **Normal** → `tone="info"`, **Low** → default tone.
  (Polaris says choose tone by meaning; "critical" means *error*, so it's not used for a competitor
  move. Open question 6.)
- **Narrow widths:** `s-table` turns into a list on small screens automatically; use `listSlot` on
  headers (`primary`, `inline`, `labeled`). Two-column layouts use `s-grid` and stack below ~768px.

### 3.1 Onboarding (`/app/welcome`)

**Purpose:** get the first competitor added in under a minute.

**Content, top to bottom:**

1. `s-page heading="Welcome to TrailWatch"`, no nav actions.
2. `s-section` (intro): `s-paragraph`: "Add a competitor's store. We'll show you what they've launched,
   what's on sale and what's sold out right away. After that, you'll get an alert when they make a
   big move and a briefing every Monday."
3. `s-section heading="Add a competitor"`:
   - `s-grid gridTemplateColumns="1fr auto"`: `s-url-field label="Competitor's website"`
     `placeholder="dewlane.com"` + `s-button variant="primary"` **Add competitor**.
   - Helper `s-paragraph color="subdued"`: "Their own website, not an Amazon or Etsy page.
     You can add up to 10 during the beta."
   - Added competitors appear below as rows (`s-stack`): name, domain, status `s-badge`
     (Reading catalog… / Ready / Pages only).
4. `s-section heading="Your store"` (read-only confirmation): "We've read your 214 products, so we
   can tell you when a competitor undercuts one of them." (with a spinner while the sync runs).

**Actions:** Add competitor · Remove a just-added row (`s-button variant="tertiary" icon="x"`) ·
**Continue** (primary, enabled after ≥1 is added → First report).

**Backend:** `POST /competitors` (wraps `addCompetitorByDomain`, returns its result codes),
`GET /me` (own-catalog sync status).

**States:**

| State | What shows |
|---|---|
| Empty (first open) | Intro + field + "Your store" section. No rows. |
| Adding | Button `loading`; field disabled. |
| Building first report | Row badge "Reading catalog…" + `s-spinner`; after 60s, the text changes to "Big catalogs take a minute. We'll email you when it's ready." |
| Invalid URL | Field `error`: "Enter a website like dewlane.com." |
| Marketplace | Field `error`: "Add the brand's own website instead; marketplace tracking is coming soon." |
| Not reachable / blocked by robots | Field `error`: "We couldn't read that site. Check the address, or try their main domain." |
| Not Shopify | Row badge "Pages only" + note: "This store isn't on Shopify, so we'll watch its main pages instead of its catalog." |
| Already added | Field `error`: "You're already watching this store." |
| Limit reached | `s-banner tone="info"`: "You're watching 10 competitors, the beta limit." Field disabled. |
| Own catalog sync failed | `s-banner tone="warning"` in "Your store": "We couldn't read your products yet. Price comparisons will start once we can." + Try again. |

### 3.2 First report (`/app/competitors/:id/report`)

**Purpose:** instant value. Show what the competitor is doing *today*, with no history needed.

**Content:**

1. `s-page heading="Dewlane right now"`, breadcrumb → Home (or Onboarding), primary action
   **Go to Home**, secondary **View competitor**.
2. `s-section` stats row (Metrics card composition, `s-grid` of 4): **313** products · **78** on sale ·
   **27** sold out · **$173.70** average price.
3. `s-section heading="Recently launched"` (last 30 days, up to 8): `s-table`, columns: Product
   (thumbnail via `s-thumbnail` + name), Price, Launched. Row → the product on the competitor's site
   (external link, new tab).
4. `s-section heading="On sale now"` (biggest discount first, up to 8): Product, Price, **Was**, % off
   (`s-badge`).
5. `s-section heading="Sold out"` (up to 8): Product, Price.
6. If own catalog is loaded and matches exist: `s-section heading="Cheaper than yours"`: product,
   their price, your price, difference. (Uses Phase 5 matching; hidden when there are none.)
7. Footer `s-paragraph color="subdued"`: "From here on, we check Dewlane every 2 hours and tell you
   what changes."

**Example (real data, fictional brand):**
- Recently launched: *Marlow Mini Pillow - Last Call* $21.00 · Sep 21 · *Luxe Sateen Flat Sheet - Last
  Call* $77.40 · Sep 15
- On sale: *Breezeweave Crinkle Cotton Sham Set - Last Call* $13.35, was $89.00, −85%
- Sold out: *Wideboy Clock - Last Call* $29.50

**Backend:** `GET /competitors/:id/report` (wraps `getFirstReport`).

**States:**

| State | What shows |
|---|---|
| Loading (catalog still being read) | Each section: `s-spinner` + "Reading Dewlane's catalog…". Polls every 5s. |
| Section empty | In-section text, not an error: "Nothing launched in the last 30 days." / "Nothing on sale right now." / "Nothing sold out." |
| Pages-only store (not Shopify) | Stats and sections replaced by `s-banner tone="info"`: "This store isn't on Shopify, so there's no catalog snapshot. We're watching its homepage, sale page and policies." + list of watched pages. |
| Partial catalog (over 25,000 products) | `s-banner tone="info"`: "This is a very large store. We've read the first 25,000 products." |
| Error | `s-banner tone="critical"`: "We couldn't read Dewlane's catalog. We'll try again in a few minutes." + Try again. |

### 3.3 Home (`/app`)

**Purpose:** the daily check-in. What moved, how much, and when the next briefing lands.

**Content:**

1. `s-page heading="Home"`, primary action **Add competitor** (opens an `s-modal` with the same
   add form as onboarding).
2. **Setup guide** (composition) while incomplete, dismissible: ☐ Add a competitor · ☐ Choose where
   alerts go (email is on by default; Slack optional) · ☐ Check your store was read (N products).
3. **Metrics row** (`s-grid`, 3 × Metrics card):
   - **Moves caught this month:** "37"
   - **High-priority this week:** "4"
   - **Next briefing:** "Mon, Oct 5 · 8:00 AM ET" (with "Briefings go to jo@glowfield.com").
4. `s-section heading="Recent moves"`: Index table composition:
   - Filters (`s-grid slot="filters"`): `s-select` **Competitor** (All / each), `s-select` **Type**
     (All / Launches / Price changes / Sales / Stock / Promotions / Pages), `s-select` **Priority**
     (All / High / Normal / Low; Low hidden by default).
   - Columns: **Move** (one-line summary, e.g. "Started a sale: Honeycomb Duvet Cover, now $108
     (was $269, −60%)"), **Competitor**, **Priority** (badge), **When** ("2 hours ago").
   - Bundled rows: "Launched 5 products: Boucle Ball Pillow (Ink), (Tobacco), +3". Clicking expands
     the row in place (`s-clickable`), or goes to the competitor detail filtered to that bundle.
   - Row click → Competitor detail, scrolled to the event.
   - Paginated, 25 per page (`s-table paginate`).
5. Footer (Footer help composition): "Questions? Email support@…" (Open question 8).

**Backend:** `GET /home` (counter via `movesCaughtThisMonth`, high-priority count, next briefing time,
setup state), `GET /events?competitor=&type=&priority=&cursor=`.

**States:**

| State | What shows |
|---|---|
| No competitors | Redirect to Onboarding. |
| Competitors added, no moves yet (first days) | Empty state composition in "Recent moves": heading "No moves yet", text "We check your competitors every 2 hours. The first changes usually show up within a day or two. Meanwhile, see what they're doing right now." + button **View snapshots**. |
| Filters return nothing | Empty state: "No moves match these filters." + **Clear filters**. |
| Loading | Metrics: `s-spinner` per card. Table: `s-table loading`. |
| Error | `s-banner tone="critical"` above the table: "We couldn't load your moves." + Try again. Metrics show "—". |
| Busy competitor (e.g. 40 moves this week) | Normal table; pagination handles volume. Low-priority rows hidden by default keep it readable. |
| Uninstalled then reinstalled | Banner `tone="info"`: "Welcome back. We paused checks while TrailWatch was uninstalled, so some moves may be missing." |

### 3.4 Competitors (`/app/competitors`), added, see Open question 1

**Purpose:** see and manage everyone being watched.

**Content:** `s-page heading="Competitors"`, primary **Add competitor**, a line "6 of 10 used (beta)".
`s-table` columns: **Store** (name + domain), **Products**, **On sale**, **Moves (7 days)**, **Last
checked**, **Status** badge (Watching / Pages only / Paused / Can't reach). Row → detail.

**Backend:** `GET /competitors`.

**States:** Empty → Empty state composition ("Add your first competitor"). Loading → `s-table loading`.
Error → critical banner. A store that keeps failing shows badge "Can't reach" (`tone="warning"`) and
a tooltip with the last error in plain words.

### 3.5 Competitor detail (`/app/competitors/:id`)

**Purpose:** everything about one competitor. Used when an alert or briefing item is clicked.

**Layout:** Details template (two columns on desktop: main + sidebar; stacks on narrow).

**Main column:**

1. `s-page heading="Hearth & Pine"`, breadcrumb → Competitors, secondary actions **View snapshot**,
   **Visit store** (external), and a menu with **Remove competitor** (critical).
2. `s-section heading="Timeline"`: moves for this competitor, newest first, grouped by day
   (`s-heading` per day + rows). Same filters as Home minus Competitor. Each row: summary, priority
   badge, time; high-priority rows show "What it means" text (the interpretation from the alert),
   if any.
   Example day: *Sep 29*: "Launched Organic Rib Knit Throw (Garnet), $99" (High) · *Sep 28*:
   "Started a sale on 12 products, up to −60%" (High) · "Mosaic Washcloth Set sold out" (Normal).

**Sidebar:**

3. `s-section heading="Catalog"`: products 1,632 · on sale 199 · sold out 203 · average $247.69 ·
   "Last checked 14 minutes ago · every 2 hours".
4. `s-section heading="Watched pages"`: homepage, sale page, shipping policy, returns policy, each
   with a "last changed" date and an external link. (Read-only in v1; Open question 7.)
5. `s-section heading="Compared with your store"`: "12 similar products · 3 priced lower than yours"
   → link to the filtered timeline.

**Remove:** `s-modal` confirm: "Stop watching Hearth & Pine? You'll stop getting alerts about them.
If you add them back, their past moves come back too." (the shared store and its history stay,
since other users may follow it) → toast "Hearth & Pine removed" → Competitors.

**Backend:** `GET /competitors/:id`, `GET /events?competitor=:id`, `DELETE /competitors/:id`
(wraps `deleteCompetitor`, which unfollows the shared store).

**States:**

| State | What shows |
|---|---|
| No moves yet | Timeline empty state: "No moves since you added Hearth & Pine on Sep 30. That's normal for the first day or two." + **View snapshot**. |
| Quiet competitor (none in 30 days) | "No moves in the last 30 days. We're still checking every 2 hours." |
| Pages only | Catalog section replaced with "This store isn't on Shopify, so we're watching its pages." |
| Can't reach | `s-banner tone="warning"`: "We couldn't reach hearthandpine.com since Sep 28. We'll keep trying." |
| Not found (removed, or bad ID) | Empty state "This competitor isn't in your list" + **Back to competitors**. |
| Loading / error | As Home. |

### 3.6 Settings (`/app/settings`)

**Purpose:** where alerts go, which ones fire, when the briefing arrives, and the plan.

**Layout:** Settings template (grouped `s-section`s, each with a short description). App Bridge
**Save Bar** (`data-save-bar` on the form) instead of a Save button.

1. `s-section heading="Where alerts go"`
   - `s-switch` **Email alerts** (on) · `s-email-field` **Send to** (defaults to shop contact email).
   - `s-url-field` **Slack webhook** (optional). After saving, shows only "Connected to Slack ·
     hooks.slack.com/…/•••" + **Send test** + **Disconnect**. The URL is never shown again (security rule).
2. `s-section heading="Instant alerts"`: "We only alert you for big moves. Everything else waits for
   Monday." One `s-switch` per mutable type: **Sitewide sales** · **Promotions and banners** · **A
   competitor is cheaper than you** · **Big single-product sales (30%+ off)** · **New products** ·
   **Best-sellers selling out**.
3. `s-section heading="Monday briefing"`: `s-switch` **Send the weekly briefing** · `s-select` **Day**
   · `s-select` **Time** (shop's timezone) (new backend setting; Open question 2).
4. `s-section heading="Plan"`: "**Free beta** · Founding member" `s-badge tone="success"`; limits: "10
   competitors · checks every 2 hours · instant alerts". Text: "Free while we're in beta. Founding
   members keep a discount when paid plans start." No upgrade button.
5. `s-section heading="Your store"`: "214 products read · last synced 3 hours ago" + **Refresh**.

**Backend:** `GET/PUT /settings` (wraps `getAlertSettings`/`saveAlertSettings` + briefing schedule),
`POST /settings/slack-test`, `POST /own-catalog/refresh`.

**States:** Loading → spinner per section. Save error → toast (error) and keep the Save Bar up. Invalid
Slack URL → field error: "Paste a Slack webhook URL. It starts with https://hooks.slack.com/". Slack
test failed → toast "Slack didn't accept the test message. Check the webhook." Email alerts off *and*
no Slack → `s-banner tone="warning"`: "You won't get instant alerts. They'll only appear here and
in the briefing."

---

## 4. In-app copy

Rules: second person, verbs first, no jargon ("catalog snapshot", "diff", "event", "severity" never
appear in the UI). Say "move", "priority", "competitor", "your store".

| Internal term | UI word |
|---|---|
| event | move |
| severity high / normal / low | High / Normal / Low priority |
| store (followed) | competitor |
| own store | your store |
| first report | snapshot |
| briefing | Monday briefing |
| `product_launched` | New product |
| `price_changed` | Price change |
| `sale_started` / `sale_ended` | Sale started / Sale ended |
| `sold_out` / `restocked` | Sold out / Back in stock |
| `product_removed` | Removed from store |
| `sitewide_sale_detected` | Sitewide sale |
| `promo_launched` | Promotion |
| `policy_change` | Policy change (shipping/returns) |
| `positioning_shift` | New messaging |
| `price_undercut` | Cheaper than you |

Move summaries reuse `describeEvent` (Phase 4), so the app, alerts and briefing say the same thing.

---

## 5. Emails (email-safe HTML, not Polaris)

Both already exist as backend templates (Phase 4); this spec restyles them to feel like the admin app.

**Visual rules:** single column, max width 600px, mobile-first. Table-based layout, inline CSS.
System font stack (`-apple-system, BlinkMacSystemFont, "San Francisco", "Segoe UI", Roboto,
"Helvetica Neue", sans-serif`), which is what the admin uses. Colours borrowed from Polaris's neutral
palette: page background light grey (≈#F1F1F1), white cards with a 1px light border and 12px radius,
body text near-black (≈#303030), secondary text grey (≈#616161), one dark primary button (≈#303030 bg,
white text). Priority pills use the same colours as the app badges. Exact hex values get confirmed
against Polaris tokens in Step 6. No images except product thumbnails (with alt text). Dark mode:
rely on client defaults; no forced colours.

Every item links into the app: `https://admin.shopify.com/store/{shop}/apps/{app-handle}/app/competitors/{id}#event-{eventId}`.

### 5.1 Instant alert

Subject: **"Hearth & Pine started a sale: up to 60% off"**

1. Preheader: "12 products on sale, including Honeycomb Duvet Cover."
2. Small header: TrailWatch wordmark (text) · "Instant alert".
3. Card: priority pill **High** · heading "Hearth & Pine started a sale" · one-line what: "12 products,
   up to −60%. Honeycomb Duvet Cover is now $108 (was $269)."
4. "Compared with yours" (if matched): "Your Waffle Duvet Cover is $189, $81 more."
5. "What you could do": one line from `suggestedAction`.
6. Button **See it in TrailWatch** → competitor detail.
7. Footer: "Moves caught this month: 37" · "Change alerts" (→ Settings) · "Unsubscribe".

### 5.2 Monday briefing

Subject: **"Your Monday briefing: 3 competitors, 14 moves"**

1. Preheader: the one-line "What this means" summary.
2. Header: "Monday briefing · week of Sep 28".
3. **What this means for you**: 2–3 sentence interpretation (Sonnet).
4. **One move for this week**: one suggested action.
5. **Top moves**: up to 5, each with pill, summary and link.
6. **By competitor**: one card per competitor: name, counts ("5 new products · 2 sales · 1 price
   change"), 3 top lines, "See all 38 moves" link. A competitor with no moves gets one line:
   "Dewlane: quiet week, nothing changed."
7. Button **Open TrailWatch** → Home.
8. Footer as the alert.

**Quiet-week variant:** "A quiet week: none of your 3 competitors made a big move." + snapshot links.

---

## 6. Proposed architecture (for Step 3, summarized here so the endpoints above make sense)

- `apps/shopify/`: Shopify CLI app, current React Router template, Polaris web components + App
  Bridge; `shopify.app.toml` with `read_products` only; managed installation; webhooks
  `app/uninstalled` + the 3 compliance topics.
- The template's server authenticates the admin session (token exchange), then calls the TrailWatch
  backend server-to-server: `https://…/api/shopify/*` with a shared secret and the shop domain. The
  backend maps shop → account and runs the existing feature code. The browser never talks to the
  backend directly.
- New backend pieces: `shops` table (shop domain → user, installed/uninstalled at, own-catalog
  sync), `/api/shopify/*` endpoints listed per screen, briefing day/time columns, own-catalog import
  from Admin API data, uninstall → pause crawling for that account.

---

## 7. Open questions

1. **Competitors list screen.** OK to add it (nav: Home · Competitors · Settings)?
2. **Briefing day/time.** Currently fixed Monday 08:00 ET for everyone, with Batch API cost savings
   from one weekly run. Options: (a) keep Monday, let them pick the **time** only (in shop timezone);
   (b) any weekday + time. (a) is simpler and keeps "Monday briefing" true. Recommend (a).
3. **Existing web-app users.** Should a web-app account be linkable to an installed shop (same email
   → offer to connect), or are Shopify installs always new accounts? Recommend: always new for now.
4. **Own-catalog freshness.** Daily re-read via Admin API (simple, what's specced) vs subscribing to
   `products/create|update|delete` webhooks (live, more moving parts). Recommend daily for the beta.
5. **Retention on uninstall.** Proposal: stop crawling immediately; keep the account and history 30
   days (reinstall restores everything); then delete account data. Answer `shop/redact` (sent 48h after
   uninstall) by deleting shop data then. Shopify requires the redact to be honoured within 30 days,
   so in practice: **delete at `shop/redact`**. Is 48 hours of grace enough, or do you want reinstall
   to restore history (which `shop/redact` would prevent)?
6. **Priority badge colours.** High = `warning` (orange), Normal = `info` (blue), Low = neutral. OK?
7. **Watched pages.** Read-only in the app for v1 (auto-picked homepage/sale/policies), or should
   merchants add/remove pages? Recommend read-only.
8. **Support contact** shown in the footer: which email?
9. **Two first-report data fixes found while pulling real data** (backend, small): count "recently
   launched" by `created_at` (so republished products aren't shown as new), and drop obvious
   non-products (types like `return`, `package_protection`). Fix now, as part of Step 3?
10. **Alert recipient.** Default to the shop's contact email (from Admin API). Staff emails aren't in
    the session token, so we can't default to "whoever installed it". OK?
11. **Distribution for the beta** (researched, your call):

    | Option | Who can install | Review | Billing later | Trade-off |
    |---|---|---|---|---|
    | **Custom distribution** (install link) | One store per link (or stores in one Plus org, or dev stores) | None | Not checked yet: I'll confirm in the docs before we rely on it | Fastest for 5–10 hand-picked merchants; one link per store; **can't switch to public later**, so the App Store listing would need a separate public app. |
    | **Public, limited visibility** (unlisted listing) | Anyone with the listing URL | Full App Store review | Shopify App Pricing / Billing API | Same app goes public later by flipping visibility; needs review first (compliance webhooks, design, billing rules) → slower start. |
    | **Dev stores only** | Your own dev stores | None | n/a | For testing; not for real merchants. |

    Distribution method can't be changed after it's chosen. My read: if the beta is < ~10 merchants
    and you'll list publicly later, create the **public** app now for the long run and use its
    limited-visibility listing once reviewed; meanwhile test on dev stores. If you need real merchants
    in before review, a separate **custom** app per merchant works but is throwaway. Your decision.

12. **Billing later.** Public App Store apps must use Shopify's billing (Shopify App Pricing is the
    default for new public apps). Paddle would stay for web-app customers only. The plan structure
    (`PLANS`, `billingEnabled()` flag, founding-member flag) already supports adding it behind the
    flag. No action now; just confirming you're OK with Shopify taking its revenue share on
    Shopify-installed customers.
