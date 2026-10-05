import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/Button";
import { BETA_CONFIG, maxDiscountPct } from "@/features/beta/config";
import { createClient } from "@/lib/supabase/server";
import { CloudScene } from "./CloudScene";
import { CompetitorLookup } from "./CompetitorLookup";
import { FounderReveal } from "./FounderReveal";
import { StepsScroller } from "./StepsScroller";
import { structuredData } from "./structuredData";
import hero from "./home.module.css";
import { betaSpotsLeft, weeksToBlackFriday } from "./home/betaSpots";
import { InView } from "./home/InView";
import s from "./home/sections.module.css";

// The homepage (reworked 2026-10-06 from DESIGN 15-landing A, keeping the earlier
// hero, three-step scroller and cloud scene). This is the indexed, canonical `/`
// and carries the site's structured data. The previous version is at /v1.
const TITLE = "Trailwatch — competitor briefings for Shopify brands";
const DESCRIPTION =
  "Your competitors' launches, price cuts, sales and sell-outs, in your inbox within hours, plus a plain-English briefing every Monday. Free during beta.";

// OG / Twitter title and description come from the root layout (same text).
export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
};

const SIGNUP = "/login?mode=signup";
const CAP = BETA_CONFIG.foundingCap;
const MAX_OFF = maxDiscountPct();

const betaPrice = (price: number) => (price * (1 - MAX_OFF / 100)).toFixed(2);

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const LATE = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
        <path d="M3 12V3h9l9 9-9 9z" />
        <circle cx="7.5" cy="7.5" r="1.5" />
      </svg>
    ),
    title: "The sale you matched a week late.",
    body: "They went 25% off on Thursday. You noticed when your weekend numbers came in.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
        <circle cx="12" cy="12" r="9" />
        <path d="M5.6 5.6l12.8 12.8" />
      </svg>
    ),
    title: "The sell-out you never used.",
    body: "Their best seller was out of stock for six days. Your closest product sat at the same ad budget.",
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
        <path d="M3 7l9-4 9 4v10l-9 4-9-4z" />
        <path d="M3 7l9 4 9-4" />
        <path d="M12 11v10" />
      </svg>
    ),
    title: "The launch a customer told you about.",
    body: "A new product, priced just under your best seller, live for a month before you saw it.",
  },
];

const DAYS = [
  { day: "Thu", note: "Sale starts 9:00 AM" },
  { day: "Fri", note: "" },
  { day: "Sat", note: "" },
  { day: "Sun", note: "" },
  { day: "Mon", note: "You notice 8:40 AM" },
];

const STEPS = [
  "Add your store and your competitors. Paste the addresses. Not sure who they are? We suggest them.",
  "We read every catalog, every few hours: every product, price, discount and sold-out item. Footer tweaks and cookie banners never reach you.",
  "Big moves reach you within hours. The rest waits for Monday: one email, two minutes, one move to make.",
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
    rows: [
      ["Competitors", "3"],
      ["Alerts", "Email"],
      ["Stores checked", "Every 6 hours"],
      ["Monday briefing", "Yes"],
      ["Compared with your own products", "Yes"],
    ],
  },
  {
    name: "Pro",
    price: 79,
    rows: [
      ["Competitors", "10"],
      ["Alerts", "Email and Slack"],
      ["Stores checked", "Every 2 hours"],
      ["Monday briefing", "Yes"],
      ["Compared with your own products", "Yes"],
    ],
  },
];

const FAQ_LEFT = [
  {
    q: "Do I need to install anything on my store?",
    a: "No. Trailwatch reads your store and your competitors’ stores from the outside, the way a shopper would. There’s no app to install and nothing changes on your site.",
  },
  {
    q: "What if a competitor isn’t on Shopify?",
    a: "Trailwatch works with Shopify stores today. You can check any store in a few seconds with the free Shopify store checker.",
  },
  {
    q: "What happens after December 31?",
    a: "Paid plans start on January 1, 2027: Starter at $29 a month and Pro at $79. Beta members keep their discount for life, and their price never goes up. We’ll email you before then with exactly what you’d pay. There’s no card on file, so you’re never charged without choosing a plan.",
  },
  {
    q: "Is this fair to do?",
    a: "Yes. It’s the same research you’d do by opening a competitor’s store yourself, done on a schedule. Trailwatch reads public pages only, follows each store’s rules for automated visitors and never stores shoppers’ personal data.",
  },
];

const FAQ_RIGHT = [
  {
    q: "Will my competitors know I’m watching?",
    a: "No. Trailwatch reads the same public pages any shopper can see. It doesn’t log in, place orders or contact the store, and nothing it does points back to you.",
  },
  {
    q: "How is this different from a price tracker?",
    a: "Price trackers are built for resellers who sell the same item as their rivals and want to match its price. You sell your own products, so there’s rarely an identical item to match. Trailwatch compares similar products, and it covers launches, sales and sell-outs as well as prices.",
  },
  {
    q: `What does the ${MAX_OFF}% off depend on?`,
    a: `You get ${BETA_CONFIG.baseDiscountPct}% off for life the day you join. Each of ${BETA_CONFIG.callsNeeded} short feedback calls with the founder adds ${BETA_CONFIG.perCallDiscountPct}% more, up to ${MAX_OFF}%. Once you’ve earned it, it stays.`,
  },
];

const Check = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2.2}>
    <path d="M5 12l5 5 9-10" />
  </svg>
);

function Faq({ items, openFirst }: { items: { q: string; a: string }[]; openFirst?: boolean }) {
  return (
    <div className={s.faqCol}>
      {items.map((f, i) => (
        <details key={f.q} className={s.faqItem} open={openFirst && i === 0}>
          <summary>
            {f.q}
            <svg className={s.chev} width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...stroke} strokeWidth={2}>
              <path d="M12 5v14M5 12h14" />
            </svg>
          </summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-in visitors go straight to the app.
  if (user) redirect("/dashboard");

  const spotsLeft = await betaSpotsLeft();
  const weeksLeft = weeksToBlackFriday();
  const spots = spotsLeft === null ? `${CAP} beta spots` : `${spotsLeft} of ${CAP} beta spots left`;

  const compare = (
    <section className={`${s.section} ${s.compare}`}>
            <div className={s.shell}>
              <h2 className={s.h2}>Built for brands that sell their own products.</h2>
              <div className={s.tableWrap} tabIndex={0} role="region" aria-label="Comparison: Trailwatch and other ways to watch competitors">
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
              <p className={s.swipe}>Swipe to compare all four.</p>
            </div>
          </section>
  );

  return (
    <div className={`ui ${s.page}`}>
      {/* The FAQ in the structured data is the same list the page shows. */}
      <JsonLd data={structuredData([...FAQ_LEFT, ...FAQ_RIGHT])} />

      {/* LCP: the hero's sky background, preloaded high-priority. */}
      <link rel="preload" as="image" href="/fullBG.webp" fetchPriority="high" />

      {/* ---- 0 · strip */}
      <p className={s.strip}>
        Beta:{" "}
        {spotsLeft === null ? (
          `${CAP} brands.`
        ) : (
          <>
            <strong>
              {spotsLeft} of {CAP}
            </strong>{" "}
            spots left.
          </>
        )}{" "}
        Free until December 31, then up to {MAX_OFF}% off for life.
      </p>

      {/* ---- 1 · hero: the current homepage's hero as it is (sky, copy left, live lookup right) */}
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
        <img className={hero.hill} src="/HillFG.webp" alt="" aria-hidden="true" fetchPriority="high" />
      </section>

      {/* ---- the week, drawn big (from the design's hero) */}
      <section className={s.weekSection}>
        <div className={s.shell}>
          <InView className={s.reveal}>
            <figure className={s.week}>
              <figcaption className={s.weekHead}>
                <span>Luna Skin goes 25% off sitewide</span>
                <span className={s.exampleDark}>Example</span>
              </figcaption>
              <div className={s.days} aria-hidden="true">
                {DAYS.map((d) => (
                  <div key={d.day} className={s.dayCol}>
                    <span className={s.day}>{d.day}</span>
                    <span className={s.dayNote}>{d.note}</span>
                  </div>
                ))}
              </div>
              <p className={s.weekLabel}>Without Trailwatch</p>
              <div className={s.weekRow}>
                <span className={`${s.blind} ${s.fill}`}>Their sale runs. You don’t know yet.</span>
                <span className={s.tooLate}>Too late</span>
              </div>
              <p className={s.weekLabel}>With Trailwatch</p>
              <div className={s.weekRow}>
                <span className={s.alert}>Alert 2:40 PM</span>
                <span className={s.sameDay}>You decide the same afternoon.</span>
              </div>
            </figure>
          </InView>
        </div>
      </section>

      {/* ---- 2 · the cost of finding out late */}
      <section className={`${s.section} ${s.afterWeek}`}>
        <div className={s.shell}>
          <h2 className={s.h2} style={{ maxWidth: 900 }}>
            You hear about most competitor moves too late to do anything.
          </h2>
          <ul className={s.late}>
            {LATE.map((l) => (
              <li key={l.title}>
                {l.icon}
                <h3>{l.title}</h3>
                <p>{l.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- 3 · what makes it different */}
      <section className={`${s.section} ${s.black}`}>
        <div className={s.shell}>
          <h2 className={`${s.h2} ${s.h2Big}`}>It doesn’t just watch their store. It reads it next to yours.</h2>
          <div className={s.matchGrid}>
            <article className={s.briefing}>
              <header>
                <div>
                  <span className={s.briefingTitle}>Your Monday briefing: one move this week</span>
                  <span className={s.briefingFrom}>From Trailwatch · Monday 7:00 AM</span>
                </div>
                <span className={s.example}>Example</span>
              </header>
              <dl>
                <div className={s.briefRow}>
                  <dt>What changed</dt>
                  <dd>Luna Skin put its Vitamin C serum on sale, $42 to $32.</dd>
                </div>
                <div className={s.briefRow}>
                  <dt>What it means for you</dt>
                  <dd>It’s their best seller, and it now sits $8 under your closest product.</dd>
                </div>
                <div className={s.move}>
                  <dt>Your move</dt>
                  <dd>Hold your price. Their last two sales ended within five days.</dd>
                </div>
              </dl>
            </article>
            <div className={s.matchSide}>
              <div>
                <div className={s.product}>
                  <span className={s.theirs}>Theirs</span>
                  <span className={s.productName}>Vitamin C Serum, 30 ml</span>
                  <span className={s.productStore}>Luna Skin</span>
                  <span className={s.productPrice}>
                    $32 <s>$42</s>
                  </span>
                </div>
                <div className={s.matched} aria-hidden="true">
                  <span />
                  Matched: similar serum, $8 apart
                </div>
                <div className={s.product}>
                  <span className={s.yours}>Yours</span>
                  <span className={s.productName}>Brightening C Serum, 30 ml</span>
                  <span className={s.productStore}>Your store (example)</span>
                  <span className={s.productPrice}>$40</span>
                </div>
              </div>
              <p className={s.matchNote}>
                Trailwatch matches their products to yours, even when they aren’t identical. So you hear about the moves that touch your
                catalog, in plain English.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 4 · how it works: the current homepage's pinned three-step scroller, new copy */}
      <StepsScroller fresh heading="Two minutes to set up. Nothing to check after that." bodies={STEPS} />

      {/* ---- 5 · low noise */}
      <section className={`${s.section} ${s.tint}`}>
        <div className={s.shell}>
          <h2 className={s.h2}>You’ll hear from us when it matters. Only then.</h2>
          <div className={s.noiseCols}>
            <div>
              <h3 className={s.small}>You hear about</h3>
              <ul className={s.heard}>
                {HEARD.map((x) => (
                  <li key={x}>
                    <span className={s.dot} aria-hidden="true" />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className={s.small}>You never hear about</h3>
              <ul className={s.filtered}>
                {FILTERED.map((x) => (
                  <li key={x}>
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" {...stroke}>
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                    <s>{x}</s>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 6 → 7 · the comparison holds while a cloud flies through and reveals Black Friday
          above the clouds (the current homepage's pinned cloud scene; stacked on phones) */}
      {weeksLeft >= 2 ? (
        <div className={s.cloudWrap}>
          <CloudScene
            why={compare}
            pricing={
              <section className={`${s.section} ${s.season}`}>
                <div className={s.shell}>
                  <h2 className={`${s.h2} ${s.h2Big}`}>You can’t go back and record October.</h2>
                  <p className={s.seasonBody}>
                    Trailwatch learns a competitor’s normal prices from the day you add them. Add them now, and by Black Friday you’ll have
                    weeks of history. You’ll know which of their “40% off” deals are real cuts and which have been that price all year. Add
                    them in late November, and you’ll be guessing along with everyone else.
                  </p>
                  <figure className={s.timeline}>
                    <div className={s.axis}>
                      <span>Today</span>
                      <span>Black Friday, November 27</span>
                    </div>
                    <p className={s.laneLabel}>Add competitors today</p>
                    <div className={s.lane}>
                      <span className={s.laneFull}>{weeksLeft} weeks of normal prices on record</span>
                    </div>
                    <p className={s.laneLabel}>Add them on November 20</p>
                    <div className={s.lane}>
                      <span className={s.laneLate} style={{ left: `${100 - 100 / weeksLeft}%` }} />
                      <span className={s.laneLateText} style={{ right: `calc(${100 / weeksLeft}% + 14px)` }}>
                        1 week. Not enough to tell a real cut from a fake one
                      </span>
                    </div>
                  </figure>
                </div>
              </section>
            }
          />
        </div>
      ) : (
        compare
      )}

      {/* ---- 8 · the beta offer, with prices */}
      <section className={s.section}>
        <div className={s.shell}>
          <h2 className={s.h2}>{CAP} beta brands. Then this offer closes.</h2>
          <div className={s.offerGrid}>
            <div>
              <h3 className={s.small}>What beta members get</h3>
              <ul className={s.terms}>
                <li>
                  <Check />
                  Free until December 31, 2026. No card.
                </li>
                <li>
                  <Check />
                  {BETA_CONFIG.baseDiscountPct}% off for life the day you join.
                </li>
                <li>
                  <Check />
                  <span>
                    {BETA_CONFIG.perCallDiscountPct}% more for each of three short feedback calls. Up to {MAX_OFF}% off for life.
                  </span>
                </li>
                <li>
                  <Check />
                  Your price never goes up, for as long as you stay.
                </li>
                <li>
                  <Check />
                  Chandan sets up your store and competitors with you.
                </li>
              </ul>
            </div>
            <div>
              <h3 className={s.small}>From January 1</h3>
              <div className={s.plans}>
                {PLANS.map((p) => (
                  <article key={p.name} className={s.plan}>
                    <h3>{p.name}</h3>
                    <p className={s.planPrice}>
                      <span className={s.regular}>
                        Regular price <s>${p.price} a month</s>
                      </span>
                      <span>Beta members pay as little as</span>
                      <span className={s.amount}>
                        <strong>${betaPrice(p.price)}</strong> a month
                      </span>
                    </p>
                    <dl>
                      {p.rows.map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                ))}
              </div>
              <p className={s.plansFoot}>
                The beta discount is for the first {CAP} brands only. Everyone who joins later pays the regular price.
              </p>
            </div>
          </div>
          <div className={s.offerCta}>
            <Button variant="primary" tall href={SIGNUP}>
              Join the beta
            </Button>
            {spotsLeft === null ? null : (
              <span className={s.spots}>
                <span className={s.dot} aria-hidden="true" />
                {spotsLeft} of {CAP} spots left
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ---- 9 · founder note */}
      <section className={`${s.section} ${s.tint}`}>
        <div className={`${s.shell} ${s.founder}`}>
          <figure className={s.portrait}>
            <FounderReveal />
          </figure>
          <div>
            <h2 className={`${s.h2} ${s.h2Small}`}>You’ll be talking to the person who builds it.</h2>
            <p className={s.founderBody}>
              I’m Chandan. I build Trailwatch and I answer every email. The {CAP} beta brands will shape what it becomes: tell me what was
              useful in your Monday briefing and what was noise, and I’ll fix it that week.
            </p>
            <p className={s.signature}>
              Chandan Dongre <span>· Founder, Trailwatch</span>
            </p>
          </div>
        </div>
      </section>

      {/* ---- 10 · questions */}
      <section className={s.section}>
        <div className={s.shell}>
          <h2 className={s.h2}>Questions</h2>
          <div className={s.faq}>
            <Faq items={FAQ_LEFT} openFirst />
            <Faq items={FAQ_RIGHT} />
          </div>
        </div>
      </section>

      {/* ---- 11 · final call */}
      <section className={`${s.section} ${s.black} ${s.final}`}>
        <div className={s.shell}>
          <h2 className={`${s.h2} ${s.h2Final}`}>Your competitors will make their next move this week. Find out the day it happens.</h2>
          <div className={s.finalCta}>
            <Button variant="secondary" tall href={SIGNUP}>
              Join the beta
            </Button>
            <p>{spots} · Free until December 31</p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
