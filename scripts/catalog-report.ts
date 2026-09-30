/* Read a store's full catalog and print the instant first report it would
   produce (pivot Phase 2) — network only, no database writes.

   Run:  npx tsx scripts/catalog-report.ts <domain> [--detail N]
   --detail caps how many product pages the sitemap fallback opens (default 10
   here, to keep a manual run quick). */

import { fetchRobotsTxt } from "../src/features/checks/fetchPage";
import { fetchShopifyCatalog, type FetchCatalogResult } from "../src/features/catalog/fetchCatalog";
import { fetchSitemapCatalog } from "../src/features/catalog/sitemapFallback";
import { buildFirstReport } from "../src/features/catalog/firstReport";
import { catalogPageFetcher, realSleep } from "../src/features/catalog/fetchCatalog";
import { probeStore } from "../src/features/stores/probeStore";

const money = (cents: number | null | undefined) => (cents == null ? "—" : `$${(cents / 100).toFixed(2)}`);

async function main() {
  const domain = process.argv[2];
  if (!domain) throw new Error("Usage: npx tsx scripts/catalog-report.ts <domain> [--detail N]");
  const detailIdx = process.argv.indexOf("--detail");
  const detail = detailIdx > 0 ? Number(process.argv[detailIdx + 1]) : 10;

  const probe = await probeStore(domain);
  if (!probe.ok) throw new Error(probe.message);
  if (probe.platform.platform !== "shopify") {
    console.log(`${probe.name}: not a Shopify store — no catalog to read (pages are watched instead).`);
    return;
  }

  const base = new URL(probe.pages.find((p) => p.kind === "homepage")?.url ?? `https://${probe.host}`).origin;
  const net = { fetchPage: catalogPageFetcher, sleep: realSleep };
  const started = Date.now();
  const fetched: FetchCatalogResult = probe.platform.productsJsonAvailable
    ? await fetchShopifyCatalog(base, net)
    : await fetchSitemapCatalog(base, await fetchRobotsTxt(base), { ...net, config: { sitemapDetailCap: detail } });
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  if (!fetched.ok) throw new Error(fetched.message);

  const { catalog } = fetched;
  const report = buildFirstReport(catalog.products);
  const s = report.stats;
  console.log(`\n${probe.name} — first report`);
  console.log(`source ${catalog.source} · ${fetched.pages} requests · ${secs}s · complete: ${catalog.complete}`);
  console.log(
    `${s.productCount} products · ${s.onSaleCount} on sale · ${s.soldOutCount} sold out · avg price ${money(s.avgPrice)}`,
  );

  console.log("\nRecently launched (last 30 days)");
  for (const i of report.recentlyLaunched) console.log(`  ${i.launchedAt!.slice(0, 10)}  ${money(i.price).padStart(8)}  ${i.title}`);
  if (!report.recentlyLaunched.length) console.log("  (none)");

  console.log("\nOn sale now (biggest discount first)");
  for (const i of report.onSaleNow)
    console.log(`  -${String(i.pctOff).padStart(2)}%  ${money(i.price).padStart(8)} (was ${money(i.compareAtPrice)})  ${i.title}`);
  if (!report.onSaleNow.length) console.log("  (none)");

  console.log("\nSold out");
  for (const i of report.soldOut) console.log(`  ${money(i.price).padStart(8)}  ${i.title}`);
  if (!report.soldOut.length) console.log("  (none)");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
