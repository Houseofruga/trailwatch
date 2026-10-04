import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/components/breadcrumbJsonLd";
import { Breadcrumb, ClosingCta, ContentPage, GuideCard } from "@/components/content/ContentParts";
import styles from "@/components/content/content.module.css";
import { GUIDE_GROUPS, GUIDES } from "@/features/guides";

// The guides hub (DESIGN 14a · /guides). Groups with no published guide are left out.

const DESCRIPTION = "Plain-English guides to watching your competitors, written for Shopify brand teams.";

export const metadata: Metadata = {
  title: { absolute: "Guides for Shopify brands — Trailwatch" },
  description: DESCRIPTION,
  alternates: { canonical: "/guides" },
  openGraph: { title: "Guides for Shopify brands", description: DESCRIPTION, url: "/guides" },
};

export default function GuidesHubPage() {
  const groups = GUIDE_GROUPS.map((g) => ({
    ...g,
    guides: GUIDES.filter((x) => x.group === g.id).sort((a, b) => b.date.localeCompare(a.date)),
  })).filter((g) => g.guides.length > 0);

  return (
    <ContentPage>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
        ])}
      />
      <div className={styles.hub}>
        <div className={styles.hubHead}>
          <Breadcrumb crumbs={[{ name: "Home", href: "/" }, { name: "Guides" }]} />
          <div className={styles.hubIntro}>
            <h1 className={styles.h1}>Guides</h1>
            <p className={styles.lead}>{DESCRIPTION}</p>
          </div>
        </div>

        {groups.map((g) => (
          <section key={g.id} className={styles.group}>
            <div>
              <h2 className={styles.sectionTitle}>{g.title}</h2>
              <p className={styles.sectionLead}>{g.lead}</p>
            </div>
            <div className={g.id === "black-friday" ? styles.grid3 : styles.grid2}>
              {g.guides.map((guide) => (
                <GuideCard key={guide.slug} guide={guide} />
              ))}
            </div>
          </section>
        ))}

        <ClosingCta />
      </div>
    </ContentPage>
  );
}
