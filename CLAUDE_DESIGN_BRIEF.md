# Claude Design brief: Trailwatch web app (Shopify-admin style)

> **How to use:** paste everything below the line into Claude Design. Attach `public/logo.svg` (the
> Trailwatch logo). Replaces the older `DESIGN_BRIEF_FOR_CLAUDE_DESIGN.md`. Source of truth for
> behaviour: `UX_SPEC.md`.

---

Design the signed-in web app and two emails for **Trailwatch**. Please produce one artboard per
screen *and per state* listed below, at **desktop (1440px)** and **mobile (390px)** widths.

## 1. Product

Trailwatch tells US Shopify brands what their competitors are doing. You add competitor stores by
their website; we watch their catalogs (new products, prices, sales, stock) and key pages
(homepage, sale page, policies). Big moves trigger an **instant alert** by email or Slack; everything
else is summed up in a **Monday briefing** that explains what it means for your products.

**Promise:** "Instant alerts when a competitor moves, a briefing every Monday."

**User:** a busy founder or marketing lead of a US direct-to-consumer brand on Shopify (bedding,
apparel, beauty, home). Not technical. They open Trailwatch from an alert email, often on their
phone, and want to know in ten seconds what changed and whether to act.

**Tone:** calm, plain, useful. Short sentences, verbs first. We say "move", never "event"; "High
priority", never "severity".

## 2. Visual direction

- Follow the **Shopify admin's layout and patterns**, so Shopify merchants feel at home: a top bar, a left
  sidebar, a page header with one primary action, content in white cards on a light grey background,
  index tables with a filter bar, status badges, banners, empty states, a settings page with the description on
  the left and the card on the right, and a save bar for unsaved changes. Dense but calm, with plenty of alignment and
  little decoration.
- **It must not be a copy of Shopify.** No Shopify logo, name, icons, green, or wording that suggests
  Trailwatch is made by or part of Shopify. Use **Trailwatch's own logo, colours and font** (below).
  The feeling is "familiar", not "clone".
- **Colours (use these values):**
  - Page background `#f5f5f5`, card `#ffffff`, sunken/subdued surfaces `#efede8`
  - Borders `#e6e2da` (cards), `#efece6` (dividers), `#dcd8d0` (inputs)
  - Text `#1a1a17` (primary), `#4a4740`, `#6e6b63` (secondary), `#8b877e` (subdued)
  - **Accent: lime `#9ff50a`** (hover `#8ad800`), with dark text `#1a1a17` on it. Tints `#eefbc7` / `#d6f59b`.
    Use it for primary buttons, the active nav item and focus rings only. It's the brand, so use it sparingly.
  - Links `#2563eb`
  - Status: success `#3a7d4f` on `#eaf3ea` · attention `#b4791e` on `#fbf1df` · info (blue) · critical
    `#dc2626` on `#fbeeec` · neutral grey
- **Type:** **DM Sans** throughout, with a compact admin scale (13–14px body, 20px page titles, 12px
  labels). Numbers in tables are right-aligned and tabular.
- **Shape:** 8–12px card radius, 1px borders, very light shadows or none. Icons: simple line icons,
  not Shopify's icon set.

## 3. Components (design only with these)

We'll build exactly this set. Every design must be made from it. **If something you need isn't here, call it
out on the artboard ("NEW COMPONENT: …") instead of inventing it quietly.**

1. **App frame**: top bar (logo left; account menu right, with initials, name, and a menu of
   Settings / Help / Log out) + left sidebar (Home, Competitors with a count, Settings; bottom:
   "Your store: glowfield.com · 214 products" and a "Free beta" badge). On mobile: a menu button in the top bar
   opens the sidebar as a drawer.
2. **Page**: header with title, optional breadcrumb ("‹ Competitors"), one primary button, secondary
   buttons, a "More actions" menu.
3. **Card**: optional title row, body, optional footer; can hold sections separated by dividers.
4. **Button**: primary (lime), secondary (white, bordered), plain (text), critical (red); each with
   a loading state (spinner) and a disabled state.
5. **Badge**: neutral, info, success, attention, critical. Always with text.
6. **Index table**: filter bar (selects in a row), header row, rows with hover, pagination
   (Previous / Next). **On mobile, rows stack into list items** (title line + meta line), never a
   squeezed table.
7. **Banner**: info, success, warning, critical; title, text, optional action, optional dismiss.
8. **Text field**: label, placeholder, help text, error text (red, with icon), optional prefix
   ("https://").
9. **Empty state**: heading, one or two sentences, a primary action, an optional small line illustration.
10. **Select**
11. **Toggle** (switch) with a label and description
12. **Stat**: label, big number, optional sub-line
13. **Modal**: title, text, optional input, Cancel + confirm (confirm can be critical)
14. **Toast**: short dark message at the bottom ("Competitor added"); an error variant
15. **Spinner** (with a text label) and **Progress bar** (with a label like "250 of 313 products")
16. **Setup guide**: a card with a checklist ("2 of 3 done"), each row with a checkbox, label and
    action; dismissible

**Loading states** use a spinner with a label *inside the card that's loading*. Tables keep their header and dim
their rows. **No skeleton placeholders.**
**Priority badges:** **High** = attention (amber), **Normal** = info (blue), **Low** = neutral (grey).
Red is only for errors.

## 4. Sample content (use it; it's real data with fictional brand names)

- **The user:** Jo, founder of **Glowfield Home** (glowfield.com), a bedding brand with 214 products.
  Email: jo@glowfield.com.
- **Competitors:**
  - **Hearth & Pine**: home textiles, 1,632 products, 199 on sale, 203 sold out, average $247.69. **Very
    busy: 38 moves this week.**
  - **Dewlane**: bedding & bath, 313 products, 78 on sale, 27 sold out, average $173.70. **Quiet: 0
    moves in 30 days.**
  - **Northwind Knits**: shoes & apparel, 692 products, 144 on sale, 260 sold out.
  - **Oakline Goods**: not on Shopify, "Pages only" (we watch its pages, not its catalog).
  - **Peak Tonic**: 540 products, status "Can't reach" since Sep 28.
- **Long product names (use at least one per list):**
  - "Women's Trail Runner Mid Waterproof - Stony Cream/Rugged Beige (Stony Cream Sole)" (83 chars)
  - "Organic Keys Jacquard Bolster Pillow Cover - FINAL SALE (Dusk and Evergreen)"
- **Other product names:**
  - Marlow Mini Pillow - Last Call, $21.00
  - Luxe Sateen Flat Sheet - Last Call, $77.40
  - Breezeweave Crinkle Cotton Sham Set - Last Call, $13.35 (was $89.00, −85%)
  - Honeycomb Duvet Cover, $108 (was $269, −60%)
  - Wideboy Clock - Last Call, $29.50, sold out
  - Organic Rib Knit Throw (Garnet), $99
  - Boucle Ball Pillow (Ink / Tobacco / Sage / Oat / Rust), $79 each
  - Mosaic Washcloth Set, $38, sold out
- **Moves (feed rows):**
  - "Sitewide sale: 34% of products discounted, up to −60%" · Hearth & Pine · High · 2h ago
  - "Cheaper than you: Linen Duvet Cover is $169, yours is $189" · Dewlane · High · 5h ago
  - "Launched 5 products: Boucle Ball Pillow (Ink), (Tobacco), +3" · Hearth & Pine · High · yesterday
  - "Wideboy Clock sold out" · Dewlane · Normal · yesterday
  - "Changed the returns policy" · Northwind Knits · Normal · Sep 27
  - "Price change: Luxe Sateen Flat Sheet $86 → $77.40" · Dewlane · Normal · Sep 26
  - "New messaging on the homepage: 'Sleep cooler all year'" · Hearth & Pine · Normal · Sep 25
- **Numbers:** moves caught this month **37**; high priority this week **4**; next briefing **Mon, Oct
  5, 8:00 AM**; plan **Free beta · Beta member**, limit **10 competitors**, checks **every 2 hours**.

## 5. Screens and states

Name artboards `NN-Screen / state`, for example `04-Home / empty`.

### 01 Sign up / log in (no app frame; centred card on the grey background, logo above)
- **Sign up:** "Create your account", sub-line "Know what your competitors change, as soon as they
  change it.", **Continue with Google**, "or", Email, Password ("At least 8 characters"),
  **Create account**, "Already have an account? Log in", and small Terms / Privacy links.
- **Log in:** the same, plus "Forgot password?".
- **Forgot password** and **Set a new password** cards.
- **States:** submitting (button loading) · "Check your inbox" after sign up (with Resend) · wrong
  password (critical banner: "That email and password don't match.") · field errors · sign-ups
  full for today (info banner: "Today's beta spots are gone. Try again tomorrow.") · link expired
  (warning banner + "Send a new link").

### 02 Onboarding (app frame with the nav disabled; narrow column; a two-step progress line: "1 Your store · 2 Competitors")
- **Step 1, Your store:** "What's your store?", "We'll compare your competitors' prices with
  yours.", field "Your store's website" (glowfield.com), **Continue**, plain **Skip for now**.
- **Step 2, Competitors:** "Who do you compete with?", "Add up to 10 stores during the beta. Use
  their own website, not an Amazon or Etsy page.", field + **Add**, then a list of added stores with
  status badges (**Reading catalog…** with a spinner, **Ready**, **Pages only**, **Couldn't read**)
  and a remove ×, then primary **See your first report**.
- **Building your first report:** a card with a progress bar, "Reading Dewlane's catalog: 250 of 313
  products".
- **States (each an artboard):**
  - empty
  - adding
  - invalid address ("Enter a website like dewlane.com.")
  - **marketplace** ("Add the brand's own website instead; marketplace tracking is coming soon.")
  - can't reach ("We couldn't open that site. Check the address, or try their main domain.")
  - not on Shopify (Pages-only row with its note)
  - already added
  - own store entered as a competitor ("That's your store. Add a competitor's instead.")
  - limit reached (info banner, field disabled)
  - slow ("Big catalogs take a minute. We'll email you when it's ready." + **Go to Home**)

### 03 First report ("Dewlane right now")
- Breadcrumb "‹ Dewlane", primary **Go to Home**, secondary **Visit store**.
- Stats: 313 products · 78 on sale · 27 sold out · $173.70 average.
- Cards: **Recently launched** (thumbnail, name, price, date; up to 8) · **On sale now** (name, price,
  was, −% badge) · **Sold out** · **Cheaper than yours** (their product and price vs yours, with the difference).
- Footer line: "From now on we check Dewlane every 2 hours and tell you what changes."
- **States:** still reading (spinner in each card) · a card with nothing ("Nothing on sale right now.")
  · pages-only store (info banner listing the watched pages instead of stats and cards) · very large store
  (info banner "We've read the first 25,000 products.") · error (critical banner + Try again).

### 04 Home
- Title "Home", primary **Add competitor** (opens a modal with the add form: design the modal too).
- **Setup guide** (Add your store · Add a competitor · Choose where alerts go; "2 of 3 done").
- **Stats row:** Moves caught this month **37** · High priority this week **4** · Next briefing
  **Mon, Oct 5, 8:00 AM** (sub-line "to jo@glowfield.com").
- **Recent moves** index table: filters Competitor / Type / Priority; columns Move, Competitor,
  Priority, When; one **bundled row expanded** ("Launched 5 products" with the 5 listed); pagination.
- **States:**
  - populated
  - **busy week** (Hearth & Pine's 38 moves filling pages)
  - no moves yet (empty state: "No moves yet. We check your competitors every 2 hours. First
    changes usually show up within a day or two." + **View snapshots**)
  - filters match nothing (+ **Clear filters**)
  - loading
  - error
  - briefing turned off (stat shows "Off" + "Turn on")
- **Mobile is a daily-use screen here**, so take care with the stacked feed rows.

### 05 Competitors
- Title, primary **Add competitor**, "6 of 10 (beta limit)".
- Table: Store (favicon, name, domain) · Products · On sale · Moves (7 days) · Last checked · Status.
  Include all 5 sample competitors, with statuses Watching / Pages only / Can't reach.
- **States:** empty (empty state "Add your first competitor"), loading, error, and the "Can't reach"
  tooltip.

### 06 Competitor detail ("Hearth & Pine")
- Desktop: two columns. Mobile: the sidebar cards stack under the header.
- Header: favicon + name, breadcrumb "‹ Competitors", **View snapshot**, **Visit store**, and More
  actions → **Remove competitor**.
- **Timeline** card: grouped by day, filters Type / Priority. High rows show a "What it means"
  line, for example: "Their third throw this month. They're building out the category ahead of the
  holidays." Also show one "Compared with yours" line and one row **highlighted** (arrived from an
  email link). Add "Show older" at the end.
- **Sidebar:**
  - **Catalog** card (1,632 · 199 · 203 · $247.69; "Checked 14 min ago · every 2 hours")
  - **Watched pages** card (Homepage, Sale page, Shipping policy, Returns policy, each with a
    "changed Sep 12" date and an external link)
  - **Compared with your store** card ("12 similar products · 3 cheaper than yours")
- **Remove modal:** "Stop watching Hearth & Pine? You'll stop getting alerts about them. If you add
  them back later, their history comes back too."
- **States:**
  - busy (Hearth & Pine)
  - **quiet** (Dewlane: "No moves in the last 30 days. We're still checking every 2 hours.")
  - no moves yet
  - pages only (Oakline Goods)
  - can't reach (Peak Tonic, warning banner)
  - not found
  - loading
  - error
- **Mobile is a daily-use screen here.**

### 07 Settings (description on the left, card on the right; stacks on mobile)
- **Where alerts go:** toggle Email alerts, field Send to; field Slack webhook. Also show a
  **connected** state: "Connected to Slack" + Send test + Disconnect, never showing the URL.
- **Which moves alert you:** "We only alert you about big moves. Everything else waits for Monday."
  Six toggles: Sitewide sales · Promotions and banners · Cheaper than you · Big sales (30%+ off one
  product) · New products · Best-sellers selling out.
- **Monday briefing:** toggle, Time (6–11 AM), Time zone.
- **Your store:** field + "214 products · checked 3 h ago" + Remove.
- **Plan:** "Free beta · Beta member" (success badge); "10 competitors · checks every 2 hours ·
  instant alerts · Slack"; "Free while we're in beta. Beta members keep a discount when paid plans
  start." No upgrade button.
- **Account:** Name, Email (read-only), Change password, **Delete account** (critical; the modal asks you to
  type "delete").
- **States:**
  - the **save bar** showing (Unsaved changes · Discard · Save)
  - saved toast
  - save failed (error toast)
  - invalid Slack URL
  - Slack test failed
  - email off and no Slack (warning banner: "You won't get instant alerts. They'll only show up here
    and in your Monday briefing.")
  - loading

### 08 Opportunities (added 2026-10-04; nav item "Opportunities" under Home)

**Purpose:** gaps and momentum worth acting on, as opposed to Home's feed of moves. Each item says what
we noticed, shows the evidence, and suggests one action. It's for Pro, and for everyone during the beta.
Signals are never presented as sales data: "#4 in their Best Sellers", never "sells 400 a week".

**Kinds** (a small label on each card):
- Category gap: competitors sell a type of product you don't
- Format gap: travel sizes, bundles, kits or subscriptions
- Entry price: competitors have products under $25 and you don't
- Rising product: a competitor's product climbing their Best Sellers list
- Demand: repeated sell-outs and restocks, a launch selling out fast, or weeks on their homepage

**Content per card:**
1. Kind label.
2. "What we noticed" in one or two sentences, bold.
3. Evidence: the competitors involved (favicon + name) and up to 3 of their products. Each product has a
   thumbnail, title, price, and small signal chips: "#4 in Best Sellers", "Launched 9 days ago",
   "Restocked 3× in 90 days", "On homepage 30 days".
4. **Try:** one suggested action.
5. Actions: **Dismiss** ("comes back only if the evidence gets much stronger") and **Not relevant to
   me** (never comes back). A "Show dismissed" link at the bottom lists dismissed items, each with
   **Restore**.

Ordered strongest first. At most about 20 cards.

**States:**
- list (3–6 cards)
- one card expanded with full evidence
- dismissed (toast with Undo)
- "Show dismissed" view
- **empty: no own store.** "Add your store to see gaps. Rising products and demand signals still show
  up here." with an **Add your store** button.
- **empty: not enough data yet.** "We're still learning these stores. Best Sellers movement needs a few
  daily reads, and restock patterns need a few weeks."
- **Best Sellers unavailable** note on a competitor ("Boll & Branch doesn't publish a Best Sellers list
  we can read")
- loading
- not on plan (upgrade note; hidden during the beta)

**Sample data (fictional brands):**
- *Format gap:* "3 of your 5 competitors offer travel sizes, and you don't. Fernwood's Mini Linen Kit is
  #4 in their Best Sellers." Evidence: Fernwood (Mini Linen Kit, $38, "#4 in Best Sellers", "Launched 12
  days ago"), Hearth & Pine (Travel Pillowcase, $24), Dewlane (Weekender Set, $45). Try: "Consider
  testing a travel-size version of your best-seller, for trial or gifting."
- *Rising product:* "Hearth & Pine's new Waffle Robe, launched 6 days ago, is already #2 in their Best
  Sellers." Try: "Check how your comparable robes compare on price and product page; this is the one
  Hearth & Pine is pushing."
- *Demand:* "Dewlane's Linen Duvet Cover sold out and was restocked 3 times in the last 90 days." Try:
  "Make sure your comparable duvet covers are in stock and easy to find; there's demand Dewlane can't
  always meet."
- *Entry price:* "2 of your 5 competitors have products under $25; your lowest regular price is $68."
  Try: "Consider an entry product under $25 to lower the cost of a first order."

**Monday briefing (E2):** a new **Opportunities** card after Top moves, with at most 3 items. Each has
the noticed line in bold, one grey evidence line ("Fernwood, Hearth & Pine · Mini Linen Kit: #4 in
Fernwood's Best Sellers") and "**Try:** …". It also appears in the quiet-week variant. Add a "See all
opportunities" link once this screen exists.

## 6. Emails (a separate section; these are not app screens)

Email-safe: **single column, 600px max, mobile-first**. Simple blocks only; no fancy layout, no web fonts
(use a system font stack), no background images. They should look like the app: grey background,
white cards, dark text, priority pills in the badge colours, one dark or lime button. The logo is text
or the attached logo. Design both at 600px and 375px.

**E1 Instant alert.** Subject "Hearth & Pine started a sale: up to 60% off".
1. Preheader
2. Header: "Trailwatch · Instant alert"
3. Card: High pill, "Hearth & Pine started a sale", "12 products, up to −60%. Honeycomb Duvet Cover is
   now $108 (was $269)."
4. "Compared with yours: your Waffle Duvet Cover is $189, $81 more."
5. "What you could do": one line
6. Button **See it in Trailwatch**
7. Footer: "Moves caught this month: 37 · Change alerts · Unsubscribe"

Also design the **bundled variant**: "Hearth & Pine launched 5 products", listing 5 names with prices.

**E2 Monday briefing.** Subject "Your Monday briefing: 3 competitors, 41 moves".
1. Header: "Monday briefing · week of Sep 28"
2. **What this means for you** (2–3 sentences, for example: "Hearth & Pine is clearing bedding ahead
   of the holidays: 12 sale starts and a sitewide sale on Friday. Dewlane now undercuts you on 3 duvet
   covers.")
3. **One move for this week** ("Hold your duvet prices. Their sale is clearance, not a permanent cut.")
4. **Top moves** (5, each with a pill + link)
5. **By competitor**: a card each with counts, top 3 lines and "See all 38"; Dewlane shows "Quiet week,
   nothing changed."
6. Button **Open Trailwatch**
7. Footer

Also design the **quiet-week variant**: "A quiet week. None of your 3 competitors made a big move."

## 7. Deliverables

- One artboard per screen **and per state** listed above, named `NN-Screen / state`, at **1440px and
  390px**. States that only change one card can be shown as that card alone, as long as it's clearly
  labelled.
- A **component sheet**: every component from §3 with all its variants and states (buttons,
  badges, banners, fields with error, toggle on/off, table desktop + mobile stacked, toast, modal,
  spinner, progress bar, empty state, setup guide, app frame + mobile drawer).
- Label elements with the **component names from §3** so we can map them one to one.
- A list of anything you had to add that isn't in §3 ("NEW COMPONENT: …"), with why.
- Emails E1 and E2 (plus their variants) at 600px and 375px.
