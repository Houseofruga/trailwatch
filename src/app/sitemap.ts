import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://trailwatch.houseofruga.com";

/**
 * Public, indexable routes only. The authed app, auth screens, and API routes
 * are intentionally excluded (see robots.ts). Add /tools/* and /compare/* here
 * as those pages ship (see SEO.md).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<{ path: string; priority: number }> = [
    { path: "/", priority: 1 },
    { path: "/tools/when-was-a-website-last-updated", priority: 0.8 },
    { path: "/tools/sitemap-finder", priority: 0.8 },
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
