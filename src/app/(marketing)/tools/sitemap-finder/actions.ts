"use server";

import { headers } from "next/headers";
import { findSitemaps, type FinderResult } from "@/features/sitemapFinder/analyze";

export type FinderState =
  | { status: "ok"; result: FinderResult }
  | { status: "error"; message: string }
  | null;

// Best-effort, per-instance rate limit. No per-request money cost (no LLM), so
// a shared store isn't worth it yet — see BACKLOG.md.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
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
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}

export async function findSitemapsAction(
  _prev: FinderState,
  formData: FormData,
): Promise<FinderState> {
  const url = String(formData.get("url") ?? "");

  if (rateLimited(await clientIp())) {
    return { status: "error", message: "You're checking a lot of sites — give it a minute and try again." };
  }

  const result = await findSitemaps(url);
  if (!result.ok) return { status: "error", message: result.message };
  return { status: "ok", result: result.result };
}
