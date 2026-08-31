import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/components/breadcrumbJsonLd";
import { CompareTable } from "@/components/CompareTable";
import {
  COMPARE,
  FAQ,
  LAST_REVIEWED,
  WHERE_TRAILWATCH_DIFFERS,
  WHERE_VISUALPING_FITS,
} from "./content";
import styles from "../compare.module.css";

export const metadata: Metadata = {
  title: "Visualping Alternative for Founders",
  description:
    "A Visualping alternative built for founders — TrailWatch tracks competitors and emails one plain-English digest a week. AI on every plan, flat pricing.",
  alternates: { canonical: "/compare/visualping-alternative" },
};

function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export default function VisualpingAlternativePage() {
  return (
    <>
      <JsonLd data={faqJsonLd()} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Compare", path: "/compare/visualping-alternative" },
          { name: "Visualping alternative", path: "/compare/visualping-alternative" },
        ])}
      />

      <SiteHeader />

      <main className={`${styles.main} ${styles.shell}`}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className={styles.sep} aria-hidden="true">
            ›
          </span>
          <span>Compare</span>
          <span className={styles.sep} aria-hidden="true">
            ›
          </span>
          <span className={styles.current}>Visualping alternative</span>
        </nav>

        <div className={styles.hero}>
          <div className={styles.eyebrow}>Comparison</div>
          <h1 className={styles.h1}>The Visualping alternative built for founders</h1>
          <p className={styles.lead}>
            Visualping is a solid general-purpose page-change monitor. TrailWatch is the
            founder-first take on competitor tracking: add your competitors, and get one
            plain-English digest a week on what actually changed — AI summaries on every plan,
            no dashboard to babysit.
          </p>
        </div>

        <CompareTable competitorName="Visualping" rows={COMPARE} />
        <p className={styles.reviewed}>
          Last reviewed: {LAST_REVIEWED}. Comparisons reflect each product&rsquo;s general
          positioning; competitor features and pricing can change — check their site for the
          latest.
        </p>

        <section className={styles.prose}>
          <h2 className={styles.h2}>{WHERE_VISUALPING_FITS.heading}</h2>
          <p className={styles.proseBody}>{WHERE_VISUALPING_FITS.body}</p>
        </section>

        <section className={styles.prose}>
          <h2 className={styles.h2}>{WHERE_TRAILWATCH_DIFFERS.heading}</h2>
          <p className={styles.proseBody}>{WHERE_TRAILWATCH_DIFFERS.body}</p>
        </section>

        <section className={styles.faq}>
          <h2 className={styles.h2}>Frequently asked questions</h2>
          <div className={styles.faqList}>
            {FAQ.map((item) => (
              <details key={item.q} className={styles.faqItem}>
                <summary className={styles.faqQ}>{item.q}</summary>
                <p className={styles.faqA}>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.cta}>
          <h2 className={styles.ctaHeading}>See what your competitors changed this week</h2>
          <p className={styles.ctaBody}>
            Add your competitors and TrailWatch watches their pricing, homepage, and changelog
            pages for you — daily — then emails one plain-English digest a week on what actually
            changed. AI summaries on every plan, even free.
          </p>
          <Link href="/login?mode=signup&src=compare-visualping" className={styles.ctaButton}>
            Start free — no card required
          </Link>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
