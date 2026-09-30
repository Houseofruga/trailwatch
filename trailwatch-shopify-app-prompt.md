# TrailWatch → Embedded Shopify App UI (follow-up prompt for Claude Code)

Context: we've completed phases 1–7 of `PIVOT_PLAN.md` (store-based competitors, catalog tracking, event model, alerts and briefings, own-store matching, plans, cost guardrails). The backend is the source of truth and stays as it is.

**Change of direction for the UI:** instead of redesigning the standalone web app, the main user interface becomes an **embedded Shopify app** built with **Polaris web components**, running inside the Shopify admin. Polaris is designed for apps that live in the admin, so we're moving the Shopify app forward instead of restyling the web app.

**We design first, then develop.** You write the UX spec and a brief; I create the visual designs in **Claude Design** and bring them back; then you build. Follow the steps in order and stop wherever it says STOP.

---

## Step 0: Save progress

- Run `git status`. If there are uncommitted changes, ask me before continuing.
- Commit any finished phase-7 work, then tag the current state: `git tag pivot-phase-7` and push the tag.
- Never modify or delete `archive/founder-edition`, `v1-founder-edition` or `pivot-phase-7`. Never force-push.
- Continue on `main` with `pivot:` commit messages. Push only after I approve each step.

## Step 1: Set up Shopify tooling

- Check whether the Shopify AI Toolkit / Shopify Dev MCP is available in this session. If not, stop and tell me to run:
  `claude plugin install shopify-ai-toolkit@claude-plugins-official`
- **Always use the Dev MCP** to look up current Shopify docs, Polaris web components, App Bridge APIs and Admin GraphQL schemas. Don't rely on memory for Shopify APIs.
- **Use Polaris web components only** (the `s-` custom elements loaded from Shopify's CDN). **Do not use Polaris React** (`@shopify/polaris`); it's deprecated. Validate every component and property you use with the Dev MCP.
- Follow Shopify's app design guidelines for embedded apps (look them up via the Dev MCP).

## Step 2: UX spec (design phase, no app code)

Write `SHOPIFY_APP_UX_SPEC.md`. Base it on real data: pull a few real snapshots and events from our database (or run the crawler on 2–3 real Shopify stores) so the spec reflects actual product names, event counts and edge cases.

Include:

1. **Navigation:** the app's nav menu items (App Bridge nav) and how screens link to each other.
2. **User flow:** install → onboarding → first report → daily use. Show where the user's own catalog comes from (Admin API on install, replacing manual domain entry for installed shops).
3. **Each screen**, with: purpose, what's on it (top to bottom), which Polaris components, the actions available, the backend endpoint(s) it reads from, and its **empty, loading and error states**. Screens:
   - **Onboarding:** welcome, add competitors by domain (with marketplace-denylist message), "building your first report" progress state
   - **First report:** instant snapshot per competitor: recent launches, on sale now, sold out
   - **Home:** "moves caught this month" counter, recent events feed with severity badges (high / normal / low) and filters by competitor and event type, next briefing date
   - **Competitor detail:** event timeline, catalog stats (products, on sale, sold out), watched pages, remove competitor
   - **Settings:** alert channels (email, Slack webhook), per-event-type toggles, briefing day/time, plan and limits (billing shown as "Free beta, founding member")
4. **In-app copy:** written for a busy DTC founder or marketing lead, not a developer. Short, plain, action-oriented.
5. **Emails (separate from Polaris):** the weekly briefing and the instant alert. Polaris doesn't work in email, so spec email-safe HTML layouts that borrow Polaris's colors and type so they feel like the same product. Show the section order and one example of each, using our real data but fictional brand names.
6. **Open questions** for me.

**STOP. Show me the spec and wait for my approval.**

## Step 2b: Brief for Claude Design

After I approve the spec, write `CLAUDE_DESIGN_BRIEF.md`: a ready-to-paste prompt I'll use in **Claude Design** to create the screens. I'll bring the designs back to you. Don't design anything yourself.

The brief must include:

1. **Product context:** what TrailWatch does, who the user is (busy US DTC founder or marketing lead), and the promise ("instant alerts when a competitor moves, a briefing every Monday").
2. **The hard constraint:** the app runs **inside the Shopify admin** and will be built with **Polaris web components**. Designs must follow Shopify's admin look and Polaris patterns (page layout, cards/sections, badges, tables/index lists, banners, buttons, empty states). No custom visual system, custom fonts or custom color palette. Where a design needs something Polaris doesn't offer, Claude Design should call it out explicitly instead of inventing it.
3. **The Polaris component list** you plan to use for each screen (from the spec), so the designs map one-to-one to buildable components.
4. **Every screen from the spec**, each with its purpose, content top to bottom, actions, and its empty, loading and error states.
5. **Real sample content** taken from our actual data (real event counts, realistic product names and prices), but with **fictional brand names**. Include messy cases: long product names, a competitor with 40 events in a week, a competitor with none.
6. **The two emails** (weekly briefing and instant alert) as a separate section: these are NOT Polaris. Email-safe, single-column, mobile-first, visually matching the admin app (similar neutral palette and clean type).
7. **Deliverables to ask for:** one design per screen and state, desktop plus a narrow width, with components labeled by Polaris name where possible.

**STOP. Tell me the brief is ready.** I'll create the designs in Claude Design and share them with you (link, exported files or screenshots).

## Step 2c: Check the returned designs

When I share the designs:

- Map every element to a validated Polaris web component (check each with the Dev MCP). Write the mapping in `DESIGN_TO_POLARIS.md`, one section per screen.
- List anything that **can't be built with Polaris** or would break Shopify's app design guidelines, and suggest the closest Polaris alternative. Don't silently change the design.
- **STOP** for my decisions on those items.

## Step 3: Scaffold the embedded app

After I approve the design mapping:

- Scaffold with **Shopify CLI** (`shopify app init`), using the current recommended template (check via Dev MCP). Put it in `apps/shopify/` or a similar clearly separated folder.
- **Keep it a thin front end.** All business logic stays in the existing backend; the Shopify app calls it through authenticated API endpoints. Add backend endpoints only where the spec needs them.
- **Auth:** use Shopify session tokens. Map each shop to a TrailWatch account (create the account on first install). Document the mapping.
- **Scopes:** request the minimum. `read_products` for the merchant's own catalog; nothing else unless I approve.
- **Webhooks:** app uninstalled, plus Shopify's mandatory privacy/compliance webhooks. On uninstall, stop crawling for that account (keep data per our retention rules; ask me what those should be).
- Test on a **Shopify development store**. Tell me which store and how to open the app.

## Step 4: Build screens from the approved designs, with mock data

- Build every screen to match the approved Claude Design designs, using the Polaris mapping from step 2c and **mock data** shaped like our real API responses. No backend wiring yet.
- Include all empty, loading and error states, and make sure they're reachable for review (e.g. a dev-only toggle).
- **STOP. Tell me how to click through it in the dev store, and wait for my feedback.** I'll compare it with the designs and send fixes.

## Step 5: Connect to the real backend

- Replace mock data with real API calls. Run the full flow on the dev store: install → add 2–3 real competitors → first report within minutes → events appear on Home.
- Commit, summarize, **STOP** for approval.

## Step 6: Emails

- Implement the briefing and alert email templates from the approved Claude Design designs (email-safe HTML, tested at mobile width).
- Every item links into the relevant screen of the embedded app.
- **STOP** for approval.

## Billing and distribution (don't build yet, just prepare)

- **Billing:** the app stays **free** for now (our company registration is pending). Structure plans so Shopify's billing API can be added later behind a disabled feature flag. Keep the "founding member" flag on accounts.
- **Distribution:** research, via the Dev MCP and Shopify docs, the current options for letting a small group of beta merchants install the app before a public App Store listing. Report the options and trade-offs in the spec's open questions. Don't choose one without me.

## Out of scope

- Landing / marketing pages and the public website.
- Redesigning the standalone web app. Keep it working as-is (it remains the backend and account system); don't restyle it.
- Any paid third-party service without asking me.

## Definition of done

- I can install the app on a dev store, add a competitor by domain, and see a first report inside the Shopify admin within minutes.
- Every screen uses validated Polaris web components, with no Polaris React anywhere.
- The merchant's own catalog is loaded through the Admin API on install.
- Briefing and alert emails match the app's look and link into it.
- The standalone web app and all backend features from phases 1–7 still work.
