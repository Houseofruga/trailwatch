import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import styles from "./page.module.css";

const STEPS = [
  {
    n: "01",
    title: "Paste the pages",
    body: "Add a competitor, then the URLs you care about with a label like “pricing”. Takes about a minute.",
  },
  {
    n: "02",
    title: "We check daily and filter",
    body: "Timestamps, rotating quotes, script tags and layout noise get dropped before anything reaches you.",
  },
  {
    n: "03",
    title: "One email on Monday",
    body: "Grouped by competitor, one plain sentence per change, with a link if you want the detail. Read it in 30 seconds.",
  },
];

export default function LandingPage() {
  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <Image
          src="/logo.svg"
          alt="Trailwatch"
          width={90}
          height={24}
          className={styles.logo}
          priority
        />
        <div className={styles.headerActions}>
          <Link href="/login" className={styles.headerLogin}>
            Log in
          </Link>
          <ButtonLink href="/login?mode=signup">Start free</ButtonLink>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>Competitor page monitoring for small teams</div>
          <h1 className={styles.heroTitle}>Stop manually checking competitor sites.</h1>
          <p className={styles.heroBody}>
            We watch the pages that matter &mdash; pricing, homepage, changelog &mdash; and email
            you one digest a week explaining what actually changed. In sentences, not diffs.
          </p>
          <div className={styles.heroCta}>
            <ButtonLink
              href="/login?mode=signup"
              style={{ padding: "13px 24px", fontSize: "15px" }}
            >
              Start free &mdash; 1 competitor
            </ButtonLink>
            <span className={styles.heroNote}>
              No credit card. Pro is $19/mo when you need more.
            </span>
          </div>
        </div>
      </section>

      {/* The product's whole claim, shown rather than asserted: one real
          sentence, and the count of what we chose not to send. */}
      <section className={styles.proof}>
        <div className={styles.proofCard}>
          <div className={styles.proofLabel}>A line from last Monday&rsquo;s digest</div>
          <div className={styles.proofRow}>
            <div className={styles.proofTag}>Pricing</div>
            <div style={{ flex: 1 }}>
              <div className={styles.proofSummary}>
                Vercel cut the Pro plan&rsquo;s included bandwidth from 1&nbsp;TB to 100&nbsp;GB
                and now bills overage at $0.15 per GB.
              </div>
              <div className={styles.proofMeta}>Detected 14 Aug &middot; vercel.com/pricing</div>
            </div>
          </div>
          <div className={styles.proofFooter}>
            And 31 trivial edits that week we didn&rsquo;t send you: cookie banners, rotating
            testimonials, tracking scripts.
          </div>
        </div>
      </section>

      <section className={styles.howBand}>
        <div className={styles.how}>
          <h2 className={styles.sectionTitle}>How it works</h2>
          <div className={styles.howGrid}>
            {STEPS.map((step) => (
              <div key={step.n}>
                <div className={styles.stepNum}>{step.n}</div>
                <div className={styles.stepTitle}>{step.title}</div>
                <p className={styles.stepBody}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.pricing}>
        <h2 className={styles.pricingTitle}>Two plans</h2>
        <p className={styles.pricingSub}>
          Start free. Upgrade when you&rsquo;re watching more than one company.
        </p>
        <div className={styles.planGrid}>
          <div className={styles.plan}>
            <div className={styles.planName}>Free</div>
            <div className={styles.planPrice}>$0</div>
            <div className={styles.planFeatures}>
              <div>1 competitor</div>
              <div>3 pages</div>
              <div>Weekly email digest</div>
            </div>
            <ButtonLink
              href="/login?mode=signup"
              variant="secondary"
              full
              className={styles.planCta}
            >
              Start free
            </ButtonLink>
          </div>

          <div className={styles.planPro}>
            <div className={styles.planHead}>
              <div className={styles.planName}>Pro</div>
              <span className={styles.planBadge}>For 2&ndash;10 competitors</span>
            </div>
            <div className={styles.planPrice}>
              $19<span className={styles.planPer}>/month</span>
            </div>
            <div className={styles.planFeatures}>
              <div>10 competitors</div>
              <div>10 pages each</div>
              <div>Weekly email digest</div>
            </div>
            <ButtonLink href="/login?mode=signup" full className={styles.planCta}>
              Start free, upgrade later
            </ButtonLink>
          </div>
        </div>
      </section>

      <footer className={styles.footerBand}>
        <div className={styles.footer}>
          <span>Trailwatch</span>
          <span>Built for people with better things to check.</span>
        </div>
      </footer>
    </div>
  );
}
