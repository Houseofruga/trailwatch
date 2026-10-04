# DESIGN_SYSTEM.md — Trailwatch in-app UI

This file documents the system **as it exists in code today** (pivot Phase 0). It adds no new values. Anything marked *(pending design)* is a gap that gets filled from the Claude Design output (`DESIGN_BRIEF_FOR_CLAUDE_DESIGN.md`), not invented in code.

Sources of truth, in order:
1. `src/styles/tokens.css`: the tokens, loaded once in `src/app/layout.tsx`.
2. The `.dc.html` artboards: `trailwatch v2/`, `trailwatch v3/`, `IA redesign, add plan, competitor/`, `dashboard multi-change/`.
3. Shared components in `src/components/`.

**Rule:** UI is built 1:1 from artboards. Use tokens, never raw hex, in new CSS. If a value you need isn't a token, stop: it's a design gap, not a code decision.

---

## 1. Principles (from the v2 design language)

- **Square.** Zero border-radius everywhere. The global reset in `tokens.css` sets `button { border-radius: 0 }`.
- **Calm, editorial, low-noise.** Cream/ink neutrals and thin 1px borders, with generous whitespace and **one** lime accent per screen for the primary action.
- **Two fonts.** DM Sans handles all UI text. Geist Mono is for URLs, domains, numbers and code-like labels. There is no serif.
- **Blue is only for plain hyperlinks.** It is never the brand accent.
- **Mobile-first.** Dialogs become bottom sheets on small screens. The sidebar becomes a top bar + bottom tab bar.

## 2. Color tokens (`src/styles/tokens.css`)

| Group | Token | Value | Use |
|---|---|---|---|
| Surfaces | `--bg` | `#f5f5f5` | page background |
| | `--surface` | `#ffffff` | cards, dialogs, inputs |
| | `--surface-alt` | `#fcfbf9` | dialog footers, hover rows |
| | `--surface-sunken` | `#efede8` | avatar boxes, disabled fields, skeletons |
| Borders | `--border` | `#e6e2da` | card / dialog border |
| | `--border-soft` | `#efece6` | internal dividers |
| | `--border-softer` | `#f3f1ec` | faint dividers |
| | `--border-input` | `#dcd8d0` | inputs, secondary buttons |
| | `--border-input-hover` | `#b9b4aa` | input hover |
| | `--rule` | `#edeae4` | horizontal rules |
| Ink (dark → light) | `--ink` | `#1a1a17` | primary text, dark buttons |
| | `--ink-2` | `#4a4740` | strong secondary text |
| | `--ink-3` | `#6e6b63` | body secondary |
| | `--ink-4` | `#8b877e` | meta, labels, sub-copy |
| | `--ink-5` | `#948f86` | icons, close buttons |
| | `--ink-faint` | `#a8a49a` | disabled text |
| | `--ink-hint` | `#ddd9d1` | disabled icons |
| Accent (lime) | `--accent` | `#9ff50a` | primary buttons, badges, meters, upgrade chrome |
| | `--accent-hover` | `#8ad800` | primary hover |
| | `--accent-ink` | `#557a00` | accent-colored text/icons on light surfaces |
| | `--accent-wash` | `#eefbc7` | accent tint background, focus halo |
| | `--accent-line` | `#d6f59b` | accent borders |
| | `--accent-focus` | `#d6f59b` | input focus outline |
| | `--accent-mark-border` | `#dcf5a0` | highlighted marks |
| Links | `--link` / `--link-hover` | `#2563eb` / `#1d4ed8` | hyperlinks only |
| Semantic | `--green-wash` / `--green-ink` | `#eaf3ea` / `#3a7d4f` | positive stat tiles |
| | `--amber-wash` / `--amber-ink` | `#fbf1df` / `#b4791e` | caution stat tiles |
| | `--warn-wash` / `--warn-border` | `#f6fbea` / `#dee8c9` | soft notices |
| | `--danger` / `--danger-wash` | `#dc2626` / `#fbeeec` | errors, destructive actions |
| Misc | `--selection` | `#dce7e0` | text selection |

**De-facto values that aren't tokenized yet.** These raw hex values appear in CSS Modules and came from the artboards. Reuse the same values for the same meaning; they get tokenized when a screen needs them:

| Meaning | Values |
|---|---|
| Field error | border `#e0a9a2`, background `#fdf4f2` |
| Amber note (e.g. "same site" warning) | text `#8b6a2b`/`#8a6d2b`, background `#fbf4e4`/`#f6efdd`, border `#ecdcb8`/`#e7d9b8` |
| Pale-lime panels (plan-limit footers, selected menu items) | `#f7fce8`, `#f6faee`; border `#d9efa0` |
| Avatar initials text | `#5d5a53` |

**Dark mode:** the app has **none**. Only the emails do (`src/features/digest/email.ts`, `prefers-color-scheme`). App dark mode is *(pending design)*.

**Severity colors** (high / normal / low): *(pending design)*. Until the artboards arrive, don't reuse `--danger` for "high", because red reads as an error and not as an opportunity.

## 3. Typography

- **Families:** `--font-dm-sans` (weights 400/500/600/700) and `--font-geist-mono` (400), both via `next/font/google` in `src/app/layout.tsx`. The body defaults to DM Sans.
- **Scale in use.** Not tokenized; these are the recurring sizes from the CSS Modules:

| Role | Size | Weight / notes |
|---|---|---|
| Page title | 26–28px | 600, `letter-spacing: -0.015em` |
| Section / empty-state title | 20–22px | 600, `-0.01em` |
| Dialog title | 16–17px | 600, `-0.01em` |
| Card title, competitor name | 15–16px | 600 |
| Body / inputs | 14px | 400 (inputs go to 16px under 860px to stop iOS zoom) |
| Buttons | 13.5px | 600 primary, 400–500 secondary |
| Secondary body, row copy | 13px | 400 |
| Notes, errors, helper text | 12.5px | 400 |
| Meta, sub-copy | 12px | `--ink-4` |
| Small meta, badges | 11–11.5px | |
| Eyebrow / field label | 10.5px | 600, UPPERCASE, `letter-spacing: 0.08em`, `--ink-4` |
| Mono (URLs, domains, numbers) | 12–14px | Geist Mono 400 |

## 4. Spacing, radii, elevation, breakpoints

- **Spacing** is not tokenized. The common steps are **6 / 8 / 9–10 / 12 / 14 / 16 / 18 / 20 / 22 / 24px**. Dialog padding is `20–22px`, the takeover is `26px`, and card rows are `12–16px`.
- **Radii:** `0`, always.
- **Elevation** (overlays only; cards are flat with a 1px border):

| Level | Shadow |
|---|---|
| Menu | `0 10px 28px rgba(26,26,23,.12)` |
| Dialog | `0 20px 50px rgba(26,26,23,.14)` |
| Takeover | `0 24px 60px rgba(26,26,23,.16)` |

  The focus halo is `0 0 0 4px var(--accent-wash)`.
- **Scrim:** `rgba(26,26,23,.4)`.
- **Breakpoints:**
  - `860px`: sidebar → top bar + bottom tab bar; 16px inputs.
  - `640px`: takeover/grid reflow.
  - `560px`: dialogs → bottom sheets, stacked actions.
  - `prefers-reduced-motion` is honored for motion effects.

## 5. Components (`src/components/`)

| Component | What / variants |
|---|---|
| `Button`, `ButtonLink` | `primary` (lime, the one main action per screen), `secondary` (outlined), `dark` (ink, used where lime would compete). `full` = 100% width. 13.5px, padding `10px 16px`. |
| `UpgradeCta` | The shared upgrade nudge: black with lime text and a bolt prefix, plus cursor "pixel dust" (`CursorDust`). The Paddle checkout button reuses its stylesheet. |
| `ConfirmDialog` | Title / body / CTA confirm. Bottom sheet under 560px. |
| `Skeleton` | A shimmering bar. Compose these to mirror the incoming layout (no blank navigations). |
| `ErrorState`, `HomeLink` | Shared error / 404 presentation. Tokens only. |
| `FlashToast` (+ `Toast.module.css`) | Toast driven by `?flash=` after server-action redirects. |
| `CompetitorAvatar` | Favicon via `/api/favicon` (SSRF-safe proxy), falling back to 2-letter initials. It renders inside the caller's sunken avatar box. |
| `Sidebar` | Desktop nav + plan usage box + account. Under 860px it becomes a top bar + bottom tab bar + account sheet. |
| `BackLink`, `ContactLink` | Navigation helpers. |
| `ChangeDetailModal` | Intercepting-route overlay for a change's detail. |
| `PageActionsMenu` | Per-page ⋮ menu (check now / edit URL / pause / delete). Page-centric, so the pivot deprecates its entry points. |
| `AddPageDialog`, `EditPageDialog`, `PageTypeSelect` | Page-picking dialogs. **Deprecated by the pivot** (page picking is removed). |
| `CompareTable`, `SiteHeader`, `SiteFooter`, `JsonLd`, `breadcrumbJsonLd` | Marketing site only. Out of scope for the pivot, but must not break. |
| `icons.tsx` | Inline SVG icon set. |

**Recurring patterns** (built per screen in CSS Modules, not shared components yet):
- Dialog shell: header / body / `--surface-alt` footer.
- Field row with inline ✓/⚠ and an error note.
- Uppercase eyebrow label.
- Pill toggles: selected = ink background with white text.
- Pale-lime plan-limit footer with an ink/lime badge.
- Stat tiles.
- Dotted "example" demo framing.

## 6. New components the pivot needs *(pending design)*

Build these from the artboards, add them to `src/components/`, and document them here:
- Event card with severity badge (high / normal / low)
- Competitor store card (favicon, domain, platform badge, last checked)
- Alert list
- Briefing preview
- Plan/pricing table (Free / Starter / Pro)
- Value counter ("moves caught this month")
- Alert-settings toggles
- First-report sections (launches / on sale / sold out)

## 7. Emails

`src/features/digest/email.ts` is the email-safe renderer: table layout, inline styles, dark-mode media query and the real logo lockup (`public/email-logo-{dark,light}.png`). `emails/auth-magic-link.html` is the auth template. New briefing and instant-alert emails reuse this shell.
