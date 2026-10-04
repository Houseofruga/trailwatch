// Pure parts of the categories read: no I/O.

export type StoreCategory = {
  handle: string;
  title: string;
  products: number;
  /** Null when the category was too big to count fully. */
  onSale: number | null;
};

/** Titles and product counts from a page of the store's public collections list. */
export function parseCollectionsList(text: string): { handle: string; title: string; products: number | null }[] {
  try {
    const list = (JSON.parse(text) as { collections?: unknown }).collections;
    if (!Array.isArray(list)) return [];
    return list.flatMap((c: { handle?: unknown; title?: unknown; products_count?: unknown }) =>
      typeof c.handle === "string" && c.handle
        ? [
            {
              handle: c.handle.toLowerCase(),
              title: typeof c.title === "string" ? c.title.trim() : "",
              products: typeof c.products_count === "number" ? c.products_count : null,
            },
          ]
        : [],
    );
  } catch {
    return [];
  }
}

/** Products on one page of a collection's products.json, and how many are on sale; null when it isn't one. */
export function countPage(text: string): { products: number; onSale: number } | null {
  try {
    const products = (JSON.parse(text) as { products?: unknown }).products;
    if (!Array.isArray(products)) return null;
    const onSale = products.filter((p: { variants?: unknown }) =>
      Array.isArray(p.variants)
        ? p.variants.some((v: { price?: unknown; compare_at_price?: unknown }) => {
            const price = Number(v.price);
            const was = Number(v.compare_at_price);
            return Number.isFinite(price) && Number.isFinite(was) && was > price;
          })
        : false,
    ).length;
    return { products: products.length, onSale };
  } catch {
    return null;
  }
}

type MenuLink = { handle: string; label: string };
type Listed = Map<string, { title: string; products: number | null }>;

/**
 * Which of the menu's collections to read. Menus link dozens (a mega-menu can
 * hold a hundred), so when the store publishes sizes we take the largest; when
 * it doesn't, the first ones in page order (the nav comes first). Collections
 * the store lists as empty are dropped.
 */
export function pickMenu(menu: MenuLink[], listed: Listed, max: number): MenuLink[] {
  if (listed.size === 0) return menu.slice(0, max);
  return menu
    .map((m, i) => ({ m, i, size: listed.get(m.handle)?.products ?? null }))
    .filter((x) => x.size !== 0)
    .sort((a, b) => (b.size ?? -1) - (a.size ?? -1) || a.i - b.i)
    .slice(0, max)
    .map((x) => x.m);
}

/** A menu link's text when it reads like a name: not a banner line or a "Shop now" button. */
export function cleanLabel(label: string): string {
  const text = label.trim();
  if (!text || text.length > 40 || /[→›»]/.test(text) || /^(shop|view|see|explore|discover)\b/i.test(text)) return "";
  return text;
}

/**
 * An internal prefix every title shares ("PLP Commercial - Sheets", "PLP
 * Commercial - Bath"), up to its last separator; "" when there isn't one.
 */
export function sharedPrefix(titles: string[]): string {
  if (titles.length < 2) return "";
  let prefix = titles[0];
  for (const t of titles) {
    while (prefix && !t.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  const cut = Math.max(prefix.lastIndexOf(" - "), prefix.lastIndexOf(": "), prefix.lastIndexOf(" | "));
  return cut > 0 ? prefix.slice(0, cut + (prefix[cut] === ":" ? 2 : 3)) : "";
}

/** The name to show: the store's own collection name, else the menu text, else the handle. */
export function categoryTitle(listedTitle: string | undefined, prefix: string, label: string, handle: string): string {
  const own = listedTitle && prefix && listedTitle.startsWith(prefix) ? listedTitle.slice(prefix.length).trim() : (listedTitle ?? "");
  return own || cleanLabel(label) || titleFromHandle(handle);
}

/** "throws-and-blankets" → "Throws and blankets", for a collection with no name we can read. */
export function titleFromHandle(handle: string): string {
  const words = handle.replace(/[-_]+/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : handle;
}

/** Largest first; ties keep menu order. */
export function sortCategories(list: StoreCategory[]): StoreCategory[] {
  return list.map((c, i) => ({ c, i })).sort((a, b) => b.c.products - a.c.products || a.i - b.i).map((x) => x.c);
}
