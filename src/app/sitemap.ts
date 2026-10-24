import type { MetadataRoute } from "next";
import { GUIDES } from "@/features/guides";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://gettrailwatch.com";

/**
 * Public, indexable routes only. The authed app, auth screens, and API routes
 * are intentionally excluded (see robots.ts). Add /tools, /guides and /compare
 * pages here as they ship (see SEO_PLAN.md).
 *
 * `updated` is the day the page's own content last changed, so Google can trust
 * it: change it when you change the page, not for site-wide tweaks like the
 * footer. Guides carry their own date.
 */
const PAGES: Array<{ path: string; priority: number; updated: string }> = [
  { path: "/", priority: 1, updated: "2026-10-07" },
  { path: "/tools", priority: 0.7, updated: "2026-10-04" },
  { path: "/tools/shopify-store-checker", priority: 0.8, updated: "2026-10-04" },
  { path: "/tools/store-snapshot", priority: 0.8, updated: "2026-10-04" },
  { path: "/tools/sale-checker", priority: 0.8, updated: "2026-10-04" },
  { path: "/tools/competitor-finder", priority: 0.8, updated: "2026-10-04" },
  { path: "/terms", priority: 0.3, updated: "2026-10-04" },
  { path: "/privacy", priority: 0.3, updated: "2026-10-04" },
  { path: "/refunds", priority: 0.3, updated: "2026-10-06" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const guides = GUIDES.map((g) => ({ path: `/guides/${g.slug}`, priority: 0.8, updated: g.date }));
  // The hub changes whenever a guide is added, so it takes the newest guide's date.
  const hub = { path: "/guides", priority: 0.7, updated: guides.map((g) => g.updated).sort().at(-1) ?? "2026-10-05" };
  const [home, ...rest] = PAGES;
  const legal = rest.filter((p) => !p.path.startsWith("/tools"));
  const tools = rest.filter((p) => p.path.startsWith("/tools"));

  return [home, ...tools, hub, ...guides, ...legal].map(({ path, priority, updated }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(`${updated}T00:00:00Z`),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority,
  }));
}
