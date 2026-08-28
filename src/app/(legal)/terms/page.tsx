import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing your use of TrailWatch, the competitor-tracking service by House of Ruga LLP.",
  alternates: { canonical: "/terms" },
};

const CONTACT = "trailwatch@houseofruga.com";

export default function TermsPage() {
  return (
    <>
      <BackLink href="/">Back to home</BackLink>

      <h1 className={styles.title}>Terms of Service</h1>
      <p className={styles.updated}>Last updated: August 26, 2026</p>

      <p className={styles.lead}>
        These terms govern your use of TrailWatch. TrailWatch is operated by House
        of Ruga LLP (&ldquo;House of Ruga&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;).
        By creating an account or using the service you agree to these terms. If you
        do not agree, please do not use TrailWatch.
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>1. What TrailWatch does</h2>
        <p className={styles.para}>
          TrailWatch lets you add public web page URLs — typically a competitor&rsquo;s
          pricing, homepage, or changelog — and checks them on a recurring basis. When
          it detects a meaningful change, it summarizes it in plain English and includes
          it in a periodic digest email. The service is provided on an &ldquo;as is&rdquo;
          and &ldquo;as available&rdquo; basis, and we may add, change, or remove features
          over time.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>2. Your account</h2>
        <p className={styles.para}>
          You need an account to use TrailWatch. You are responsible for keeping your
          login credentials secure and for all activity under your account. You must
          provide an accurate email address and be at least 18 years old, or the age of
          majority in your jurisdiction. Notify us promptly at {CONTACT} if you suspect
          unauthorized use of your account.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>3. Acceptable use</h2>
        <p className={styles.para}>You agree not to use TrailWatch to:</p>
        <ul className={styles.list}>
          <li>
            monitor pages that require a login, sit behind a paywall, or are otherwise
            not publicly accessible;
          </li>
          <li>
            break the law, infringe intellectual property, or violate the rights or
            privacy of others;
          </li>
          <li>
            circumvent, overload, or interfere with the service, our infrastructure, or
            the websites being monitored;
          </li>
          <li>
            resell, redistribute, or provide the service to third parties as your own.
          </li>
        </ul>
        <p className={styles.para}>
          TrailWatch only retrieves publicly available pages, respects robots.txt, and
          identifies itself with a descriptive User-Agent. You are responsible for
          ensuring the URLs you add are pages you are permitted to monitor.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>4. Plans, limits &amp; billing</h2>
        <p className={styles.para}>
          TrailWatch offers a free plan and a paid Pro plan, each with its own limits on
          the number of competitors and pages you can track. Paid subscriptions are
          billed through our payment provider, Paddle, which acts as the merchant of
          record for your purchase. Billing, cancellation, and refunds are described in
          our{" "}
          <a className={styles.link} href="/refunds">
            Refund Policy
          </a>
          .
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>5. Your content</h2>
        <p className={styles.para}>
          The URLs you add and the account details you provide remain yours. You grant us
          permission to fetch, process, and store snapshots of the public pages you ask us
          to monitor solely to operate the service for you — for example, to detect and
          summarize changes. We do not claim ownership of the third-party page content we
          retrieve on your behalf, and we do not store personal data found on those pages.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>6. Intellectual property</h2>
        <p className={styles.para}>
          TrailWatch, its branding, and its software are owned by House of Ruga LLP.
          These terms do not transfer any of our intellectual property to you. You may
          not copy, modify, reverse-engineer, or create derivative works from the service
          except as permitted by law.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>7. Third-party services &amp; websites</h2>
        <p className={styles.para}>
          TrailWatch monitors third-party websites we do not control and relies on
          third-party providers to operate. We are not responsible for the content,
          accuracy, or availability of the pages you monitor, nor for outages or changes
          in the services we depend on. Change summaries are generated with automated
          tools and may contain errors — treat them as a helpful signal, not a guarantee.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>8. Disclaimers &amp; limitation of liability</h2>
        <p className={styles.para}>
          To the maximum extent permitted by law, TrailWatch is provided without
          warranties of any kind, and House of Ruga LLP is not liable for any indirect,
          incidental, or consequential damages, or for any loss arising from missed
          changes, inaccurate summaries, or service interruptions. Our total liability for
          any claim relating to the service is limited to the amount you paid us in the
          three months before the claim arose. Nothing in these terms limits liability
          that cannot be limited under applicable law.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>9. Suspension &amp; termination</h2>
        <p className={styles.para}>
          You may stop using TrailWatch and delete your account at any time. We may
          suspend or terminate accounts that violate these terms or that we reasonably
          believe create legal or security risk. Deleting your account removes your data
          as described in our{" "}
          <a className={styles.link} href="/privacy">
            Privacy Policy
          </a>
          .
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>10. Changes to these terms</h2>
        <p className={styles.para}>
          We may update these terms as the service evolves. When we make material changes
          we will update the date above and, where appropriate, notify you by email.
          Continuing to use TrailWatch after a change means you accept the updated terms.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>11. Governing law</h2>
        <p className={styles.para}>
          These terms are governed by the laws of India, and the courts of India will have
          jurisdiction over any dispute, without prejudice to any mandatory consumer
          protections available to you where you live.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>12. Contact</h2>
        <p className={styles.para}>
          Questions about these terms? Email us at{" "}
          <a className={styles.link} href={`mailto:${CONTACT}`}>
            {CONTACT}
          </a>
          .
        </p>
      </section>
    </>
  );
}
