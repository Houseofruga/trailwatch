import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { FinderForm } from "./FinderForm";
import { FAQ, GUIDE } from "./content";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Free Sitemap Finder & Checker",
  description:
    "Find and validate all sitemaps on any website instantly. Discover sitemaps from robots.txt and common paths, check validity, and count total URLs. Free, no signup.",
  alternates: { canonical: "/tools/sitemap-finder" },
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

export default function SitemapFinderPage() {
  return (
    <>
      <JsonLd data={faqJsonLd()} />

      <SiteHeader />

      <main className={`${styles.main} ${styles.shell}`}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span className={styles.sep} aria-hidden="true">
            ›
          </span>
          <span>Tools</span>
          <span className={styles.sep} aria-hidden="true">
            ›
          </span>
          <span className={styles.current}>Sitemap Finder</span>
        </nav>

        <div className={styles.hero}>
          <div className={styles.eyebrow}>Free tool</div>
          <h1 className={styles.h1}>Sitemap Finder &amp; Checker</h1>
          <p className={styles.lead}>
            Find and validate all the sitemaps on any website. Paste a URL and we&rsquo;ll
            check robots.txt and the common paths, expand any sitemap index, and count the
            total URLs.
          </p>
        </div>

        <FinderForm />

        <section className={styles.guide}>
          <h2 className={styles.h2}>How to find a website&rsquo;s sitemap</h2>
          {GUIDE.map((item) => (
            <div key={item.heading} className={styles.guideItem}>
              <h3 className={styles.guideHeading}>{item.heading}</h3>
              <p className={styles.guideBody}>{item.body}</p>
            </div>
          ))}
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
          <h2 className={styles.ctaHeading}>Track competitor pages, not just find them</h2>
          <p className={styles.ctaBody}>
            TrailWatch watches competitor pricing, homepage, and changelog pages for you —
            daily — and emails one plain-English digest a week on what actually changed.
            AI summaries on every plan, even free.
          </p>
          <Link href="/login?mode=signup" className={styles.ctaButton}>
            Start free — no card required
          </Link>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
