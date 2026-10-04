import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/components/breadcrumbJsonLd";
import { AuthorLine, TOOLS, ToolCard, ToolPage } from "./ToolParts";
import styles from "./tools.module.css";

// The free tools hub (DESIGN 08 · /tools).

export const metadata: Metadata = {
  title: { absolute: "Free tools for Shopify brands — Trailwatch" },
  description: "Quick checks you can run on any store: see if a site is on Shopify, and more. Free, with no sign-up.",
  alternates: { canonical: "/tools" },
};

export default function ToolsHubPage() {
  return (
    <ToolPage crumbs={[{ name: "Home", href: "/" }, { name: "Free tools" }]}>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Free tools", path: "/tools" },
        ])}
      />
      <div className={styles.intro}>
        <h1 className={styles.h1}>Free tools for Shopify brands</h1>
        <p className={styles.lead}>Quick checks you can run on any store. Free, with no sign-up.</p>
      </div>
      <div className={`${styles.toolGrid} ${styles.toolGridTwo}`}>
        {TOOLS.map((t) => (
          <ToolCard key={t.slug} tool={t} cta />
        ))}
      </div>
      <div className={styles.sections}>
        <AuthorLine />
      </div>
    </ToolPage>
  );
}
