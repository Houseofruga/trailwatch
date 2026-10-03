// The fixed product taxonomy (matching prompt A1). The classifier must pick from
// these; anything else becomes "other". Add subcategories here, never at runtime.

export const TAXONOMY = {
  skincare: ["cleanser", "toner", "serum", "moisturizer", "eye care", "sunscreen", "mask", "exfoliator", "face oil", "lip care", "body care", "skincare set"],
  haircare: ["shampoo", "conditioner", "hair treatment", "styling", "hair oil", "scalp care", "hair tools", "haircare set"],
  makeup: ["foundation", "concealer", "powder", "blush", "bronzer", "highlighter", "eyeshadow", "eyeliner", "mascara", "brows", "lipstick", "lip gloss", "makeup tools", "makeup set"],
  supplements: ["multivitamin", "vitamins", "protein", "collagen", "probiotics", "greens", "sleep", "energy", "beauty supplements", "gut health", "supplement bundle"],
  apparel: ["tops", "bottoms", "dresses", "outerwear", "activewear", "loungewear", "sleepwear", "underwear", "socks", "shoes", "accessories", "robes"],
  home: ["sheets", "duvet covers", "comforters", "duvet inserts", "quilts", "blankets", "pillows", "pillowcases", "pillow protectors", "mattress protectors", "mattress toppers", "mattresses", "towels", "bath mats", "shower curtains", "candles", "home fragrance", "decor", "kitchen", "table linens", "furniture", "laundry", "baby bedding"],
  pet: ["dog food", "cat food", "dog treats", "cat treats", "pet supplements", "calming", "toys", "beds", "grooming", "collars and leashes", "pet accessories"],
  "food & drink": ["coffee", "tea", "snacks", "pantry", "sauces", "beverages", "alcohol", "sweets", "baking", "meal kits"],
} as const;

export type Category = keyof typeof TAXONOMY | "other";

export const PACK_TYPES = ["single", "bundle", "kit", "travel size", "subscription"] as const;
export type PackType = (typeof PACK_TYPES)[number];

// Pack types that can be compared with each other (a bundle with a kit, never
// a bundle with a single).
export const PACK_GROUP: Record<PackType, string> = {
  single: "single",
  bundle: "multi",
  kit: "multi",
  "travel size": "travel",
  subscription: "subscription",
};

// Common names for a subcategory, so the model's wording still lands.
const SYNONYMS: Record<string, [string, string]> = {
  sham: ["home", "pillowcases"],
  "sham set": ["home", "pillowcases"],
  throw: ["home", "blankets"],
  "throw blanket": ["home", "blankets"],
  bathrobe: ["apparel", "robes"],
  robe: ["apparel", "robes"],
  "bath sheet": ["home", "towels"],
  washcloth: ["home", "towels"],
  "duvet cover set": ["home", "duvet covers"],
  "sheet set": ["home", "sheets"],
  "quilt set": ["home", "quilts"],
  tote: ["apparel", "accessories"],
  "tote bag": ["apparel", "accessories"],
  hat: ["apparel", "accessories"],
  diffuser: ["home", "home fragrance"],
  "room spray": ["home", "home fragrance"],
  detergent: ["home", "laundry"],
  "bleach alternative": ["home", "laundry"],
  "duvet set": ["home", "duvet covers"],
  clock: ["home", "decor"],
  "wall clock": ["home", "decor"],
};

const singular = (w: string) => w.replace(/(ies)$/, "y").replace(/(es|s)$/, "");
const norm = (s: string) => s.trim().toLowerCase().split(/\s+/).map(singular).join(" ");

/**
 * Keep a classifier answer only when it's in the taxonomy. Near misses snap to
 * the closest subcategory ("hand towels" → towels, "sheet set" → sheets); an
 * unknown category is recovered when the subcategory names exactly one.
 */
export function validClass(category: string, subcategory: string): { category: Category; subcategory: string } {
  const c = category.trim().toLowerCase();
  const s = norm(subcategory);
  const find = (subs: readonly string[]) =>
    subs.find((x) => norm(x) === s) ??
    subs.find((x) => s.split(" ").includes(norm(x)) || norm(x).split(" ").includes(s)) ??
    (s.length >= 4 ? subs.find((x) => s.includes(norm(x)) || norm(x).includes(s)) : undefined);
  if (c in TAXONOMY) {
    const hit = s ? find(TAXONOMY[c as keyof typeof TAXONOMY]) : undefined;
    if (hit) return { category: c as Category, subcategory: hit };
  }
  const syn = SYNONYMS[s] ?? SYNONYMS[s.split(" ").slice(-2).join(" ")] ?? SYNONYMS[s.split(" ").slice(-1)[0]];
  if (syn) return { category: syn[0] as Category, subcategory: syn[1] };
  // No usable category: accept a subcategory only one category has, trying the
  // product noun first ("bed blanket" → blankets, not pet beds).
  const unique = (match: (subs: readonly string[]) => string | undefined) => {
    const owners = Object.entries(TAXONOMY).flatMap(([cat, subs]) => {
      const hit = match(subs);
      return hit ? [{ category: cat as Category, subcategory: hit }] : [];
    });
    return owners.length === 1 ? owners[0] : null;
  };
  const noun = s.split(" ").at(-1) ?? "";
  const byNoun = noun ? unique((subs) => subs.find((x) => norm(x).split(" ").at(-1) === noun)) : null;
  if (byNoun) return byNoun;
  const byAny = s ? unique(find) : null;
  if (byAny) return byAny;
  return { category: "other", subcategory: "other" };
}
