import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/components/breadcrumbJsonLd";
import { AuthorLine, Faq, MoreTools, ToolPage } from "../ToolParts";
import { ToolIcons } from "../toolIcons";
import styles from "../tools.module.css";
import { ShopifyChecker } from "./ShopifyChecker";

// Free tool T1 (SEO_PLAN.md, DESIGN 08 · Checker). The check runs in
// features/tools (cached a day per domain, rate limited per visitor).

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gettrailwatch.com";
const PATH = "/tools/shopify-store-checker";
const DESCRIPTION =
  "Free Shopify store checker: enter any website to see if it runs on Shopify, and how we can tell. No sign-up.";

export const metadata: Metadata = {
  title: { absolute: "Is this site on Shopify? Free Shopify store checker — TrailWatch" },
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: "Is this site on Shopify?", description: DESCRIPTION, url: PATH },
};

const SIGNS = [
  {
    icon: ToolIcons.doc,
    title: "A public catalog address",
    body: "Shopify stores publish their catalog at /products.json. Other platforms don’t use that address.",
  },
  {
    icon: ToolIcons.server,
    title: "Shopify’s server headers",
    body: "When a page loads, Shopify’s servers add their own labels to the response.",
  },
  {
    icon: ToolIcons.globe,
    title: "Files from Shopify’s CDN",
    body: "Shopify stores load images and scripts from Shopify’s file servers.",
  },
];

const FAQ = [
  {
    q: "Can a store hide that it uses Shopify?",
    a: "Partly. Some stores turn off their public catalog or put another service in front of Shopify. We look for several signs, so hiding one rarely changes the answer, but a well-hidden store can show as “doesn’t appear to use Shopify” or “couldn’t tell”.",
  },
  {
    q: "What does “public catalog” mean?",
    a: "Most Shopify stores list their products, prices and stock at /products.json, an address any visitor can open. When it’s public, TrailWatch can track every product, price and stock change. Some stores switch it off; for those, TrailWatch watches key pages like the homepage and sale page instead.",
  },
  {
    q: "Why does it say “couldn’t tell”?",
    a: "The site didn’t let us read its homepage, for example because it blocks automated visits or asks tools like ours not to read it. We respect that, so we don’t guess.",
  },
  {
    q: "Is this free?",
    a: "Yes. There’s no sign-up and nothing to install. If you run lots of checks in a minute, we’ll ask you to wait a moment before the next one.",
  },
];

export default function ShopifyStoreCheckerPage() {
  return (
    <ToolPage crumbs={[{ name: "Home", href: "/" }, { name: "Free tools", href: "/tools" }, { name: "Shopify store checker" }]}>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Free tools", path: "/tools" },
          { name: "Shopify store checker", path: PATH },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "SoftwareApplication",
              name: "Shopify store checker",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              url: `${SITE_URL}${PATH}`,
              description: DESCRIPTION,
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            },
            {
              "@type": "FAQPage",
              mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            },
          ],
        }}
      />

      <div className={styles.intro}>
        <h1 className={styles.h1}>Is this site on Shopify?</h1>
        <p className={styles.lead}>Enter any website to see if it runs on Shopify, and how we can tell.</p>
      </div>

      <ShopifyChecker />

      <div className={styles.sections}>
        <section className={styles.section}>
          <div>
            <h2 className={styles.h2}>How we check</h2>
            <p className={styles.sectionLead}>We look for three signs. One is usually enough; more makes the answer surer.</p>
          </div>
          <ul className={`${styles.card} ${styles.signs}`}>
            {SIGNS.map((s) => (
              <li key={s.title}>
                <span className={styles.tile}>{s.icon}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <Faq items={FAQ} />
        <MoreTools current="shopify-store-checker" />
        <AuthorLine />
      </div>
    </ToolPage>
  );
}
