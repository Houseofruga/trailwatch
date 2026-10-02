"use server";

import { headers } from "next/headers";
import { checkShopify, type ShopifyCheck } from "./shopifyCheck";
import { storeSnapshot, type SnapshotResult } from "./storeSnapshot";

// Public tools fetch other sites on a visitor's behalf, so cap per IP. Per
// instance only, like the homepage finder (BACKLOG.md).
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
}

/** T1 "Is this site on Shopify?" (SEO_PLAN.md). */
export async function checkShopifyAction(domain: string): Promise<ShopifyCheck> {
  if (typeof domain !== "string" || domain.length > 300) return { ok: false, message: "Enter a website like dewlane.com." };
  if (rateLimited(await clientIp())) return { ok: false, message: "That's a lot of checks. Give it a minute and try again." };
  return checkShopify(domain);
}

/** T2 store snapshot and T3 sale checker (SEO_PLAN.md): the same catalog read. */
export async function storeSnapshotAction(domain: string): Promise<SnapshotResult> {
  if (typeof domain !== "string" || domain.length > 300) return { ok: false, message: "Enter a store like dewlane.com." };
  if (rateLimited(await clientIp())) return { ok: false, message: "That's a lot of checks. Give it a minute and try again." };
  return storeSnapshot(domain);
}
