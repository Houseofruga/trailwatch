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

- [ ] **AlternativeTo** — list TrailWatch as an alternative to **Visualping,
      Crayon, and Kompyte**. Directly reinforces the three compare pages; high
      relevance. (Highest priority — do first.)
- [ ] **SaaSHub** — same "alternative to" angle + a product listing.
- [ ] **Product directories:** SaaSAdviser, SaaSworthy, Uneed, SaaSHub, Toolify /
      relevant AI-tool directories (the teardown tool qualifies), StackShare.
- [ ] **G2 / Capterra** — create the product listing (slow, but authoritative and
      a source of "alternative" traffic). Optional at solo stage; low effort to at
      least claim.
- [ ] **Indie/maker directories:** Indie Hackers **Products**, Startup Stash,
      Land-book / SaaS landing galleries (the landing is polished — worth it).
- [ ] **Free-tool directories** for the `/tools/*` pages specifically (there are
      "free SEO tools" and "free tools" roundups that accept submissions).

## Phase 2 — Launch moments (concentrated spikes)

Do these once the pre-flight blockers are clear (real signups will arrive).

- [ ] **BetaList** — pre/early-launch audience; submit ahead of Product Hunt.
- [ ] **Product Hunt** — the big one. Lead with the **AI Competitor Teardown**
      (interactive, demoable) as the hook, product second. Prep: a maker comment,
      the founder story (indie founder — matches the landing), a GIF of the tool.
      Pick a Tue–Thu. Line up a few genuine early supporters beforehand.
- [ ] **Hacker News — Show HN** — only if there's a genuinely interesting angle
      (the low-noise filter, or the teardown). HN is allergic to marketing; post
      plainly, be present in comments.
- [ ] **Peerlist / DevHunt / Uneed launch slots** — secondary launch surfaces.

## Phase 3 — Community distribution (pitch the tool, be a human)

Give value first; the tool is the value. One-line "I built X" drops get removed.

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

- [ ] **"Alternative to" link opportunities** — find existing listicles ("best
      Visualping alternatives", "competitor monitoring tools") and ask to be
      added; your compare pages are the honest supporting content.
- [ ] **Guest posts / mentions** on indie/SaaS/PMM blogs and newsletters — pitch
      the founder-first competitor-tracking angle, link a tool.
- [ ] **HARO / Featured / Terkel** (journalist-request services) — answer
      competitor-analysis / competitive-intelligence queries for high-authority
      backlinks.
- [ ] **Podcast/newsletter swaps** with other bootstrapped founders.

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

## Suggested order

1. Pre-flight (Search Console; and the BACKLOG blockers before any real-signup push).
2. Phase 1 evergreen listings — AlternativeTo (×3) first, then the directories.
3. Phase 3 low-key community value posts (start trickling traffic + feedback).
4. Phase 2 launch (BetaList → Product Hunt) once staging + §9 are done.
5. Phase 4 outreach as an ongoing habit.
