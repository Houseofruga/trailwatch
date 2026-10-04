import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconChevronDown, IconInfo } from "@/components/ui/icons";
import { AUTHORS } from "@/features/guides/authors";
import { guideDate } from "@/features/guides";
import type { Guide, GuideBlock } from "@/features/guides/types";
import { InlineToolCard } from "./InlineToolCard";
import styles from "./content.module.css";

// The public content template (DESIGN 14-content): the frame, breadcrumb, guide
// card, byline, article body, author card, FAQ and the closing call to action.

export type Crumb = { name: string; href?: string };

export function ContentPage({ children }: { children: React.ReactNode }) {
  return (
    <div className={`ui ${styles.page}`}>
      <SiteHeader />
      <main className={styles.main}>{children}</main>
      <SiteFooter />
    </div>
  );
}

export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
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
  );
}

export function GuideCard({ guide }: { guide: Guide }) {
  return (
    <section className={`${styles.card} ${styles.guideCard}`}>
      <article>
        <h3>
          <Link href={`/guides/${guide.slug}`}>{guide.title}</Link>
        </h3>
        <p className={styles.guideCardSummary}>{guide.cardSummary}</p>
        <p className={styles.guideCardMeta}>
          {guide.readMinutes} min read <span aria-hidden="true">·</span> {guideDate(guide.date)}
        </p>
      </article>
    </section>
  );
}

export function Byline({ guide }: { guide: Guide }) {
  const a = AUTHORS[guide.author];
  return (
    <div className={styles.byline}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small static portrait */}
      <img src={a.photo} alt="" className={styles.bylinePhoto} />
      <div className={styles.bylineText}>
        <p className={styles.bylineName}>
          <strong>{a.name}</strong>, founder of Trailwatch
        </p>
        <p className={styles.bylineMeta}>
          <time dateTime={guide.date}>{guideDate(guide.date)}</time> <span aria-hidden="true">·</span> {guide.readMinutes} min read
        </p>
      </div>
    </div>
  );
}

function Block({ block }: { block: GuideBlock }) {
  switch (block.type) {
    case "h2":
      return <h2 id={block.id}>{block.text}</h2>;
    case "h3":
      return <h3>{block.text}</h3>;
    case "p":
      return <p>{block.text}</p>;
    case "ol":
      return (
        <ol>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
    case "ul":
      return (
        <ul>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "tip":
      return (
        <div className={styles.tip}>
          <span className={styles.tipIcon}>
            <IconInfo size={20} />
          </span>
          <div className={styles.tipText}>
            <p className={styles.tipTitle}>Tip</p>
            <p>{block.text}</p>
          </div>
        </div>
      );
    case "code":
      return (
        <div className={styles.codeLine}>
          <code>{block.text}</code>
        </div>
      );
    case "table":
      return (
        <div role="region" aria-label={block.caption} tabIndex={0} className={`${styles.card} ${styles.tableWrap}`}>
          <table>
            <caption>{block.caption}</caption>
            <thead>
              <tr>
                {block.head.map((h) => (
                  <th key={h.label} scope="col" className={h.numeric ? styles.numeric : undefined}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, i) =>
                    i === 0 ? (
                      <th key={i} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={i} className={block.head[i]?.numeric ? styles.numeric : undefined}>
                        {cell}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "alertFigure":
      return (
        <figure className={styles.figure}>
          <div role="img" aria-label={`Example Trailwatch alert: ${block.store}. ${block.title}`} className={styles.figureFrame}>
            <div className={styles.figureGround}>
              <div className={styles.alertCard}>
                <div className={styles.alertHead}>
                  <span className={styles.alertAvatar} aria-hidden="true">
                    {block.store[0]}
                  </span>
                  <span className={styles.alertStore}>{block.store}</span>
                  <Badge tone="attention">High</Badge>
                  <span className={styles.alertWhen}>{block.when}</span>
                </div>
                <p className={styles.alertTitle}>{block.title}</p>
                <p className={styles.alertDetail}>{block.detail}</p>
              </div>
            </div>
          </div>
          <figcaption>{block.caption}</figcaption>
        </figure>
      );
    case "tool":
      return (
        <div className={styles.toolWrap}>
          <InlineToolCard />
        </div>
      );
  }
}

export function ArticleBody({ blocks }: { blocks: GuideBlock[] }) {
  return (
    <article className={styles.body}>
      {blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}
    </article>
  );
}

export function AuthorCard({ author }: { author: Guide["author"] }) {
  const a = AUTHORS[author];
  return (
    <div className={styles.authorWrap}>
      <section className={`${styles.card} ${styles.author}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- small static portrait */}
        <img src={a.photo} alt="" className={styles.authorPhoto} />
        <div className={styles.authorText}>
          <p className={styles.authorName}>{a.name}</p>
          {a.bio.map((line) => (
            <p key={line} className={styles.authorBio}>
              {line}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ContentFaq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <section id="faq" className={styles.faqSection}>
      <h2 className={styles.sectionTitle}>Questions</h2>
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

export function ClosingCta() {
  return (
    <div className={styles.ctaWrap}>
      <section className={`${styles.card} ${styles.cta}`}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Get alerted when a competitor makes a move</h2>
          <div className={styles.ctaButton}>
            <Button variant="primary" tall full href="/login?mode=signup">
              Join the beta
            </Button>
          </div>
          <p className={styles.ctaNote}>Free during the beta.</p>
        </div>
      </section>
    </div>
  );
}
