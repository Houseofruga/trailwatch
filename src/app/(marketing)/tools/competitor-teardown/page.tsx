import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/components/breadcrumbJsonLd";
import { TeardownForm } from "./TeardownForm";
import { FAQ, GUIDE } from "./content";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Free AI Competitor Analysis Tool",
  description:
    "Paste a competitor's URL and get an instant AI teardown of their positioning, pricing tiers, and what to watch. Free, no signup — from TrailWatch.",
  alternates: { canonical: "/tools/competitor-teardown" },
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

export default function CompetitorTeardownPage() {
  return (
    <>
      <JsonLd data={faqJsonLd()} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Competitor Teardown", path: "/tools/competitor-teardown" },
        ])}
      />

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
          <span className={styles.current}>Competitor Teardown</span>
        </nav>

        <div className={styles.hero}>
          <div className={styles.eyebrow}>Free tool</div>
          <h1 className={styles.h1}>AI Competitor Teardown</h1>
          <p className={styles.lead}>
            Paste a competitor&rsquo;s URL and get an instant, plain-English read on their
            positioning, pricing tiers, and what&rsquo;s worth watching. No signup — a taste of
            what TrailWatch does every week.
          </p>
        </div>

        <TeardownForm />

        <section className={styles.guide}>
          <h2 className={styles.h2}>How to read a competitor teardown</h2>
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
          <h2 className={styles.ctaHeading}>Track competitors, don&rsquo;t just tear them down once</h2>
          <p className={styles.ctaBody}>
            TrailWatch watches competitor pricing, homepage, and changelog pages for you —
            daily — and emails one plain-English digest a week on what actually changed. AI
            summaries on every plan, even free.
          </p>
          <Link href="/login?mode=signup&src=teardown" className={styles.ctaButton}>
            Start free — no card required
          </Link>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
