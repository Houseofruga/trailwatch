import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/components/breadcrumbJsonLd";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconChevronDown } from "@/components/ui/icons";
import { AUTHORS } from "@/features/guides/authors";
import { ToolIcons } from "./toolIcons";
import styles from "./tools.module.css";

// The free-tool page template (DESIGN 08): every tool page and the /tools hub
// share this frame, the "More free tools" row, the FAQ and the author line.

export type ToolInfo = { slug: string; name: string; blurb: string; live: boolean; cta: string; icon: React.ReactNode };

/** Every free tool, live or coming soon (SEO_PLAN.md §1). */
export const TOOLS: ToolInfo[] = [
  {
    slug: "shopify-store-checker",
    name: "Shopify store checker",
    blurb: "See if any site runs on Shopify, and how we can tell.",
    live: true,
    cta: "Open the checker",
    icon: ToolIcons.bag,
  },
  {
    slug: "store-snapshot",
    name: "Store snapshot",
    blurb: "A store’s catalog size, sale share and price range at a glance.",
    live: true,
    cta: "Take a snapshot",
    icon: ToolIcons.chart,
  },
  {
    slug: "sale-checker",
    name: "Sale checker",
    blurb: "Find out if a store is running a sale right now, and how deep it goes.",
    live: true,
    cta: "Check for a sale",
    icon: ToolIcons.tag,
  },
  {
    slug: "competitor-finder",
    name: "Competitor finder",
    blurb: "Find the stores selling products like yours.",
    live: true,
    cta: "Find competitors",
    icon: ToolIcons.search,
  },
];

export function ToolPage({ crumbs, children }: { crumbs: { name: string; href?: string }[]; children: React.ReactNode }) {
  return (
    <div className={`ui ${styles.page}`}>
      <SiteHeader />
      <main className={styles.main}>
        <nav aria-label="Breadcrumb" className={styles.crumbs}>
          <ol>
            {crumbs.map((c) =>
              c.href ? (
                <li key={c.name}>
                  <Link href={c.href}>{c.name}</Link>
                  <span aria-hidden="true" className={styles.crumbSep}>
                    ›
                  </span>
                </li>
              ) : (
                <li key={c.name} aria-current="page" className={styles.crumbCurrent}>
                  {c.name}
                </li>
              ),
            )}
          </ol>
        </nav>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function ToolCard({ tool, cta }: { tool: ToolInfo; cta?: boolean }) {
  const href = `/tools/${tool.slug}`;
  return (
    <section className={`${styles.card} ${styles.toolCard}`}>
      <div className={styles.toolCardHead}>
        <span className={styles.tile}>{tool.icon}</span>
        {tool.live ? null : <Badge>Coming soon</Badge>}
      </div>
      <h3>{tool.live ? <Link href={href}>{tool.name}</Link> : tool.name}</h3>
      <p className={styles.toolCardBody}>{tool.blurb}</p>
      {cta && tool.live ? (
        <div>
          <Button variant="primary" href={href}>
            {tool.cta}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

export function MoreTools({ current }: { current: string }) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.h2}>More free tools</h2>
        <Link href="/tools">All free tools</Link>
      </div>
      <div className={styles.toolGrid}>
        {TOOLS.filter((t) => t.slug !== current).map((t) => (
          <ToolCard key={t.slug} tool={t} />
        ))}
      </div>
    </section>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.h2}>Questions</h2>
      <div className={`${styles.card} ${styles.faq}`}>
        {items.map((item, i) => (
          <details key={item.q} open={i === 0}>
            <summary>
              {item.q}
              <IconChevronDown />
            </summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function AuthorLine() {
  const a = AUTHORS.chandan;
  return (
    <p className={styles.author}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small static portrait */}
      <img src={a.photo} alt="" />
      <span>
        Built by <strong>{a.name}</strong>, founder of Trailwatch
      </span>
    </p>
  );
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gettrailwatch.com";

/**
 * A whole tool page (DESIGN 08 template): breadcrumb, title, the tool, "How
 * it works", FAQ, more tools and the author line, plus breadcrumb, app and FAQ
 * structured data.
 */
export function ToolLanding({
  slug,
  h1,
  lead,
  description,
  how,
  faq,
  children,
}: {
  slug: string;
  h1: string;
  lead: string;
  description: string;
  how: { title: string; lead: string; items: { icon: React.ReactNode; title: string; body: string }[] };
  faq: { q: string; a: string }[];
  children: React.ReactNode;
}) {
  const tool = TOOLS.find((t) => t.slug === slug)!;
  const path = `/tools/${slug}`;
  return (
    <ToolPage crumbs={[{ name: "Home", href: "/" }, { name: "Free tools", href: "/tools" }, { name: tool.name }]}>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Free tools", path: "/tools" },
          { name: tool.name, path },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "SoftwareApplication",
              name: tool.name,
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              url: `${SITE_URL}${path}`,
              description,
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            },
            {
              "@type": "FAQPage",
              mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            },
          ],
        }}
      />

      <div className={styles.intro}>
        <h1 className={styles.h1}>{h1}</h1>
        <p className={styles.lead}>{lead}</p>
      </div>

      {children}

      <div className={styles.sections}>
        <section className={styles.section}>
          <div>
            <h2 className={styles.h2}>{how.title}</h2>
            <p className={styles.sectionLead}>{how.lead}</p>
          </div>
          <ul className={`${styles.card} ${styles.signs}`}>
            {how.items.map((s) => (
              <li key={s.title}>
                <span className={styles.tile}>{s.icon}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <Faq items={faq} />
        <MoreTools current={slug} />
        <AuthorLine />
      </div>
    </ToolPage>
  );
}
