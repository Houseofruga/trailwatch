"use server";

import { headers } from "next/headers";
import { runTeardown } from "@/features/competitorTeardown/analyze";
import type { TeardownResult } from "@/features/competitorTeardown/types";

export type TeardownState =
  | { status: "ok"; result: TeardownResult }
  | { status: "error"; message: string }
  | null;

// Tighter than the no-LLM tools: this endpoint fetches pages AND calls a paid
// model, so per-request cost is real. Per-instance limit only — a shared store
// is a later concern (see BACKLOG.md).
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 4;
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

export async function teardownAction(
  _prev: TeardownState,
  formData: FormData,
): Promise<TeardownState> {
  const url = String(formData.get("url") ?? "");

  if (rateLimited(await clientIp())) {
    return {
      status: "error",
      message: "You're running a lot of teardowns — give it a minute and try again.",
    };
  }

  const result = await runTeardown(url);
  if (!result.ok) return { status: "error", message: result.message };
  return { status: "ok", result: result.result };
}
