import { buildFirstReport, type ReportItem } from "@/features/catalog/firstReport";
import type { CatalogProduct } from "@/features/catalog/types";
import { PREVIEW_CONFIG } from "./config";

// What one catalog read can honestly say (widget prompt Part 1). A single
// snapshot shows state, not change: "launched in the last 30 days", "on sale
// right now", "sold out right now", never "changed their prices".

export type PreviewItem = { title: string; price: number | null; image: string | null; compareAtPrice?: number | null; pctOff?: number };

export type FullPreview = {
  domain: string;
  name: string;
  productCount: number;
  /** False when the store has more products than a preview reads (shown as "1,000+"). */
  complete: boolean;
  launched: { count: number; items: PreviewItem[] };
  onSale: { count: number; avgPctOff: number | null; maxPctOff: number | null; items: PreviewItem[] };
  soldOut: { count: number; items: PreviewItem[] };
  readAt: string;
};

export type Finding = { kind: "launched" | "on_sale" | "sold_out"; count: number; text: string };

/** What an anonymous visitor sees: counts and one line per finding, no product names. */
export type Teaser = { domain: string; name: string; productCount: number; complete: boolean; findings: Finding[] };

const toItem = (i: ReportItem): PreviewItem => ({
  title: i.title,
  price: i.price,
  image: i.image,
  ...(i.compareAtPrice ? { compareAtPrice: i.compareAtPrice } : {}),
  ...(i.pctOff ? { pctOff: i.pctOff } : {}),
});

export function buildPreview(input: {
  domain: string;
  name: string;
  products: CatalogProduct[];
  complete: boolean;
  now?: Date;
}): FullPreview {
  const report = buildFirstReport(input.products, input.now);
  const pcts = report.onSaleNow.map((i) => i.pctOff ?? 0).filter((p) => p > 0);
  const n = PREVIEW_CONFIG.examples;
  return {
    domain: input.domain,
    name: input.name,
    productCount: report.stats.productCount,
    complete: input.complete,
    launched: { count: report.totals.recentlyLaunched, items: report.recentlyLaunched.slice(0, n).map(toItem) },
    onSale: {
      count: report.totals.onSaleNow,
      avgPctOff: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null,
      maxPctOff: pcts.length ? Math.max(...pcts) : null,
      items: report.onSaleNow.slice(0, n).map(toItem),
    },
    soldOut: { count: report.totals.soldOut, items: report.soldOut.slice(0, n).map(toItem) },
    readAt: (input.now ?? new Date()).toISOString(),
  };
}

const products = (count: number) => `${count.toLocaleString("en-US")} ${count === 1 ? "product" : "products"}`;

/** The teaser: one finding per group, empty groups skipped. */
export function teaserOf(full: FullPreview): Teaser {
  const findings: Finding[] = [];
  if (full.launched.count > 0) {
    findings.push({
      kind: "launched",
      count: full.launched.count,
      text: `Launched ${products(full.launched.count)} in the last ${PREVIEW_CONFIG.recentDays} days`,
    });
  }
  if (full.onSale.count > 0) {
    const off = full.onSale.maxPctOff;
    findings.push({
      kind: "on_sale",
      count: full.onSale.count,
      text: `${products(full.onSale.count)} on sale right now${off ? `, ${full.onSale.count === 1 ? "" : "up to "}${off}% off` : ""}`,
    });
  }
  if (full.soldOut.count > 0) {
    findings.push({ kind: "sold_out", count: full.soldOut.count, text: `${products(full.soldOut.count)} sold out right now` });
  }
  return { domain: full.domain, name: full.name, productCount: full.productCount, complete: full.complete, findings };
}
