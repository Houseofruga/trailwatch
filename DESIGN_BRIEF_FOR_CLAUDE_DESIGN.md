# Trailwatch: DTC pivot design brief (paste into Claude Design)

> **Superseded (2026-09-30)** by `CLAUDE_DESIGN_BRIEF.md` (Shopify-admin-style UI). Don't use this one.

You already have the **Trailwatch v2** design file. Trailwatch is pivoting its core product, and the app needs **new screens designed in the existing v2 visual language**. Don't reinvent the look; extend it. I'll build what you design 1:1, so please design **every state listed**.

Scope: **core in-app product and emails only.** No landing or marketing pages.

---

## 1. Product and positioning

**Trailwatch: competitive briefings for Shopify brands.**

> "Instant alerts when a competitor makes a move. A briefing every Monday for the big picture."

- The category is **competitive briefing**, not "monitoring." We **interpret** changes and say what they mean for the user's products. Raw data is table stakes.
- **How it works:**
  1. The user adds a competitor **by domain only** (e.g. `dewlane.com`).
  2. We detect whether the store is Shopify.
  3. We read its full product catalog and watch its homepage and sale page.
  4. We turn changes into typed **events**: product launched or removed, price changed, sale started or ended, sold out or restocked, sitewide sale detected, promo launched (homepage banner / discount code / free-shipping threshold), positioning shift, policy change.
- **Severity drives delivery:**
  - **High** → instant alert (email, plus Slack on Pro). Examples: a sale ≥20% or sitewide, a promo launch, a competitor undercutting the user's price, a top product selling out, a new product launch.
  - **Normal** → the Monday briefing. Examples: small price moves, restocks, policy or positioning changes.
  - **Low** (cosmetic) → stored only and never shown by default.
- **Target user:** founder or head of marketing/growth at a US Shopify DTC brand doing $1M–$10M a year. They sell their **own** products in promo-heavy categories (beauty, skincare, supplements, apparel, home, pet). They're busy and non-technical, and they read this on their phone between meetings.

## 2. Brand direction

- A calm, trustworthy, **editorial "briefing"** feel. It should read like a sharp analyst's memo, **not** a dense analytics dashboard. Use few numbers, big clear sentences, and one suggested action.
- **Clear visual hierarchy for severity.** High-severity items must be unmistakable at a glance without looking like errors. A competitor's sale is an *opportunity or threat to act on*, not a system failure, so **don't use red for "high."**
- **Mobile-friendly.** Deliver **desktop and ~375px mobile artboards for every screen.** Dialogs become bottom sheets on mobile, as in v2.

## 3. Keep from the current UI (exact values)

- **Palette:** cream/ink neutrals and one lime accent.
  - `--bg #f5f5f5`
  - `--surface #ffffff`
  - `--surface-alt #fcfbf9`
  - `--surface-sunken #efede8`
  - `--border #e6e2da`
  - `--border-input #dcd8d0`
  - `--ink #1a1a17`
  - `--ink-3 #6e6b63`
  - `--ink-4 #8b877e`
  - `--accent #9ff50a` (lime: primary buttons and badges)
  - `--accent-ink #557a00` (lime-colored text on light backgrounds)
  - `--accent-wash #eefbc7`
  - `--link #2563eb` (plain links only)
  - `--danger #dc2626` (errors only)
- **Type:** **DM Sans** for all UI (400/500/600/700). **Geist Mono** for domains, URLs, prices, numbers and code-like labels. No serif.
- **Shapes:** **zero border-radius everywhere.** Thin 1px borders, flat cards. Shadows appear only on overlays.
- **Patterns to reuse:**
  - Uppercase 10.5px eyebrow labels (letter-spacing 0.08em)
  - Lime primary button + outlined secondary + ink "dark" button
  - Black-with-lime upgrade CTA with a bolt
  - Favicon avatar in a sunken square
  - Skeleton shimmer loaders
  - Dialog shell (header / body / off-white footer)
  - Pale-lime plan-limit panels
  - Left sidebar on desktop; top bar + bottom tab bar on mobile
- **Logo:** the existing Trailwatch lockup, unchanged.

## 4. Design-system additions I need

Extend the v2 system. Don't replace it.

1. **Severity tokens:** high / normal / low. Each needs a badge, a wash and a text color, and each must work in light **and** dark.
2. **Dark mode for the app:** a full dark palette mapped 1:1 onto the tokens above. Today only the emails have one.
3. **Type scale and spacing scale:** formalize what v2 already uses. The app sizes today are 10.5 / 11.5 / 12 / 12.5 / 13 / 13.5 / 14 / 15–16 / 17 / 20–22 / 26–28px. Spacing is 6 / 8 / 10 / 12 / 14 / 16 / 20 / 24px.
4. **New components**, each with its variants and states:
   - **Event card:** severity badge, event type, competitor, product thumbnail when relevant, the one-line interpretation, old → new values (price, % off), timestamp, and "suggested move." Show every event type listed above.
   - **Competitor store card:** favicon, name, domain (mono), platform badge (Shopify / Other), last checked, catalog size, and moves this month.
   - **Alert list / events feed** with **severity filters** (All · High · Normal).
   - **Briefing preview** card.
   - **Plan / pricing table:** Free / Starter / Pro, with a "Founding member" beta state.
   - **Value counter:** "Competitor moves caught this month: 14."
   - **Toggle rows** for alert settings.

## 5. Screens to design (every state)

**A. Signup and onboarding**
1. **Add your store** (optional, skippable): domain input. States:
   - Shopify detected ✓
   - Not Shopify ("we'll still watch your site, catalog features need Shopify")
   - Can't reach the site
2. **Add a competitor by domain:** one input, with no page picking. States:
   - typing
   - checking…
   - Shopify detected, showing the catalog size ("Shopify store · 214 products")
   - Other platform (limited tracking explained)
   - **Marketplace blocked** ("Add the brand's own website instead; marketplace tracking is coming soon.")
   - Unreachable / invalid
   - Duplicate
   - **Plan limit hit** (Free = 1 competitor)
3. **"Building your first report" loading state.** This takes about 1–2 minutes, so it should feel alive and honest: steps like "Reading catalog · 214 products", "Checking prices", "Scanning homepage for promos".

**B. First report** (instant snapshot of one competitor from its current catalog)
- Sections: **Recently launched** · **On sale now** (with % off) · **Sold out** · a short "What stands out" interpretation.
- States:
  - full
  - thin catalog
  - non-Shopify (homepage-only)
  - failed to read catalog (partial report + retry)

**C. Dashboard**
- Competitor list (store cards) + **recent events feed** with severity filters + value counter.
- States:
  - brand-new with 0 competitors (guided empty state)
  - first report still building
  - active week
  - quiet week (reads as "we're watching, nothing moved", not dead)
  - error loading
  - loading skeleton

**D. Competitor detail**
- Header (store card, large), **timeline of events**, **catalog stats** (products, % on sale, sold out, avg price, launches in the last 30 days), and **watched pages** (homepage, sale page, policies, each with a status).
- States:
  - active
  - quiet
  - catalog unavailable (fallback mode)
  - page blocked by robots.txt ("this store asks bots not to read its policy pages, so we respect that")
  - pause / remove competitor

**E. Alert settings**
- Email instant alerts on/off, **Slack** (connect incoming webhook / connected / error), per-event-type toggles, and a daily alert cap note ("max 5 instant alerts a day, and we bundle the rest").
- States:
  - Free plan (instant alerts locked, upgrade prompt)
  - Starter (email only; Slack locked)
  - Pro (all)

**F. Plan and billing page**
- Free (1 competitor, weekly briefing, daily checks) · **Starter $29/mo** (3 competitors, instant alerts, checks every 6h) · **Pro $79/mo** (10 competitors, Slack, checks every 2h, own-store matching). Annual = 2 months free.
- **Beta state:** billing is disabled, plans are visible, and the user is flagged a **Founding member** (up to 20% off for life when billing opens).

**G. Emails** (email-safe: tables and inline styles, light + dark, desktop + mobile)
1. **Weekly briefing** (Monday):
   1. **Top 3 moves this week**
   2. Per competitor: launches, pricing/promos, stock, positioning/policy
   3. **What this means for you**
   4. **One suggested move for the week**
   5. Footer value counter + unsubscribe
2. **Instant alert:** short. What happened, when, a link, and one suggested action. Also a **bundled** variant with several high events from one competitor.

## 6. Sample content (fictional brands only; no real brand names)

- **User's store:** *Glowfield*, clean skincare, `glowfield.com`
- **Competitors:**
  - *Dewlane* (skincare, Shopify, 214 products)
  - *Peak Tonic* (supplements, Shopify, 88 products)
  - *Northwind Knits* (apparel, Shopify, 1,240 products)
  - *Hearth & Pine* (home, not Shopify)
- **Example events:**
  - **High:** "Dewlane started a sitewide 25% off sale (code GLOW25). 71% of products are discounted, avg 24% off." Suggested move: "Consider a counter-offer to your email list before the weekend."
  - **High:** "Dewlane launched *Barrier Repair Night Cream* at $48. It's close to your *Overnight Recovery Balm* ($52)."
  - **High:** "Peak Tonic's best-seller *Daily Greens 30-serving* sold out in all sizes."
  - **Normal:** "Northwind Knits cut *Merino Crew* from $98 to $89 (−9%)."
  - **Normal:** "Dewlane raised its free-shipping threshold from $50 to $65."
  - **Normal:** "Peak Tonic restocked *Magnesium Sleep Gummies*."
  - **Normal:** "Hearth & Pine's homepage now leads with 'Made in Vermont' instead of price."
- **Counter:** "Competitor moves caught this month: 14."
