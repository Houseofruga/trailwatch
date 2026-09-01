// Builds a schema.org BreadcrumbList for a tool page, matching the visible
// breadcrumb nav (Home › Tools › <name>). Render the result via <JsonLd>.
// SEO.md flagged adding this once /tools/* shipped.

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://gettrailwatch.com";

/**
 * @param items ordered crumbs; `path` is site-relative (e.g. "/tools/sitemap-finder").
 *   The last item is the current page.
 */
export function breadcrumbJsonLd(
  items: Array<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
