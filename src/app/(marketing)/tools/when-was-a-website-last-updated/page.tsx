import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { JsonLd } from "@/components/JsonLd";
import { CheckerForm } from "./CheckerForm";
import { FAQ, GUIDE } from "./content";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "When Was a Website Last Updated? Free Checker",
  description:
    "Paste any URL to check when a web page was last updated. Free tool that reads the Last-Modified header, meta tags, structured data, and sitemap — with honest confidence levels.",
  alternates: { canonical: "/tools/when-was-a-website-last-updated" },
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

export default function LastUpdatedToolPage() {
  return (
    <>
      <JsonLd data={faqJsonLd()} />

      <header className={`${styles.header} ${styles.shell}`}>
        <Link href="/" aria-label="TrailWatch home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.logo} src="/logo.svg" alt="TrailWatch" />
        </Link>
        <Link href="/login?mode=signup" className={styles.headerCta}>
          Start free
        </Link>
      </header>

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
          <span className={styles.current}>Last Updated Checker</span>
        </nav>

        <div className={styles.hero}>
          <div className={styles.eyebrow}>Free tool</div>
          <h1 className={styles.h1}>Last Updated Checker</h1>
          <p className={styles.lead}>
            Check when a website was last updated. Paste any public URL and we&rsquo;ll
            read every reliable signal — the Last-Modified header, modified-date meta
            tags, structured data, and the site&rsquo;s sitemap — and tell you how much
            to trust each one.
          </p>
        </div>

        <CheckerForm />

        <section className={styles.guide}>
          <h2 className={styles.h2}>How to check when a web page was last updated</h2>
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
          <h2 className={styles.ctaHeading}>Want to know the moment it changes?</h2>
          <p className={styles.ctaBody}>
            A one-time check tells you the past. TrailWatch watches competitor pages for
            you — daily — and emails one plain-English digest a week on what actually
            changed. AI summaries on every plan, even free.
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
