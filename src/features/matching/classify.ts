import { z } from "zod";
import { callFastModel, type ModelCall } from "@/features/ai/fastModel";
import { CATALOG_CONFIG } from "@/features/catalog/config";
import type { CatalogProduct } from "@/features/catalog/types";
import { hashContent } from "@/features/checks/hash";
import { MATCHING_CONFIG } from "./config";
import { PACK_TYPES, TAXONOMY, validClass, type Category, type PackType } from "./taxonomy.config";

// A1: what each product is, derived once and cached (product_classes). Sizes
// are read by code (units.ts); the model only names category, use, key
// attributes and pack type.

export type ProductClass = {
  category: Category;
  subcategory: string;
  use: string;
  attributes: string[];
  packType: PackType;
};

/** Changes when anything the classifier reads changes; then it runs again. */
export function classInputHash(p: CatalogProduct): string {
  return hashContent(
    JSON.stringify([p.title, p.productType, p.tags, p.vendor, p.description ?? "", p.variants.map((v) => v.title)]),
  );
}

const NOT_MERCHANDISE = /\b(gift ?card|e-?gift|gift certificate|sample request|donation)\b/i;

/** Products that need no model call: gift cards and checkout add-ons are "other". */
export function obviousClass(p: CatalogProduct): ProductClass | null {
  if (NOT_MERCHANDISE.test(p.title) || CATALOG_CONFIG.helperProductPattern.test(p.title)) {
    return { category: "other", subcategory: "other", use: "", attributes: [], packType: "single" };
  }
  return null;
}

const TAXONOMY_TEXT = Object.entries(TAXONOMY)
  .map(([c, subs]) => `${c}: ${subs.join(", ")}`)
  .join("\n");

export const CLASSIFY_SYSTEM = `You sort products from online stores into a fixed taxonomy so comparable products from different brands can be matched.

Taxonomy (category: subcategories). Use these exact names; pick the closest subcategory (hand towels → towels, sheet set → sheets). Use "other" only when nothing in the taxonomy fits.
${TAXONOMY_TEXT}

For each product return:
- c: category, s: subcategory (from the taxonomy)
- u: primary use or benefit in 2-5 words, generic, no brand ("brightening serum", "calming chews for dogs", "linen sheet set")
- a: up to 4 key attributes that matter for comparison: main ingredient or material, format, target (dog, cat, men, women, baby) only if stated. No sizes, colors or prices.
- p: pack type, one of: ${PACK_TYPES.join(", ")}. "bundle" = several different products sold together; "kit" = a set meant to be used together; "travel size" = mini or travel version; a set of identical items (2 towels) is "single".

Use only what the text says. Do not guess.
Reply with JSON only: {"items":[{"i":0,"c":"","s":"","u":"","a":[],"p":""}]}`;

/** One product as the model sees it: short, and only what helps. */
export function classifyLine(i: number, p: CatalogProduct): string {
  const variants = [...new Set(p.variants.map((v) => v.title).filter((t) => t && t !== "Default Title"))].slice(0, 6);
  const parts = [
    `${i}. ${p.title}`,
    p.productType ? `type: ${p.productType}` : "",
    p.tags.length ? `tags: ${p.tags.slice(0, 8).join(", ")}` : "",
    variants.length ? `options: ${variants.join(" | ")}` : "",
    p.description ? `about: ${p.description.slice(0, MATCHING_CONFIG.descriptionChars)}` : "",
  ];
  return parts.filter(Boolean).join(" — ");
}

const reply = z.object({
  items: z.array(
    z.object({
      i: z.number().int(),
      c: z.string(),
      s: z.string(),
      u: z.string().default(""),
      a: z.array(z.string()).default([]),
      p: z.string().default("single"),
    }),
  ),
});

/** Model reply → classes by index. Invalid entries are dropped (they're retried later). */
export function parseClassReply(text: string, count: number): Map<number, ProductClass> {
  const out = new Map<number, ProductClass>();
  let json: unknown;
  try {
    json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  } catch {
    return out;
  }
  const parsed = reply.safeParse(json);
  if (!parsed.success) return out;
  for (const item of parsed.data.items) {
    if (item.i < 0 || item.i >= count) continue;
    const pack = (PACK_TYPES as readonly string[]).includes(item.p.trim().toLowerCase())
      ? (item.p.trim().toLowerCase() as PackType)
      : "single";
    out.set(item.i, {
      ...validClass(item.c, item.s),
      use: item.u.trim().toLowerCase().slice(0, 60),
      attributes: item.a.map((a) => a.trim().toLowerCase()).filter(Boolean).slice(0, 4),
      packType: pack,
    });
  }
  return out;
}

/**
 * Classify a batch. Invalid JSON is retried once; products still missing come
 * back absent and are tried again on a later tick. Throws on provider errors
 * (e.g. a rate limit) so the caller can stop for this tick.
 */
export async function classifyBatch(products: CatalogProduct[]): Promise<{ classes: Map<number, ProductClass>; calls: ModelCall[] }> {
  const user = products.map((p, i) => classifyLine(i, p)).join("\n");
  const calls: ModelCall[] = [];
  let classes = new Map<number, ProductClass>();
  for (let attempt = 0; attempt < 2 && classes.size < products.length; attempt++) {
    const res = await callFastModel(CLASSIFY_SYSTEM, user, 60 * products.length);
    if (!res) break;
    calls.push(res.call);
    const parsed = parseClassReply(res.text, products.length);
    if (parsed.size > classes.size) classes = parsed;
  }
  return { classes, calls };
}
