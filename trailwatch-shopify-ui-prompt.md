# Trailwatch: Shopify-style UI for the web app (follow-up prompt for Claude Code)

Context: we've completed phases 1–7 of `PIVOT_PLAN.md`. The backend works. Now we give the **existing Trailwatch web app** a UI in the style of the **Shopify admin (Polaris design language)**, so it feels familiar to Shopify merchants.

**This is NOT a Shopify app.** No Shopify CLI, no embedding in the Shopify admin, no Shopify auth, OAuth, scopes, webhooks or Shopify billing. Trailwatch stays a standalone web app with its own login, running on its own domain. We are only adopting Shopify's look and UI patterns.

**We design first, then develop.** You write a UX spec and a design brief; I create the visual designs in **Claude Design** and bring them back; then you build. Follow the steps in order and stop wherever it says STOP.

---

## Step 0: Save progress

- Run `git status`. If there are uncommitted changes, ask me before continuing.
- Commit finished phase-7 work and tag it: `git tag pivot-phase-7`, then push the tag.
- Never modify or delete `archive/founder-edition`, `v1-founder-edition` or `pivot-phase-7`. Never force-push.
- Continue on `main` with `pivot:` commit messages. Push only after I approve each step.

## Step 1: Decide how to get the Shopify look (quick technical test, no UI work yet)

Test these options in a throwaway branch or sandbox page and report back. If the Shopify Dev MCP is available, use it to look up current Polaris docs; don't rely on memory.

1. **Polaris web components** (Shopify's current official components, loaded from Shopify's CDN). Check: do they render and work correctly on a **standalone page outside the Shopify admin**, without App Bridge or a Shopify API key? Are there usage terms that limit them to Shopify apps?
2. **Polaris React** (`@shopify/polaris`): it's deprecated and archived. Check whether it still installs and works with our stack, and note the risk of no future updates.
3. **Our own components styled like Polaris:** build a small set of components (page layout, card, button, badge, index table, banner, text field, empty state) with Polaris-like tokens: colors, type scale, spacing, radii. Check whether Shopify publishes a design-tokens package we can use, and its license.

For each: does it work standalone, license/terms, effort, long-term risk, and fit with our current frontend stack. **Recommend one.** Unless option 1 clearly works standalone and is allowed, my default preference is option 3.

Rules for all options:
- Shopify **look and patterns**, not Shopify **branding**: no Shopify logo, name or wording that could suggest Trailwatch is made by or part of Shopify. Trailwatch's own name and logo stay.
- **STOP.** Show me the findings and your recommendation, and wait for my choice.

## Step 2: UX spec (no app code)

Write `UX_SPEC.md`. Base it on real data: pull real snapshots and events from our database (or run the crawler on 2–3 real Shopify stores) so the spec reflects real product names, event counts and edge cases.

Include:

1. **Navigation:** left sidebar and top bar in the Shopify-admin style; list the menu items.
2. **User flow:** sign up → add your own store → add competitors → first report → daily use.
3. **Each screen**, with: purpose, content top to bottom, actions, which components, the backend endpoint(s) it uses, and its **empty, loading and error states**:
   - **Sign up / log in**
   - **Onboarding:** add your store domain, add competitors by domain (with the marketplace-denylist message), "building your first report" progress state
   - **First report:** per competitor: recent launches, on sale now, sold out
   - **Home:** "moves caught this month" counter, events feed with severity badges (high / normal / low), filters by competitor and event type, next briefing date
   - **Competitor detail:** event timeline, catalog stats (products, on sale, sold out), watched pages, remove competitor
   - **Settings:** alert channels (email, Slack webhook), per-event-type toggles, briefing day/time, plan and limits (shown as "Free beta, founding member")
4. **In-app copy** written for a busy DTC founder or marketing lead, not a developer.
5. **Emails:** the weekly briefing and instant alert. Email-safe HTML, single column, mobile-first, visually matching the app. Show section order and one example of each, with fictional brand names.
6. **Open questions** for me.

**STOP. Show me the spec and wait for my approval.**

## Step 3: Brief for Claude Design

After I approve the spec, write `CLAUDE_DESIGN_BRIEF.md`: a ready-to-paste prompt I'll use in **Claude Design**. Don't design anything yourself. Include:

1. **Product context:** what Trailwatch does, who the user is, the promise ("instant alerts when a competitor moves, a briefing every Monday").
2. **Visual direction:** follow the Shopify admin / Polaris design language (layout, cards, badges, index tables, banners, buttons, empty states, neutral palette, clean type) so merchants feel at home. Use Trailwatch's own name and logo; no Shopify branding.
3. **The component set** chosen in step 1, so designs map one-to-one to what we can build. Anything outside that set must be called out, not invented.
4. **Every screen and state** from the spec.
5. **Real sample content** from our data with **fictional brand names**, including messy cases: long product names, a competitor with 40 events in a week, a competitor with none.
6. **The two emails** as a separate section.
7. **Deliverables:** one design per screen and state, desktop plus a narrow/mobile width.

**STOP. Tell me the brief is ready.** I'll create the designs in Claude Design and share them back (link, exported files or screenshots).

## Step 4: Check the returned designs

- Map every element in my designs to a component from the chosen set. Write this in `DESIGN_TO_COMPONENTS.md`, one section per screen.
- List anything that can't be built with the chosen set or would need a new component, with the closest alternative. Don't silently change the design.
- **STOP** for my decisions.

## Step 5: Build the UI with mock data

- Build the component set (if option 3) and every screen to match my approved designs, using **mock data** shaped like our real API responses. No backend wiring yet.
- Replace the old UI screens; don't leave two design styles side by side.
- Make all empty, loading and error states reachable for review (e.g. a dev-only toggle).
- **STOP. Tell me how to click through it locally, and wait for feedback.**

## Step 6: Connect to the real backend

- Replace mock data with real API calls. Run the full flow: sign up → add store → add 2–3 real competitors → first report within minutes → events on Home.
- Commit, summarize, **STOP** for approval.

## Step 7: Emails

- Implement the briefing and alert email templates from my approved designs (email-safe HTML, tested at mobile width). Every item links to the right screen in the app.
- **STOP** for approval.

## Out of scope

- Building a Shopify app (no Shopify CLI, embedding, Shopify auth, webhooks or Shopify billing). That may come later as a separate task.
- Landing / marketing pages and the public website.
- Any paid third-party service without asking me.

## Definition of done

- The whole web app uses one consistent Shopify-admin-style design, built from the chosen component set, with Trailwatch's own branding.
- I can sign up, add a competitor by domain, and see a first report within minutes.
- Briefing and alert emails match the app and link into it.
- All backend features from phases 1–7 still work.
