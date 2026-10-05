import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/Button";
import { BETA_CONFIG, maxDiscountPct } from "@/features/beta/config";
import { CompetitorLookup } from "../CompetitorLookup";
import { FounderReveal } from "../FounderReveal";
import hero from "../home.module.css";
import legacy from "../page.module.css";
import { betaSpotsLeft, weeksToBlackFriday } from "./betaSpots";
import { InView } from "./InView";
import s from "./v2.module.css";

// The reworked homepage, at /v2 until the owner approves it (then it replaces `/`).
// Kept out of search results and the sitemap while it's a preview.
export const metadata: Metadata = {
  title: { absolute: "Trailwatch — competitor briefings for Shopify brands" },
  robots: { index: false, follow: false },
};

// The spot count and the weeks-to-Black-Friday figure refresh hourly.
export const revalidate = 3600;

const SIGNUP = "/login?mode=signup";
const CAP = BETA_CONFIG.foundingCap;
const MAX_OFF = maxDiscountPct();

const betaPrice = (price: number) => (price * (1 - MAX_OFF / 100)).toFixed(2);

// Example scenarios, not measurements: the gap between a competitor's move and
// the day a brand typically notices it by hand.
const LATE = [
  {
    gap: "4 days",
    title: "The sale you matched a week late.",
    body: "They went 25% off on Thursday. You noticed when your weekend numbers came in.",
  },
  {
    gap: "6 days",
    title: "The sell-out you never used.",
    body: "Their best seller was out of stock for six days. Your closest product sat at the same ad budget.",
  },
  {
    gap: "1 month",
    title: "The launch a customer told you about.",
    body: "A new product, priced just under your best seller, live for a month before you saw it.",
  },
];

const STEPS = [
  {
    title: "Add your store and your competitors.",
    body: "Paste the addresses. Not sure who they are? We suggest them.",
  },
  {
    title: "We read every catalog, every few hours.",
    body: "Every product, price, discount and sold-out item.",
  },
  {
    title: "Big moves reach you within hours. The rest waits for Monday.",
    body: "One email, two minutes, one move to make.",
  },
];

const HEARD = ["A sitewide sale", "A discount of 20% or more", "A new product", "A best seller selling out", "A price now under yours"];
const FILTERED = ["Footer edits", "Cookie banners", "Reordered menus", "Reworded descriptions"];

const COMPARE_HEAD = ["Checking by hand", "Price trackers", "Page monitors", "Trailwatch"];
const COMPARE_ROWS = [
  ["Built for", "Whoever has time", "Resellers matching identical items", "Any web page", "Brands with their own products"],
  ["Compares with your products", "In your head", "Only identical items", "No", "Yes, similar products too"],
  ["Tells you what to do", "No", "No", "No", "Yes, every Monday"],
  ["Your time each week", "An hour or more", "Dashboards to read", "Alerts to sort", "Two minutes"],
];

const PLANS = [
  {
    name: "Starter",
    price: 29,
    features: ["3 competitors", "Compared with your own products", "Email alerts", "Stores checked every 6 hours", "Monday briefing"],
  },
  {
    name: "Pro",
    price: 79,
    features: ["10 competitors", "Compared with your own products", "Email and Slack alerts", "Stores checked every 2 hours", "Monday briefing"],
  },
];

const FAQ = [
  {
    q: "Do I need to install anything on my store?",
    a: "No. There’s no app to install, and Trailwatch never asks for access to your store. You paste your store’s address and your competitors’ addresses, and that’s the whole setup.",
  },
  {
    q: "Will my competitors know I’m watching?",
    a: "No. Trailwatch reads the same public pages any shopper can see. It doesn’t log in, place orders or contact the store, and nothing it does points back to you.",
  },
  {
    q: "What if a competitor isn’t on Shopify?",
    a: "Trailwatch works with Shopify stores today. You can check any store in a few seconds with the free Shopify store checker.",
  },
  {
    q: "How is this different from a price tracker?",
    a: "Price trackers are built for resellers who sell the same item as their rivals and want to match its price. You sell your own products, so there’s rarely an identical item to match. Trailwatch compares similar products, and it covers launches, sales and sell-outs as well as prices.",
  },
  {
    q: "What happens after December 31?",
    a: "Paid plans start on January 1, 2027: Starter at $29 a month and Pro at $79. Beta members keep their discount for life, and their price never goes up. We’ll email you before then with exactly what you’d pay. There’s no card on file, so you’re never charged without choosing a plan.",
  },
  {
    q: `What does the ${MAX_OFF}% off depend on?`,
    a: `You get ${BETA_CONFIG.baseDiscountPct}% off for life the day you join. Each of ${BETA_CONFIG.callsNeeded} short feedback calls with the founder adds ${BETA_CONFIG.perCallDiscountPct}% more, up to ${MAX_OFF}%. Once you’ve earned it, it stays.`,
  },
  {
    q: "Is this fair to do?",
    a: "Yes. It’s the same research you’d do by opening a competitor’s store yourself, done on a schedule. Trailwatch reads public pages only, follows each store’s rules for automated visitors and never stores shoppers’ personal data.",
  },
];

export default async function HomeV2() {
  const spotsLeft = await betaSpotsLeft();
  const weeksLeft = weeksToBlackFriday();
  const spots = spotsLeft === null ? `${CAP} beta spots` : `${spotsLeft} of ${CAP} beta spots left`;

  return (
    <div className={`ui ${s.page}`}>
      {/* ---- 0 · strip */}
      <p className={s.strip}>
        {spotsLeft === null ? `Beta: ${CAP} brands.` : `Beta: ${spotsLeft} of ${CAP} spots left.`} Free until December 31, then up to{" "}
        {MAX_OFF}% off for life.
      </p>

      {/* ---- 1 · hero (same sky and live lookup as the current homepage) */}
      <section className={hero.hero}>
        <div className={hero.sky} aria-hidden="true" />
        <div className={hero.header}>
          <SiteHeader onDark />
        </div>
        <div className={hero.heroInner}>
          <div className={hero.heroCopy}>
            <h1 className={hero.title}>Your competitor started a sale on Thursday. You found out on Monday.</h1>
            <p className={hero.body}>
              Trailwatch reads your competitors’ stores next to yours. When they launch, discount or sell out, you hear within hours what it
              means for your products. Every Monday, one short email tells you the move to make.
            </p>
            <div className={hero.heroCta}>
              <Button variant="primary" tall href={SIGNUP}>
                Join the beta
              </Button>
              <span className={hero.heroCtaNote}>Free until December 31 · No card · Nothing to install</span>
            </div>
          </div>
          <div className={hero.heroTool}>
            <CompetitorLookup />
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={hero.hill} src="/HillFG.webp" alt="" aria-hidden="true" />
      </section>

      {/* ---- 2 · the cost of finding out late */}
      <section className={s.late}>
        <div className={s.shell}>
          <h2 className={s.h2}>You hear about most competitor moves too late to do anything.</h2>
          <ol className={s.ledger}>
            {LATE.map((l) => (
              <li key={l.gap} className={s.ledgerRow}>
                <p className={s.gap}>
                  {l.gap} <span>late</span>
                </p>
                <div>
                  <h3 className={s.ledgerTitle}>{l.title}</h3>
                  <p className={s.ledgerBody}>{l.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- 3 · what makes it different: their store read next to yours */}
      <section className={s.match}>
        <div className={s.shell}>
          <h2 className={`${s.h2} ${s.onDeep}`}>It doesn’t just watch their store. It reads it next to yours.</h2>
          <InView className={s.scene}>
            <div className={s.pair} role="img" aria-label="Example: Luna Skin’s Vitamin C serum drops from $42 to $32, which is $8 under your closest product at $40.">
              <div className={s.product}>
                <span className={s.side}>Their store · Luna Skin</span>
                <span className={`${s.thumb} ${s.thumbTheirs}`} aria-hidden="true" />
                <span className={s.productName}>Vitamin C serum, 30ml</span>
                <span className={s.priceLine}>
                  <span className={s.was}>$42</span>
                  <span className={s.now}>$32</span>
                  <span className={s.saleTag}>Sale</span>
                </span>
              </div>
              <div className={s.link} aria-hidden="true">
                <span className={s.linkLine} />
                <span className={s.linkPill}>$8 under yours</span>
              </div>
              <div className={s.product}>
                <span className={s.side}>Your store</span>
                <span className={`${s.thumb} ${s.thumbYours}`} aria-hidden="true" />
                <span className={s.productName}>Brightening serum, 30ml</span>
                <span className={s.priceLine}>
                  <span className={s.now}>$40</span>
                </span>
              </div>
            </div>

            <div className={s.briefing}>
              <p className={s.briefingHead}>
                <span>Your Monday briefing</span>
                <span>Example</span>
              </p>
              <dl className={s.briefingRows}>
                <div>
                  <dt>What changed</dt>
                  <dd>Luna Skin put its Vitamin C serum on sale, $42 to $32.</dd>
                </div>
                <div>
                  <dt>What it means for you</dt>
                  <dd>It’s their best seller, and it now sits $8 under your closest product.</dd>
                </div>
                <div>
                  <dt>Your move</dt>
                  <dd>Hold your price. Their last two sales ended within five days.</dd>
                </div>
              </dl>
            </div>
          </InView>
          <p className={s.matchNote}>
            Trailwatch matches their products to yours, even when they aren’t identical. So you hear about the moves that touch your catalog,
            in plain English.
          </p>
        </div>
      </section>

      {/* ---- 4 · how it works: three waypoints on one trail */}
      <section className={s.how}>
        <div className={s.shell}>
          <h2 className={s.h2}>Two minutes to set up. Nothing to check after that.</h2>
          <ol className={s.trail}>
            {STEPS.map((step, i) => (
              <li key={step.title} className={s.waypoint}>
                <span className={s.marker} aria-hidden="true">
                  {i + 1}
                </span>
                <h3 className={s.stepTitle}>{step.title}</h3>
                <p className={s.stepBody}>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- 5 · low noise */}
      <section className={s.noise}>
        <div className={s.shell}>
          <h2 className={s.h2}>You’ll hear from us when it matters. Only then.</h2>
          <div className={s.noiseCols}>
            <div>
              <h3 className={s.noiseHead}>You hear about</h3>
              <ul className={s.heard}>
                {HEARD.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className={s.noiseHead}>You never hear about</h3>
              <ul className={s.filtered}>
                {FILTERED.map((x) => (
                  <li key={x}>
                    <s>{x}</s>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 6 · why not what you use now */}
      <section className={s.compare}>
        <div className={s.shell}>
          <h2 className={s.h2}>Built for brands that sell their own products.</h2>
          <div className={s.tableWrap} tabIndex={0} role="region" aria-label="How Trailwatch compares">
            <table className={s.table}>
              <thead>
                <tr>
                  <td />
                  {COMPARE_HEAD.map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map(([label, ...cells]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {cells.map((c, i) => (
                      <td key={i}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---- 7 · Black Friday: history can't be bought later */}
      {weeksLeft >= 2 ? (
        <section className={s.season}>
          <div className={s.shell}>
            <div className={s.seasonCopy}>
              <h2 className={`${s.h2} ${s.onDeep}`}>You can’t go back and record October.</h2>
              <p className={s.seasonBody}>
                Trailwatch learns a competitor’s normal prices from the day you add them. Add them now, and by Black Friday you’ll have weeks of
                history. You’ll know which of their “40% off” deals are real cuts and which have been that price all year. Add them in late
                November, and you’ll be guessing along with everyone else.
              </p>
            </div>
            <div className={s.timeline}>
              <div className={s.lane}>
                <p className={s.laneLabel}>
                  <strong>Add them today</strong>
                  <span>{weeksLeft} weeks of normal prices on record</span>
                </p>
                <span className={s.bar} />
              </div>
              <div className={s.lane}>
                <p className={s.laneLabel}>
                  <strong>Add them on November 20</strong>
                  <span>1 week. Not enough to tell a real cut from a fake one</span>
                </p>
                <span className={`${s.bar} ${s.barLate}`} style={{ width: `${Math.max(8, 100 / weeksLeft)}%` }} />
              </div>
              <p className={s.axis}>
                <span>Today</span>
                <span>Black Friday, November 27</span>
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* ---- 8 · the beta offer, with prices */}
      <section className={s.offer}>
        <div className={`${s.shell} ${s.offerGrid}`}>
          <div>
            <h2 className={s.h2}>{CAP} beta brands. Then this offer closes.</h2>
            <ul className={s.terms}>
              <li>Free until December 31, 2026. No card.</li>
              <li>{BETA_CONFIG.baseDiscountPct}% off for life the day you join.</li>
              <li>
                {BETA_CONFIG.perCallDiscountPct}% more for each of three short feedback calls. Up to {MAX_OFF}% off for life.
              </li>
              <li>Your price never goes up, for as long as you stay.</li>
              <li>Chandan sets up your store and competitors with you.</li>
            </ul>
            <div className={s.offerCta}>
              <Button variant="primary" tall href={SIGNUP}>
                Join the beta
              </Button>
              <span className={s.offerNote}>{spots}</span>
            </div>
          </div>
          <div>
            <div className={s.plans}>
              {PLANS.map((p) => (
                <div key={p.name} className={s.plan}>
                  <h3 className={s.planName}>{p.name}</h3>
                  <p className={s.planPrice}>
                    <s>${p.price}</s>
                    <strong>${betaPrice(p.price)}</strong>
                    <span>a month</span>
                  </p>
                  <p className={s.planTerms}>
                    For beta members with all three calls done. ${p.price} for everyone else.
                  </p>
                  <ul className={s.planFeatures}>
                    {p.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className={s.plansFoot}>
              Paid plans start January 1, 2027. The beta discount is for the first {CAP} brands only.
            </p>
          </div>
        </div>
      </section>

      {/* ---- 9 · founder note */}
      <section className={s.founder}>
        <div className={`${s.shell} ${s.founderGrid}`}>
          <figure className={`${legacy.finalPortrait} ${s.portrait}`}>
            <FounderReveal />
          </figure>
          <div>
            <h2 className={s.h2}>You’ll be talking to the person who builds it.</h2>
            <p className={s.founderBody}>
              I’m Chandan. I build Trailwatch and I answer every email. The {CAP} beta brands will shape what it becomes: tell me what was
              useful in your Monday briefing and what was noise, and I’ll fix it that week.
            </p>
            <p className={s.signature}>Chandan Dongre, founder of Trailwatch</p>
          </div>
        </div>
      </section>

      {/* ---- 10 · questions */}
      <section className={s.faq}>
        <div className={`${s.shell} ${s.faqGrid}`}>
          <h2 className={s.h2}>Questions, answered.</h2>
          <div className={s.faqList}>
            {FAQ.map((f) => (
              <details key={f.q} className={s.faqItem}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---- 11 · final call */}
      <section className={s.final}>
        <div className={s.shell}>
          <h2 className={s.finalTitle}>Your competitors will make their next move this week. Find out the day it happens.</h2>
          <div className={s.finalCta}>
            <Button variant="primary" tall href={SIGNUP}>
              Join the beta
            </Button>
            <span className={s.finalNote}>{spots} · Free until December 31</span>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
