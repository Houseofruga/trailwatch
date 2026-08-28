import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { TesterForm } from "./TesterForm";
import { FAQ, GUIDE } from "./content";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Free Robots.txt Tester & Validator",
  description:
    "Test whether any URL is allowed or blocked by a site's robots.txt for Googlebot, Bingbot, GPTBot and more. Applies Google's Allow/Disallow and wildcard rules. Free, no signup.",
  alternates: { canonical: "/tools/robots-txt-tester" },
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

export default function RobotsTesterPage() {
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
          <span className={styles.current}>Robots.txt Tester</span>
        </nav>

        <div className={styles.hero}>
          <div className={styles.eyebrow}>Free tool</div>
          <h1 className={styles.h1}>Robots.txt Tester</h1>
          <p className={styles.lead}>
            Check whether a URL is allowed or blocked by a site&rsquo;s robots.txt. Paste a
            URL, pick a crawler, and we&rsquo;ll apply Google&rsquo;s matching rules —
            Allow/Disallow precedence and the <code>*</code> and <code>$</code> wildcards —
            and show you the exact rule responsible.
          </p>
        </div>

        <TesterForm />

        <section className={styles.guide}>
          <h2 className={styles.h2}>How robots.txt rules work</h2>
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
          <h2 className={styles.ctaHeading}>Track competitor pages, not just their rules</h2>
          <p className={styles.ctaBody}>
            TrailWatch watches competitor pricing, homepage, and changelog pages for you —
            daily — and emails one plain-English digest a week on what actually changed. AI
            summaries on every plan, even free.
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
