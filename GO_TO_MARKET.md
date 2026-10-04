# Trailwatch go-to-market plan

Written 2026-10-04. One place for who we sell to, how we reach them, what we measure
and what happens each week. Numbers marked "estimate" are guesses until the first
150 messages give real data.

## 1. The strategy in one paragraph

Win the first 25 beta members by hand: send founders of small US Shopify brands a real
finding about their own competitor, set the product up for them, and talk to each one
three times. Use what those calls teach to fix the product, collect proof, and convert
beta members to paid plans on January 1, 2027. Add a second, inbound channel (data
posts in founder communities) once there is a month of tracked data to write about.

## 2. Who we sell to

- US Shopify DTC brands doing about $1M to $10M a year, selling their own products.
- Buyer: the founder, or the head of marketing or growth. Busy, not technical.
- Not for: dropshippers, enterprise brands, SaaS founders.
- They must have 3 or more direct competitors that are also on Shopify.

**First segment: skincare, body care and supplements.** Catalogs are small (10 to 300
products), so the free AI tier can finish a comparison in a day or two. Pet, fragrance,
oral care and home come next. Large-catalog categories (apparel, bedding) wait until
there is a paid AI key.

## 3. The offer

- Free during the beta. Paid plans start January 1, 2027 (Starter $29, Pro $79 a month).
- The first 25 brands are beta members: 5% off for life on joining, 5% more for each
  of 3 short feedback calls. "Up to 20% off for life once paid plans start."
- Price lock: a beta member's price never goes up. Billing is monthly only.
- We set it up for them: their store and their top 3 competitors, in two minutes.

## 4. Two channels

| | Channel 1: direct outreach | Channel 2: community posts |
|---|---|---|
| What | A personal email or LinkedIn DM with one real finding about their competitor | A useful data write-up posted where founders read, linking to the homepage widget |
| Starts | Week 1 | Week 5 (needs a month of tracked data) |
| Effort | 4 to 5 hours a week for 50 messages | 2 to 3 hours per post, one post every 2 weeks |
| Who does the work | We find each person | They find us, already curious |
| Enters the funnel at | Stage 1 | Stage 2 (widget lookup) |

## 5. The funnel

| Stage | Outreach | Community post | Target (estimate) |
|---|---|---|---|
| 1. Reached | Message sent | Post read | n/a |
| 2. Interested | They reply | They look up a competitor in the widget | 10 to 15% of messages |
| 3. Sign-up | Account created | "Join the beta" from the widget | 30 to 40% of replies |
| 4. Set up | Own store plus 2 or more competitors, first report opened | same | 70 to 80% |
| 5. Engaged | Opens the Monday briefing 3 weeks running, or rates one useful | same | 40 to 50% |
| 6. Call | First feedback call done | same | half of engaged |
| 7. Paying | Still a customer after January 1 | same | 25 to 35% of engaged |

From 100 messages, expect 3 to 5 sign-ups, 2 to 4 set up, 1 to 2 engaged.

**Where to read each number**
- Messages, replies, variant: the tracking columns in `trailwatch-prospects.csv`.
- Sign-ups, set-up, ratings, feedback, calls: Admin space.
- Widget lookups: "Homepage previews" in Admin space.

**The number that matters most is stage 5.** Sign-ups are easy to count; briefing opens
and "useful" ratings say whether the product works.

## 6. What is already done

- Product: onboarding (store required, 3 steps), alerts, Monday briefing, competitor
  report with product links and categories, opportunities, beta offer, feedback, ratings,
  admin space.
- Homepage widget: look up any Shopify competitor without signing up.
- Prospect list: 200 checked stores in `trailwatch-prospects.csv`, 141 with a published
  contact email, each with a LinkedIn search link.
- Messages: three variants (A the finding, B the question, C founder to founder), one
  follow-up, and short LinkedIn versions.
- Booking link for 30-minute calls; replies go to founder@gettrailwatch.com.

## 7. Timeline

### Week 0 (Oct 5 to 11): get ready

- Finish your own walkthrough as a new user: sign up, add store and competitors, send
  feedback, open Admin space.
- Fix the feedback email to founder@ (check `EMAIL_FROM` and the Vercel logs).
- Set up a separate address or domain for cold email, so outreach can't hurt the
  app's own emails. Add a postal address and an opt-out line to the email signature.
- Pick the first 50 prospects from the skincare and supplement rows. For each, find
  the founder or marketing head (LinkedIn link in the list, or Hunter or Apollo).
- For those 50, add their top competitor to your own Trailwatch account so its catalog
  is already read when they sign up.

### Weeks 1 to 4 (Oct 12 to Nov 8): first 150 messages

- Send about 50 messages a week, rotating variants A, B and C. Log each in the list.
- Re-check every finding on the day you send it.
- Follow up once, 4 to 5 days later, with a second finding.
- Reply to everyone within a day. Set each sign-up up yourself and book their first call.
- Do the first calls. Ask what they'd want in the Monday briefing and what was noise.
- End of week 4: review. Keep the best variant, write two new challengers.

Expected by Nov 8 (estimate): 5 to 8 sign-ups, 3 to 6 set up, 2 to 3 calls done.

### Weeks 5 to 8 (Nov 9 to Dec 6): scale and add the second channel

- Keep sending 50 a week. Finish the list of 200, then build the next 200 the same way
  (add pet, fragrance, oral care, home).
- Publish the first community post, built from a month of tracked data, for example
  "What 30 skincare brands discounted in October". Post in 2 communities. Link the
  widget. One post every 2 weeks after that.
- Ask the 2 or 3 happiest users for a one-line quote. Add it to the messages and the
  homepage.
- Ask every user: "Who else should have this?"
- Fix the top complaint from the calls.

Expected by Dec 6 (estimate): 12 to 18 sign-ups.

### Weeks 9 to 12 (Dec 7 to Jan 3): fill the beta and prepare for paid

- Keep outreach at 50 a week until the 25 beta spots are full. Stop mentioning the 25
  spots once they are.
- Finish the second and third calls with engaged users.
- Decide on paid AI before billing starts (see section 9).
- Turn billing on for January 1: Paddle live, plans and the beta discounts.
- Two weeks before January 1, email beta members: what they pay, their discount, and
  what happens if they do nothing.

Expected by Jan 3 (estimate): 25 beta members, 8 to 12 engaged.

### Months 4 to 6 (January to early April 2027): paid

- New sign-ups get a free trial or the Free plan, not the beta offer.
- Keep the outreach engine at 30 to 50 messages a week and the posts every 2 weeks.
- Turn SEO back on (currently parked) with the public tools and data posts.
- Add larger-catalog categories once paid AI is on.

Expected by early April (estimate): 60 to 100 sign-ups, 20 to 35 engaged, 8 to 15
paying, $400 to $800 a month.

## 8. The weekly routine (about 8 hours)

| Day | What | Time |
|---|---|---|
| Monday | Read briefing ratings and feedback in Admin space; reply to users | 1 hour |
| Tuesday, Wednesday | Research and send 50 messages with findings | 4 to 5 hours |
| Thursday | Follow-ups; set up new sign-ups; calls | 1 to 2 hours |
| Friday | Log the week's numbers; one product fix from feedback | 1 hour |

## 9. Decisions and their triggers

| Decision | Trigger | Options |
|---|---|---|
| Change the message or the audience | Under 2% of messages become sign-ups after 100 sends | New finding type, new category, or LinkedIn instead of email |
| Add a paid AI key | The first real user signs up, or comparisons take more than 3 days | Anthropic key with a monthly cap of about $100; or paid Groq after a quality review |
| Move off free hosting | Before charging anyone | Vercel Pro and Supabase Pro, about $45 a month together |
| Keep, hide or improve Slack alerts | After the first 10 to 15 users | Hide if nobody uses it; build "Add to Slack" if people ask |
| Rethink the product | Under 30% of set-up users open the briefing 3 weeks running | Use the calls to find out why before sending more messages |

## 10. Known limits to plan around

- **Comparisons are slow on the free AI tier.** About 1,000 products a day in total.
  Pre-load prospects' competitors and start with small catalogs.
- **Competitors must be on Shopify.** Check when choosing prospects.
- **Revenue in the prospect list is unverified.** Drop brands that turn out too big.
- **One person's time.** 50 researched messages plus calls is about 8 hours a week. At
  30 messages a week, expect roughly half the sign-ups.

## 11. Targets at a glance (all estimates)

| By | Sign-ups | Engaged | Paying |
|---|---|---|---|
| Nov 8 | 5 to 8 | 2 to 4 | 0 |
| Dec 6 | 12 to 18 | 5 to 8 | 0 |
| Jan 3 | 25 | 8 to 12 | 0 |
| Early April | 60 to 100 | 20 to 35 | 8 to 15 |
