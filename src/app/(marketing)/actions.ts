"use server";

import { headers } from "next/headers";
import { runFind } from "@/features/competitorFinder/find";
import type { FinderResult } from "@/features/competitorFinder/types";

export type FinderState =
  | { status: "ok"; result: FinderResult }
  | { status: "error"; message: string; kind: "no-results" | "rate-limited" }
  | null;

// Same shape as the teardown action: this endpoint may fetch a page AND call a
// paid model, so cap per-IP. Per-instance only — a shared store is a later
// concern (see BACKLOG.md).
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
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

export async function findCompetitorsAction(
  _prev: FinderState,
  formData: FormData,
): Promise<FinderState> {
  const company = String(formData.get("company") ?? "");

  if (rateLimited(await clientIp())) {
    return {
      status: "error",
      message: "That's a lot of lookups — give it a minute and try again.",
      kind: "rate-limited",
    };
  }

  const result = await runFind(company);
  if (!result.ok) return { status: "error", message: result.reason, kind: "no-results" };
  return { status: "ok", result: result.result };
}
