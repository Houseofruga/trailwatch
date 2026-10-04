import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/components/breadcrumbJsonLd";
import { ArticleBody, AuthorCard, Breadcrumb, Byline, ClosingCta, ContentFaq, ContentPage, GuideCard } from "@/components/content/ContentParts";
import { TableOfContents, TableOfContentsMobile } from "@/components/content/TableOfContents";
import styles from "@/components/content/content.module.css";
import { getGuide, GUIDES, relatedGuides, tableOfContents } from "@/features/guides";
import { AUTHORS } from "@/features/guides/authors";

// A guide article (DESIGN 14b · /guides/[slug]). Long guides (4+ sections) get
// "On this page": sticky on the right on wide screens, a collapsible card on phones.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gettrailwatch.com";
const TOC_MIN_SECTIONS = 4;

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  if (!guide) return {};
  const path = `/guides/${guide.slug}`;
  return {
    title: { absolute: `${guide.title} — Trailwatch` },
    description: guide.summary,
    alternates: { canonical: path },
    openGraph: { type: "article", title: guide.title, description: guide.summary, url: path, publishedTime: guide.date },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();

  const path = `/guides/${guide.slug}`;
  const toc = tableOfContents(guide);
  const showToc = toc.length >= TOC_MIN_SECTIONS;
  const related = relatedGuides(guide);
  const author = AUTHORS[guide.author];

  return (
    <ContentPage>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: guide.crumb, path },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Article",
              headline: guide.title,
              description: guide.summary,
              datePublished: guide.date,
              dateModified: guide.date,
              url: `${SITE_URL}${path}`,
              author: { "@type": "Person", name: author.name, jobTitle: author.role },
              publisher: { "@type": "Organization", name: "Trailwatch", url: SITE_URL },
            },
            {
              "@type": "FAQPage",
              mainEntity: guide.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            },
          ],
        }}
      />

      <div className={styles.articleLayout}>
        <div className={styles.articleColumn}>
          <header className={styles.articleHead}>
            <Breadcrumb crumbs={[{ name: "Guides", href: "/guides" }, { name: guide.crumb }]} />
            <div className={styles.articleTitle}>
              <h1 className={styles.h1}>{guide.title}</h1>
              <p className={styles.lead}>{guide.summary}</p>
            </div>
            <Byline guide={guide} />
            {showToc ? <TableOfContentsMobile entries={toc} /> : null}
          </header>

          <ArticleBody blocks={guide.blocks} />
          <AuthorCard author={guide.author} />
          <ContentFaq items={guide.faq} />
        </div>
        {showToc ? <TableOfContents entries={toc} /> : null}
      </div>

      <div className={styles.after}>
        {related.length > 0 ? (
          <section className={styles.group}>
            <h2 className={styles.sectionTitle}>Related guides</h2>
            <div className={styles.grid3}>
              {related.map((g) => (
                <GuideCard key={g.slug} guide={g} />
              ))}
            </div>
          </section>
        ) : null}
        <ClosingCta />
      </div>
    </ContentPage>
  );
}
