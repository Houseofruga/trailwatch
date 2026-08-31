# DISTRIBUTION.md — TrailWatch off-site distribution & backlink playbook

The execution side of `SEO.md`: on-page work is done (foundation + free tool +
three compare pages), but nothing links to those assets yet and the subdomain
isn't verified in Search Console. This is the plan to turn the assets into
backlinks, traffic, and signups. **Most of this is owner-action** — Claude can
draft copy and track it, but you submit/post from your own accounts.

_Created 2026-08-31. Owner executes; check items off as you go._

## Principle

Pitch the **assets**, not the homepage. A free tool or an honest comparison page
is something people will link to, upvote, and share; "check out my SaaS" is not.
Every asset already funnels to a free signup, and every CTA is attribution-tagged
(`?src=…`) so you can see what converts.

## The assets you're distributing

| Asset | URL | Best pitched to |
|---|---|---|
| AI Competitor Teardown (free tool) | `/tools/competitor-teardown` | Indie/founder communities, Product Hunt, tool directories |
| Sitemap Finder / Robots.txt Tester / Last-Updated Checker | `/tools/*` | SEO communities, tool directories |
| Visualping alternative | `/compare/visualping-alternative` | AlternativeTo, SaaSHub, "alternative" queries |
| Crayon alternative | `/compare/crayon-alternative` | AlternativeTo, SaaSHub |
| Kompyte alternative | `/compare/kompyte-alternative` | AlternativeTo, SaaSHub |
| Homepage | `/` | Directories, launch posts |

CTA attribution already wired: `?src=teardown`, `?src=compare-visualping`,
`?src=compare-crayon`, `?src=compare-kompyte`. For **external** links, add UTMs
too (e.g. `?utm_source=producthunt&utm_medium=launch`) so referrers show cleanly.

## Cost — the whole plan runs at $0

Every item below is tagged:

- **[Free]** — no cost to list/post. Do all of these.
- **[Freemium]** — free tier works; a paid option only *accelerates* (skip the
  paid part unless there's a clear reason).
- **[Paid — skip]** — gates the basic listing behind a fee. Low-authority,
  low-traffic; not worth it at this stage.

Rule of thumb: **if a directory charges just to be listed, skip it.** The
compounding wins (AlternativeTo, Product Hunt, real community traction) are all
free — they cost time, not money. Directory pricing shifts often, so confirm each
one's current terms when you get there.

## Pre-flight — do BEFORE driving real traffic

- [ ] **Verify the subdomain in Google Search Console + Bing Webmaster** and
      submit `/sitemap.xml`. ~20 min, owner-only (needs account access). Without
      it you're flying blind on impressions/queries. (Open item in `SEO.md`.)
- [ ] **Clear the pre-launch blockers in `BACKLOG.md`** before a launch that sends
      real signups: isolated Supabase **test/staging env** and a real **§9
      end-to-end run** (signup → limits → digest send → Paddle sandbox
      checkout/cancel). A Product Hunt spike hitting a single-project setup is
      risk you don't want. Directory listings and community posts that trickle
      traffic are lower-risk and can start earlier.

## Phase 1 — Evergreen listings (do once, low effort, real backlinks)

These are durable backlinks + steady discovery. Start here — no timing needed.

- [ ] **[Free] AlternativeTo** — list TrailWatch as an alternative to
      **Visualping, Crayon, and Kompyte**. Directly reinforces the three compare
      pages; high relevance. (Highest priority — do first.)
- [ ] **[Free] SaaSHub** — same "alternative to" angle + a product listing (paid
      promotion exists; skip it).
- [ ] **[Free] StackShare** — product/tool listing.
- [ ] **[Free] G2 / Capterra** — create/claim the basic listing (authoritative +
      a source of "alternative" traffic). Free to list; they only charge vendors
      for premium profiles/ads you don't need.
- [ ] **[Free] Indie Hackers Products** — free product listing.
- [ ] **[Freemium] Landing galleries** (Land-book, SaaS landing galleries) — some
      accept free submissions, some charge for featured; the landing is polished
      enough to submit to the free ones.
- [ ] **[Freemium] AI-tool directories** (Toolify, There's An AI For That, etc.)
      — the teardown tool qualifies; most list free, some charge to be *featured*
      (skip featured). Only worth the free slots.
- [ ] **[Free] Free-tool directories** for the `/tools/*` pages — "free SEO tools"
      / "free tools" roundups that accept submissions.
- [ ] **[Paid — skip] Generic "submit your startup" directories** that charge a
      one-time listing fee ($10–$50+). Low-authority; not worth it now.

## Phase 2 — Launch moments (concentrated spikes)

Do these once the pre-flight blockers are clear (real signups will arrive).

- [ ] **[Freemium] BetaList** — pre/early-launch audience; submit ahead of
      Product Hunt. Free submission works but the queue is slow; they charge to
      *expedite* (optional — skip unless you want to time it to PH).
- [ ] **[Free] Product Hunt** — the big one, and free to launch. Lead with the
      **AI Competitor Teardown** (interactive, demoable) as the hook, product
      second. Prep: a maker comment, the founder story (indie founder — matches
      the landing), a GIF of the tool. Pick a Tue–Thu. Line up a few genuine early
      supporters beforehand. (Their paid "Ship" product is separate and
      unnecessary.)
- [ ] **[Free] Hacker News — Show HN** — only if there's a genuinely interesting
      angle (the low-noise filter, or the teardown). HN is allergic to marketing;
      post plainly, be present in comments.
- [ ] **[Freemium] Peerlist / DevHunt / Uneed launch slots** — secondary launch
      surfaces; free to launch, optional paid "featured" slots (skip).

## Phase 3 — Community distribution (pitch the tool, be a human)

All **[Free]**. Give value first; the tool is the value. One-line "I built X"
drops get removed.

- [ ] **Indie Hackers** — a post on the build/positioning (low-noise angle,
      founder-first), linking the teardown tool as the useful artifact.
- [ ] **Reddit** (read each sub's self-promo rules first): r/SaaS,
      r/Entrepreneur, r/startups, r/SideProject, r/EntrepreneurRideAlong,
      r/marketing, r/CompetitiveIntelligence, r/juststart. Lead with the free tool
      or a genuine "how I track competitors" post, not a pitch.
- [ ] **Founder communities** you're in (Slack/Discord/WIP/Twitter-X build-in-
      public). Share the teardown tool as a thing people can try in 10 seconds.
- [ ] **X / LinkedIn build-in-public** — post a teardown of a well-known product
      as a demo; the output *is* the ad.

## Phase 4 — Ongoing outreach & link-building

- [ ] **[Free] "Alternative to" link opportunities** — find existing listicles
      ("best Visualping alternatives", "competitor monitoring tools") and ask to
      be added; your compare pages are the honest supporting content.
- [ ] **[Free] Guest posts / mentions** on indie/SaaS/PMM blogs and newsletters —
      pitch the founder-first competitor-tracking angle, link a tool.
- [ ] **[Freemium] Featured / Connectively / Terkel** (journalist-request
      services; HARO itself shut down) — free tiers exist and push paid plans; the
      free tier is fine to try for high-authority backlinks.
- [ ] **[Free] Podcast/newsletter swaps** with other bootstrapped founders.

## Backlink tactics specific to what's built

- The **free tools are the link bait** — most people won't link "a SaaS", but they
  will link a genuinely useful free tool. Lead outreach with `/tools/*`.
- The **compare pages** are your bottom-funnel + AlternativeTo/SaaSHub anchors.
- Consider adding **1–2 more free tools** later (SEO.md lane) only if these get
  traction — more assets = more to pitch.

## Measurement

- **Search Console** — impressions → clicks per query/page; the real scoreboard.
- **`?src=` attribution** — already on every asset CTA; watch which asset drives
  signups (and which convert), build more of what works, drop what doesn't.
- **UTMs** on external links — clean referrer data per channel/launch.
- Rough cadence: check Search Console weekly for the first month, then monthly.

## Honest caveats

- SEO/backlinks are a **months-long** game — expect little movement for weeks.
- Directory backlinks are mostly low-authority; the compounding wins are community
  traction + a good launch + genuine editorial mentions.
- Don't spam. One removed self-promo post costs more than the link was worth.
- Volume isn't the goal — a handful of relevant, real links + steady community
  presence beats 50 directory drops.

---

# Step-by-step runbook (start here)

The phases above are the catalog; this is the ordered, do-this-then-that plan,
tuned to where TrailWatch actually is.

**Two facts set the order:**
- The app is **deployed but not launch-tested** — the pre-launch blockers below
  aren't done. So we do zero-risk work now (indexing, accounts, copy) and **gate
  the Product Hunt push behind launch-readiness**. Don't drive strangers at an
  untested signup/billing flow.
- **Brand email for every submission: `houseofrugaofficial@gmail.com`** (receives
  verification mail reliably). You have a Google account; you do **not** yet have
  Product Hunt / Reddit / X accounts, so those get created and aged first.

Each step is tagged **(you)** / **(Claude)** / **(both)**.

## Stage 0 — This week · zero signup risk · do in parallel

**0.1 Google Search Console + Bing (you; ~20 min).**
Sign in at search.google.com/search-console → add a **URL-prefix** property
`https://trailwatch.houseofruga.com` → verify with **"HTML tag"**. The site
already ships a Google verification token (`src/app/layout.tsx` →
`verification.google`); if your property is under the same Google account that
made that token, it verifies instantly. If Search Console shows a *different*
token, paste it to Claude to swap in and redeploy, then click Verify. Then
**Sitemaps → submit `sitemap.xml`**. Repeat on **Bing Webmaster Tools** via
"Import from Google Search Console." Zero risk; indexing takes weeks, so start now.

**0.2 Create + age the brand accounts (you).** All under the gmail:
- **Product Hunt** — sign up, complete the profile (logo avatar, bio, link), then
  follow makers / upvote for a couple of weeks (PH de-ranks brand-new accounts at
  launch).
- **Reddit** — create it, but **don't self-promote yet**; spend 2–3 weeks
  commenting genuinely in r/SaaS, r/Entrepreneur to earn karma.
- **X/Twitter** — `@trailwatch` (or personal) for build-in-public.
- **Indie Hackers** — account + a draft Products listing.

**0.3 De-risk the product yourself (you; free; critical).** On production: sign up
with a throwaway email → add 2 competitors → hit the free limit → open the
dashboard → receive a digest if you can trigger one. Note anything broken. Protects
your one-shot first impression.

**0.4 Prep all copy (Claude drafts, you approve).** PH kit (name, ≤60-char
tagline, description, maker first-comment, topics, gallery + a **GIF of the
teardown tool**); directory blurbs (one-line / ~50 / ~100 words); AlternativeTo
copy for each of the three compare pages; Reddit + IH value-post drafts.

## Stage 1 — Get launch-ready · the gate before any promotion

Do **not** start Stage 2+ until these pass — a launch spike into a broken flow
wastes the launch and the backlinks.
- **1.1 Isolated test/staging env (mostly Claude; from `BACKLOG.md`)** — separate
  Supabase test project, test Resend, Paddle stays sandbox.
- **1.2 Run SPEC §9 live in it (both)** — signup → limits → dashboard; a real
  digest send; a real Paddle sandbox checkout → paid → cancel → revert (you enter
  the test card).
- **1.3 Resend subdomain sending (both)** — DKIM/SPF/MX/DMARC on Cloudflare for
  `weekly@trailwatch.houseofruga.com` so digests deliver. → then **launch-ready**.

## Stage 2 — Evergreen listings · after launch-ready · all free
Email = the gmail; paste the prepped blurbs; skip anything that charges to list.
1. **AlternativeTo ×3 (you)** — TrailWatch page + list it as an alternative to
   Visualping, Crayon, Kompyte; link the matching `/compare/*` page in each.
2. **SaaSHub (you)** — product + the same three "alternative to" entries.
3. **G2 + Capterra (you)** — claim the basic free listing.
4. **StackShare + Indie Hackers Products (you)**.
5. **Free-tool directories (you)** — submit `/tools/*`, teardown first.

## Stage 3 — Community warm-up · after launch-ready · all free
1. **Indie Hackers (you)** — a genuine build/positioning post, link the teardown.
2. **Reddit (you)** — with karma now, a "how I track competitors" value post; tool
   link in context.
3. **X / LinkedIn build-in-public (you)** — post a live teardown of a known product.

## Stage 4 — Product Hunt launch · the big moment · free
Only after Stages 1–3, with a few genuine supporters lined up.
1. Schedule **Tue–Thu, 12:01 AM PT**.
2. Launch **TrailWatch (the product)** with the **teardown tool as the interactive
   hook** — first gallery image "try it now, paste a URL," the GIF, maker
   first-comment = the indie-founder story. Product is the headline; the tool is
   the demo.
3. Be present all day on comments; use a UTM'd link.
4. Cross-post to X, Indie Hackers, and your Stage-3 communities.

## Stage 5 — Ongoing · free · habitual
"Best Visualping alternatives" listicle outreach; guest posts; Featured/
Connectively free tier; podcast/newsletter swaps. **Measure:** Search Console
weekly (month 1) then monthly; watch the `?src=` attribution to double down on what
converts.

## Who does what
- **Claude:** drafts all copy, does the Stage-1 dev work (test env, §9 dev parts,
  Resend/Cloudflare records), swaps the Search Console token, builds more assets.
- **You:** create accounts, verify Search Console, submit/post, enter the Paddle
  sandbox card, click publish.
