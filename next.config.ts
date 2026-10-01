import type { NextConfig } from "next";

// Founder-edition SEO pages, retired 2026-10-01 (no traffic; SEO_PLAN.md).
// Old links land on the homepage until the new tools/guides/compare pages ship.
const RETIRED = [
  "/1",
  "/tools/competitor-teardown",
  "/tools/when-was-a-website-last-updated",
  "/tools/sitemap-finder",
  "/tools/robots-txt-tester",
  "/compare/visualping-alternative",
  "/compare/crayon-alternative",
  "/compare/kompyte-alternative",
];

const nextConfig: NextConfig = {
  async redirects() {
    return RETIRED.map((source) => ({ source, destination: "/", permanent: true }));
  },
};

export default nextConfig;
