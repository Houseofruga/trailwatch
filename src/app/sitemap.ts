import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://gettrailwatch.com";

/**
 * Public, indexable routes only. The authed app, auth screens, and API routes
 * are intentionally excluded (see robots.ts). Add /tools, /guides and /compare
 * pages here as they ship (see SEO_PLAN.md).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<{ path: string; priority: number }> = [
    { path: "/", priority: 1 },
    { path: "/tools", priority: 0.7 },
    { path: "/tools/shopify-store-checker", priority: 0.8 },
    { path: "/terms", priority: 0.3 },
    { path: "/privacy", priority: 0.3 },
    { path: "/refunds", priority: 0.3 },
  ];

  return routes.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority,
  }));
}
