import { CATALOG_CONFIG } from "./config";
import type { CatalogProduct, CatalogVariant } from "./types";

export type CatalogEventType =
  | "product_launched"
  | "product_removed"
  | "price_changed"
  | "sale_started"
  | "sale_ended"
  | "sold_out"
  | "restocked"
  | "sitewide_sale_detected";

export type CatalogEvent = {
  type: CatalogEventType;
  // Null only for store-wide events (sitewide_sale_detected).
  productId: string | null;
  payload: Record<string, unknown>;
};

type DiffOptions = {
  // Removals are only inferred from a complete catalog.
  complete: boolean;
  sitewideSaleShare?: number;
  sitewideSaleMinProducts?: number;
};

const onSale = (v: CatalogVariant) => v.compareAtPrice !== null && v.compareAtPrice > v.price;
const pctOff = (v: CatalogVariant) =>
  v.compareAtPrice ? Math.round(((v.compareAtPrice - v.price) / v.compareAtPrice) * 100) : 0;
const pctChange = (from: number, to: number) => Math.round(((to - from) / from) * 1000) / 10;
const inStock = (p: CatalogProduct) => p.variants.some((v) => v.available);

function productInfo(p: CatalogProduct) {
  return {
    title: p.title,
    handle: p.handle,
    image: p.image,
    productType: p.productType,
    // The product's headline price: its cheapest variant.
    price: p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : null,
  };
}

// The variant a product-level event is described by: the biggest mover.
function headline<T>(items: T[], score: (item: T) => number): T {
  return items.reduce((best, item) => (score(item) > score(best) ? item : best));
}

/**
 * Compare two normalized catalogs of the same store and emit typed events
 * (SPEC.md §5 Phase 2). Pure — no I/O, no AI.
 *
 * Low-noise choices, all at the product level (a 6-size product changing
 * price is one event, described by its biggest mover):
 *  - A sale starting/ending moves the price too; that's reported as the sale,
 *    not also as price_changed.
 *  - sold_out / restocked mean the whole product (every variant) flipped;
 *    one size selling out is not an event.
 *  - Variant events need variant data on both sides — products outside the
 *    price-tracked subset (or not opened this check, in sitemap mode) only
 *    count for launches/removals.
 *  - When a sitewide sale is detected, the per-product sale_started events it
 *    explains are folded into it (with the biggest discounts as examples).
 */
export function diffCatalogs(prev: CatalogProduct[], next: CatalogProduct[], options: DiffOptions): CatalogEvent[] {
  const share = options.sitewideSaleShare ?? CATALOG_CONFIG.sitewideSaleShare;
  const minProducts = options.sitewideSaleMinProducts ?? CATALOG_CONFIG.sitewideSaleMinProducts;

  const prevById = new Map(prev.map((p) => [p.id, p]));
  const nextIds = new Set(next.map((p) => p.id));
  const events: CatalogEvent[] = [];
  const saleStarted: CatalogEvent[] = [];

  for (const product of next) {
    const before = prevById.get(product.id);
    if (!before) {
      events.push({ type: "product_launched", productId: product.id, payload: productInfo(product) });
      continue;
    }
    if (before.variants.length === 0 || product.variants.length === 0) continue;

    const beforeVariants = new Map(before.variants.map((v) => [v.id, v]));
    const pairs = product.variants.flatMap((v) => {
      const was = beforeVariants.get(v.id);
      return was ? [{ was, now: v }] : [];
    });

    const started = pairs.filter(({ was, now }) => !onSale(was) && onSale(now));
    const ended = pairs.filter(({ was, now }) => onSale(was) && !onSale(now));
    const saleMoves = new Set([...started, ...ended]);
    const repriced = pairs.filter((pair) => !saleMoves.has(pair) && pair.was.price !== pair.now.price);

    if (started.length) {
      const top = headline(started, ({ now }) => pctOff(now)).now;
      saleStarted.push({
        type: "sale_started",
        productId: product.id,
        payload: {
          ...productInfo(product),
          salePrice: top.price,
          compareAtPrice: top.compareAtPrice,
          pctOff: pctOff(top),
          variantsOnSale: started.length,
        },
      });
    }
    if (ended.length) {
      const top = headline(ended, ({ was }) => pctOff(was));
      events.push({
        type: "sale_ended",
        productId: product.id,
        payload: { ...productInfo(product), wasPrice: top.was.price, newPrice: top.now.price, variants: ended.length },
      });
    }
    if (repriced.length) {
      const top = headline(repriced, ({ was, now }) => Math.abs(pctChange(was.price, now.price)));
      events.push({
        type: "price_changed",
        productId: product.id,
        payload: {
          ...productInfo(product),
          oldPrice: top.was.price,
          newPrice: top.now.price,
          pctChange: pctChange(top.was.price, top.now.price),
          variants: repriced.length,
        },
      });
    }

    const wasInStock = inStock(before);
    const nowInStock = inStock(product);
    if (wasInStock && !nowInStock) {
      events.push({ type: "sold_out", productId: product.id, payload: productInfo(product) });
    } else if (!wasInStock && nowInStock) {
      events.push({ type: "restocked", productId: product.id, payload: productInfo(product) });
    }
  }

  if (options.complete) {
    for (const product of prev) {
      if (!nextIds.has(product.id)) {
        events.push({ type: "product_removed", productId: product.id, payload: productInfo(product) });
      }
    }
  }

  // Sitewide: enough of the in-stock catalog went on sale in this one check.
  const inStockCount = next.filter((p) => p.variants.length > 0 && inStock(p)).length;
  const nextById = new Map(next.map((p) => [p.id, p]));
  const discountedInStock = saleStarted.filter((e) => {
    const p = nextById.get(e.productId!);
    return p !== undefined && inStock(p);
  });
  const isSitewide =
    inStockCount > 0 &&
    discountedInStock.length >= minProducts &&
    discountedInStock.length / inStockCount >= share;

  if (isSitewide) {
    const discounts = discountedInStock.map((e) => e.payload.pctOff as number);
    events.push({
      type: "sitewide_sale_detected",
      productId: null,
      payload: {
        productsDiscounted: discountedInStock.length,
        inStockProducts: inStockCount,
        shareDiscounted: Math.round((discountedInStock.length / inStockCount) * 100),
        avgPctOff: Math.round(discounts.reduce((a, b) => a + b, 0) / discounts.length),
        maxPctOff: Math.max(...discounts),
        examples: [...discountedInStock]
          .sort((a, b) => (b.payload.pctOff as number) - (a.payload.pctOff as number))
          .slice(0, 5)
          .map((e) => e.payload),
      },
    });
  } else {
    events.push(...saleStarted);
  }

  return events;
}
