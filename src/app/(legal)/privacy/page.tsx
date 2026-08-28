import type { Metadata } from "next";
import { BackLink } from "@/components/BackLink";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How TrailWatch, by House of Ruga LLP, collects, uses, and protects your data.",
  alternates: { canonical: "/privacy" },
};

const CONTACT = "trailwatch@houseofruga.com";

export default function PrivacyPage() {
  return (
    <>
      <BackLink href="/">Back to home</BackLink>

      <h1 className={styles.title}>Privacy Policy</h1>
      <p className={styles.updated}>Last updated: August 26, 2026</p>

      <p className={styles.lead}>
        This policy explains what data TrailWatch collects, why, and what you can do
        about it. TrailWatch is operated by House of Ruga LLP (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;), which is the data controller for your account information. We
        collect as little as we can to run the service.
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>1. Data we collect</h2>
        <ul className={styles.list}>
          <li>
            <strong>Account data:</strong> your email address, an optional display name,
            and your plan.
          </li>
          <li>
            <strong>What you ask us to monitor:</strong> the competitor names and public
            page URLs you add.
          </li>
          <li>
            <strong>Monitoring data:</strong> snapshots of the public page content at
            those URLs, and the change summaries we generate from them, so we can detect
            and describe changes over time.
          </li>
          <li>
            <strong>Billing data:</strong> handled by Paddle, our payment provider. We
            receive your plan status and a customer reference, but we do not see or store
            your full card details.
          </li>
          <li>
            <strong>Basic technical data:</strong> standard logs needed to operate and
            secure the service.
          </li>
        </ul>
        <p className={styles.para}>
          We only fetch public, non-authenticated pages, we respect robots.txt, and we do
          not attempt to collect or store personal data found on the pages we monitor.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>2. How we use your data</h2>
        <ul className={styles.list}>
          <li>To provide the service — checking your pages and detecting changes.</li>
          <li>To generate plain-English summaries of meaningful changes.</li>
          <li>To send you your digest emails and essential service messages.</li>
          <li>To manage your subscription, plan limits, and billing.</li>
          <li>To keep the service secure, debug issues, and comply with the law.</li>
        </ul>
        <p className={styles.para}>
          We do not sell your data, and we do not use it for third-party advertising.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>3. Service providers we share data with</h2>
        <p className={styles.para}>
          We rely on a small set of trusted providers (sub-processors) to run TrailWatch.
          They only process data on our behalf to deliver their part of the service:
        </p>
        <ul className={styles.list}>
          <li>
            <strong>Supabase</strong> — database and authentication (stores your account
            and monitoring data).
          </li>
          <li>
            <strong>Vercel</strong> and <strong>Cloudflare</strong> — hosting, delivery,
            and security of the application.
          </li>
          <li>
            <strong>Resend</strong> — sending your digest and transactional emails.
          </li>
          <li>
            <strong>Anthropic and/or Groq</strong> — generating change summaries. The
            public page content we monitor is sent to one of these providers for
            summarization. They do not use it to train their models on our behalf.
          </li>
          <li>
            <strong>Paddle</strong> — payment processing as merchant of record.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>4. How long we keep it</h2>
        <p className={styles.para}>
          We keep your account and monitoring data for as long as your account is active.
          When you delete your account, we permanently delete your account, competitors,
          pages, stored snapshots, and change history — this is immediate and cannot be
          undone. Residual copies may persist in encrypted backups for a short period
          (up to around 30 days) before those backups roll over. We may retain limited
          records where we are legally required to.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>5. Your rights</h2>
        <p className={styles.para}>
          Depending on where you live, you may have the right to access, correct, export,
          or delete your personal data, and to object to or restrict certain processing.
          You can update your display name and delete your account directly from your
          settings, or email us at {CONTACT} to exercise any of these rights. We will not
          discriminate against you for exercising them.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>6. Cookies</h2>
        <p className={styles.para}>
          We use only the cookies needed to keep you signed in and to operate the service
          securely. We do not use third-party advertising or cross-site tracking cookies.
          Our payment provider may set its own cookies during checkout, governed by its
          privacy policy.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>7. International transfers &amp; security</h2>
        <p className={styles.para}>
          Our providers may process data in countries other than yours. We take
          reasonable technical and organizational measures to protect your data, but no
          method of transmission or storage is completely secure, so we cannot guarantee
          absolute security.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>8. Children</h2>
        <p className={styles.para}>
          TrailWatch is not intended for anyone under 18, and we do not knowingly collect
          data from children.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>9. Changes to this policy</h2>
        <p className={styles.para}>
          We may update this policy as the service evolves. When we make material changes
          we will update the date above and, where appropriate, notify you by email.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>10. Contact</h2>
        <p className={styles.para}>
          Questions or requests about your privacy? Email us at{" "}
          <a className={styles.link} href={`mailto:${CONTACT}`}>
            {CONTACT}
          </a>
          .
        </p>
      </section>
    </>
  );
}
