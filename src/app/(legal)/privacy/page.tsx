import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/components/breadcrumbJsonLd";
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
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Privacy Policy", path: "/privacy" },
        ])}
      />
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span className={styles.sep} aria-hidden="true">
          ›
        </span>
        <span>Legal</span>
        <span className={styles.sep} aria-hidden="true">
          ›
        </span>
        <span className={styles.current}>Privacy Policy</span>
      </nav>

      <h1 className={styles.title}>Privacy Policy</h1>
      <p className={styles.updated}>Last updated: October 1, 2026</p>

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
            <strong>Account data:</strong> your email address, an optional display name, your
            role if you choose to tell us during setup, and your plan.
          </li>
          <li>
            <strong>Stores you add:</strong> the website of your own store (optional) and the
            websites of the competitors you follow.
          </li>
          <li>
            <strong>Your settings:</strong> which alerts you want, an optional different
            address to send them to, your briefing time and time zone, and a Slack webhook
            address if you connect Slack.
          </li>
          <li>
            <strong>Store data:</strong> the public product catalogs (product names, prices,
            discounts, stock and image links) and a few public pages (such as the homepage,
            sale page and store policies) of the stores you add, the changes (&ldquo;moves&rdquo;)
            we detect, and short explanations we write about them. This is information about
            businesses, not about you, and it&rsquo;s shared by everyone who follows the same
            store.
          </li>
          <li>
            <strong>Homepage competitor finder:</strong> the company name or website you
            type in, to suggest competitors.
          </li>
          <li>
            <strong>Billing data:</strong> TrailWatch is free during the beta. When paid plans
            launch, payments will be handled by Paddle, our payment provider. We will receive
            your plan status and a customer reference, but we will not see or store your full
            card details.
          </li>
          <li>
            <strong>Basic technical data:</strong> standard logs needed to operate and secure
            the service, and usage counts (such as how many checks and AI requests each store
            and account uses) so we can keep costs and abuse in check.
          </li>
        </ul>
        <p className={styles.para}>
          We only fetch public, non-authenticated pages, we respect robots.txt, and we do not
          attempt to collect or store personal data found on the stores we track.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>2. How we use your data</h2>
        <ul className={styles.list}>
          <li>
            To provide the service: checking the stores you follow and detecting launches,
            price changes, sales, stock changes and page changes.
          </li>
          <li>
            To compare your competitors&rsquo; products and prices with your own store&rsquo;s,
            if you add it.
          </li>
          <li>
            To send your instant alerts (by email, or to Slack if you connect it), your Monday
            briefing, and essential service messages.
          </li>
          <li>To write short plain-English explanations of moves and your weekly briefing.</li>
          <li>To manage your plan and its limits.</li>
          <li>
            To keep the service secure and prevent abuse (for example, by refusing throwaway
            email addresses at sign-up), debug issues, and comply with the law.
          </li>
          <li>To understand who uses TrailWatch during the beta, using the role you give us.</li>
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
            <strong>Supabase</strong> — database and authentication (stores your account,
            settings and the store data).
          </li>
          <li>
            <strong>Vercel</strong> and <strong>Cloudflare</strong> — hosting, delivery,
            and security of the application.
          </li>
          <li>
            <strong>Resend</strong> — sending your alerts, Monday briefing and account emails.
          </li>
          <li>
            <strong>Groq</strong>, and <strong>Anthropic</strong> if we enable it — writing
            explanations and your briefing. We send them the moves we detected (public store
            data) and, for your briefing, the names and prices of your own comparable
            products. We do not send them your email address. Under their API terms, they do
            not use this data to train their models.
          </li>
          <li>
            <strong>Exa</strong> — powering the homepage &ldquo;find your competitors&rdquo;
            suggestions. When you use that tool, the company name or website you enter is sent
            to Exa to search the public web for likely competitors.
          </li>
          <li>
            <strong>Slack</strong> — only if you connect it: we post your alerts to the Slack
            webhook you give us.
          </li>
          <li>
            <strong>Paddle</strong> — payment processing as merchant of record, once paid
            plans launch.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>4. How long we keep it</h2>
        <p className={styles.para}>
          We keep your account data for as long as your account is active. When you delete
          your account, we permanently delete your account, your settings, the list of
          stores you follow, and your alerts and briefings — this is immediate and cannot be
          undone. Store data (public catalogs, pages and the moves detected on them) is not
          about you and is shared by everyone who follows the same store, so it is kept
          while others still follow that store. Residual copies may persist in encrypted
          backups for a short period (up to around 30 days) before those backups roll over.
          We may retain limited records where we are legally required to.
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
          We use only essential cookies and similar local storage — to keep you signed in,
          to remember the competitors you pick on the homepage before you sign up, and to operate the service
          securely. We do not use analytics, third-party advertising, or cross-site
          tracking cookies, so we do not need a cookie-consent banner. Our payment provider
          (Paddle) may set its own cookies during checkout, governed by its own privacy
          policy.
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
