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
  WHERE_CRAYON_FITS,
  WHERE_TRAILWATCH_DIFFERS,
} from "./content";
import styles from "../compare.module.css";

export const metadata: Metadata = {
  title: "Crayon Alternative for Founders",
  description:
    "A Crayon alternative without the enterprise platform — TrailWatch tracks competitors and emails one plain-English digest a week. Self-serve, flat pricing.",
  alternates: { canonical: "/compare/crayon-alternative" },
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

export default function CrayonAlternativePage() {
  return (
    <>
      <JsonLd data={faqJsonLd()} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Compare", path: "/compare/crayon-alternative" },
          { name: "Crayon alternative", path: "/compare/crayon-alternative" },
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
          <span className={styles.current}>Crayon alternative</span>
        </nav>

        <div className={styles.hero}>
          <div className={styles.eyebrow}>Comparison</div>
          <h1 className={styles.h1}>The Crayon alternative built for founders</h1>
          <p className={styles.lead}>
            Crayon is a powerful enterprise competitive-intelligence platform. TrailWatch is the
            opposite end of the spectrum: no sales call, no platform to maintain — just add your
            competitors and get one plain-English digest a week on what actually changed.
          </p>
        </div>

        <CompareTable competitorName="Crayon" rows={COMPARE} />
        <p className={styles.reviewed}>
          Last reviewed: {LAST_REVIEWED}. Comparisons reflect each product&rsquo;s general
          positioning; competitor features and pricing can change — check their site for the
          latest.
        </p>

        <section className={styles.prose}>
          <h2 className={styles.h2}>{WHERE_CRAYON_FITS.heading}</h2>
          <p className={styles.proseBody}>{WHERE_CRAYON_FITS.body}</p>
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
          <h2 className={styles.ctaHeading}>Stay on top of competitors without a CI team</h2>
          <p className={styles.ctaBody}>
            Add your competitors and TrailWatch watches their pricing, homepage, and changelog
            pages for you — daily — then emails one plain-English digest a week on what actually
            changed. AI summaries on every plan, even free.
          </p>
          <Link href="/login?mode=signup&src=compare-crayon" className={styles.ctaButton}>
            Start free — no card required
          </Link>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
