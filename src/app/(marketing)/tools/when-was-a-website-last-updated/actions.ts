"use server";

import { headers } from "next/headers";
import { safeFetch, sitemapLastmod } from "@/features/lastUpdated/fetch";
import { detectLastUpdated, type Confidence } from "@/features/lastUpdated/detect";

export type ResultSignal = {
  source: string;
  human: string; // formatted date, e.g. "March 14, 2026"
  iso: string;
  confidence: Confidence;
};

export type CheckResult = {
  finalUrl: string;
  bestGuess: ResultSignal | null;
  signals: ResultSignal[];
};

export type CheckState =
  | { status: "ok"; result: CheckResult }
  | { status: "error"; message: string }
  | null;

// Best-effort, per-instance rate limit. There's no per-request money cost
// (no LLM), so a shared store isn't worth it yet — see BACKLOG.md.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 15;
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

function formatHuman(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(iso));
}

export async function checkLastUpdated(
  _prev: CheckState,
  formData: FormData,
): Promise<CheckState> {
  const url = String(formData.get("url") ?? "");

  if (rateLimited(await clientIp())) {
    return { status: "error", message: "You're checking a lot of pages — give it a minute and try again." };
  }

  const fetched = await safeFetch(url);
  if (!fetched.ok) {
    return { status: "error", message: fetched.message };
  }

  const lastmod = await sitemapLastmod(fetched.finalUrl);
  const { signals, bestGuess } = detectLastUpdated({
    headers: fetched.headers,
    html: fetched.html,
    sitemapLastmod: lastmod,
  });

  const toResult = (s: NonNullable<typeof bestGuess>): ResultSignal => ({
    source: s.source,
    human: formatHuman(s.iso),
    iso: s.iso,
    confidence: s.confidence,
  });

  return {
    status: "ok",
    result: {
      finalUrl: fetched.finalUrl,
      bestGuess: bestGuess ? toResult(bestGuess) : null,
      signals: signals.map(toResult),
    },
  };
}
