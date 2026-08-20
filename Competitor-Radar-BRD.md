# Business Requirements Document — Competitor Radar

| | |
|---|---|
| **Product** | Competitor Radar (working name) |
| **Document** | Business Requirements Document (BRD) |
| **Version** | 0.1 — Draft |
| **Status** | For review, pre-build |
| **Owner** | *(you)* |
| **Last updated** | *(fill in)* |

---

## 1. Executive Summary

Competitor Radar is a bootstrapped, solo-operated SaaS that monitors a user's chosen competitor web pages (pricing, homepage, blog, changelog) and delivers a short, plain-English digest of what actually changed. It targets indie founders and small SaaS/marketing teams who want to keep tabs on competitors without manually checking pages or wrestling with noisy, expensive enterprise tools.

The product wins on a single wedge: **narrow audience focus plus AI-summarized, low-noise alerts** — turning raw page diffs into "here's what changed and why it matters." This document defines the business goals, scope, users, requirements, and success criteria for the MVP and the phases that follow.

---

## 2. Problem Statement

Small teams and solo founders need to know when competitors change something, but today's options force a bad trade-off:

- **Free / self-hosted tools** (e.g. open-source change detectors) are developer-only, fiddly to set up, and produce raw diffs with no interpretation.
- **General cloud monitors** are frequently criticized for **false positives** (alerts that flag "important change" when nothing meaningful changed) and for **pricing that climbs quickly** once you monitor more than a few pages.

There is no cheap, low-setup, **summary-first** option built specifically for non-technical small teams who just want a readable weekly digest of competitor moves.

---

## 3. Business Objectives

| # | Objective | Target |
|---|---|---|
| O-1 | Ship a working MVP solo | ~2 weeks |
| O-2 | First paying customer | Within ~30 days of launch |
| O-3 | Reach $1K MRR (~40 customers @ ~$25) | ~Month 6 |
| O-4 | Reach $5K MRR (~200 customers) | ~Month 12–18 |
| O-5 | Keep the business solo-operable and high-margin | Infra < $50/mo; ~80%+ margin |
| O-6 | Acquire customers with $0 ad spend | CAC < $50, organic only |

*Targets reflect realistic solo-SaaS base rates: most products that reach revenue cross $1K MRR around month 6–7, and the median profitable micro-SaaS lands near $4K MRR. Roughly 40–70% never clear $1K — almost always due to stopping/marketing, not market size.*

---

## 4. Target Users & Stakeholders

**Primary persona — the Indie Founder**
A solo or small-team SaaS builder who has 3–10 direct competitors and currently checks their sites manually (or not at all). Technical enough to sign up self-serve; time-poor; price-sensitive but pays for tools that clearly save time. Reachable in public communities (r/SaaS, Indie Hackers, X).

**Secondary persona — the Small Marketing Team / Agency**
1–5 person marketing function tracking competitor pricing, positioning, and content for a handful of clients or one brand. Slightly higher willingness to pay; values a shareable summary.

**Buyer = user.** No procurement, no multi-stakeholder sale. This keeps the sales motion self-serve.

---

## 5. Scope

### 5.1 In Scope (MVP)
- Self-serve signup and login
- Add a competitor by pasting one or more page URLs
- Automated **daily** check of each page
- Text-based change detection on the page's main content
- **AI-generated plain-English summary** of each detected change
- **Weekly email digest** per user ("what changed at your competitors")
- Simple dashboard listing competitors and recent changes
- Freemium billing (free tier + one paid tier) via a payment provider

### 5.2 Out of Scope (MVP — deferred to later phases)
- Headless-browser / JavaScript rendering of pages
- Screenshot / visual (pixel) diffing
- Slack, Discord, Teams, or webhook alerts
- Visual CSS/element selector UI
- Instant / hourly alerting
- Team seats / multi-user accounts
- Public API
- Native mobile app

*Rationale: the MVP must be the smallest thing that delivers the core value (a readable digest of real changes). Everything above is a Phase 2+ upsell to be built only after customers ask.*

---

## 6. Business Requirements (Functional)

| ID | Requirement | Priority |
|---|---|---|
| BR-1 | A user can create an account and manage it without manual onboarding | Must |
| BR-2 | A user can add, edit, and remove competitor page URLs | Must |
| BR-3 | The system checks each monitored page on a daily schedule | Must |
| BR-4 | The system detects changes in a page's main text content | Must |
| BR-5 | The system filters out trivial/noise changes so alerts reflect meaningful updates | Must (core differentiator) |
| BR-6 | Each meaningful change is summarized in plain English | Must (core differentiator) |
| BR-7 | The system sends a weekly digest email of changes per user | Must |
| BR-8 | A dashboard shows each competitor and its recent changes | Must |
| BR-9 | A free tier exists with clear usage limits (e.g. 1 competitor, weekly) | Must |
| BR-10 | A paid subscription unlocks higher limits (e.g. up to 10 competitors, daily) | Must |
| BR-11 | A user can upgrade, downgrade, and cancel self-serve | Must |
| BR-12 | A user can pause or delete a monitor | Should |
| BR-13 | The digest links back to the changed page and shows before/after context | Should |

---

## 7. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | **Low false-positive rate** — this is the product's reason to exist; noisy alerts break trust and cause churn |
| NFR-2 | **Reliability** — scheduled checks must run consistently; missed checks erode value |
| NFR-3 | **Privacy/legality** — only monitor publicly accessible pages; no login-gated or personal data |
| NFR-4 | **Cost efficiency** — total running cost must stay under ~$50/mo at MVP scale |
| NFR-5 | **Self-serve** — no manual steps required for a user to get value; zero-touch onboarding |
| NFR-6 | **Solo-maintainable** — architecture simple enough for one person to run and debug |

---

## 8. Pricing & Business Model

Freemium, product-led, subscription (USD, US-market-first).

| Plan | Price | Limits |
|---|---|---|
| Free | $0 | 1 competitor, weekly checks, email digest |
| Paid | ~$19–29/mo | Up to ~10 competitors, daily checks, more pages each |

**Model notes:**
- Recurring monitoring = recurring value, which supports subscription retention.
- Price in USD and optimize for US customers (materially higher revenue per user), while operating from a low-cost base — a structural margin advantage.
- Free tier doubles as a top-of-funnel and a shareable/linkable acquisition asset.

---

## 9. Success Metrics (KPIs)

| Metric | Definition | Target |
|---|---|---|
| Activation | % of signups that add ≥1 competitor and receive their first digest | > 40% |
| Free → Paid conversion | % of active free users who upgrade | 2–5% |
| MRR | Monthly recurring revenue | $1K by M6, $5K by M12–18 |
| Monthly churn | % of paying customers lost per month | < 5% |
| CAC | Cost to acquire a customer (organic) | < $50 |

---

## 10. Go-to-Market Requirements

Distribution must be **free and organic** (constraint C-3 below):
- SEO landing page(s) targeting search intent (e.g. "monitor competitor website changes").
- Answer existing "how do you keep an eye on competitors?" threads on r/SaaS and Indie Hackers **with the tool**.
- Build-in-public launch and ongoing updates on X.
- Free tier as a shareable acquisition surface.

The MVP is not "done" until it can be shown publicly — posting is the validation step.

---

## 11. Assumptions

- The builder can develop and ship the MVP solo.
- Plain HTML fetching (no JS rendering) is sufficient to monitor a meaningful share of target pages at MVP.
- Target users congregate in reachable public communities and via search.
- The primary audience will pay roughly $19–29/mo for a low-noise, summarized digest.

---

## 12. Constraints

| ID | Constraint |
|---|---|
| C-1 | Solo founder, no external funding |
| C-2 | Running costs capped at ~$50/mo pre-revenue |
| C-3 | No paid advertising — organic acquisition only |
| C-4 | MVP timeline ~2 weeks |
| C-5 | Monitor only public, non-authenticated pages |

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Commodity competition (free/open-source detectors) | Med | Win on niche focus, zero setup, and summary-first UX rather than raw diffs |
| False positives destroy trust | High | Treat low-noise detection (NFR-1) as core; use change thresholds + AI summary to suppress trivia |
| JS-rendered pages missed at MVP | Med | Target server-rendered pages first; add rendering in a later phase |
| Founder stops shipping/marketing before $1K MRR | High | Milestone checks (Section 3); public build-in-public accountability; keep scope tiny to reach launch fast |
| Indie audience too price-sensitive | Med | Validate price with first users; be ready to lean toward the small-marketing-team segment if needed |
| Legal/ToS issues from scraping | Low–Med | Public pages only; respect robots/rate limits; no personal data |

---

## 14. Roadmap / Phasing

**Phase 1 — MVP (Weeks 1–2):** core engine (add URL → daily check → text diff → noise filter → AI summary → weekly digest), dashboard, freemium billing.

**Phase 2 — After first paying users:** daily/instant alerts, Slack & webhook channels, before/after context in-app, better dedupe/noise controls.

**Phase 3 — On demand:** JS rendering, visual/screenshot diff, team seats, deeper niche positioning (e.g. pricing-page or changelog focus), API.

---

## 15. Open Questions

- Final launch positioning/niche wording (broad "competitor radar" vs. a sharper single use case).
- Default check frequency and exact free-tier limits.
- Which alert channel to add first in Phase 2 (Slack vs. instant email).
- Digest cadence options (weekly only, or user-selectable).

---

*This is a living document. Revisit Sections 3, 8, and 9 after the first 10 paying customers — real usage will correct the assumptions faster than any pre-build analysis.*
