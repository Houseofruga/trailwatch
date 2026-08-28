"use server";

import { headers } from "next/headers";
import { testRobots, type TesterResult } from "@/features/robotsTester/analyze";

export type TesterState =
  | { status: "ok"; result: TesterResult }
  | { status: "error"; message: string }
  | null;

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

const ALLOWED_AGENTS = new Set([
  "Googlebot",
  "Bingbot",
  "*",
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
]);

export async function testRobotsAction(
  _prev: TesterState,
  formData: FormData,
): Promise<TesterState> {
  const url = String(formData.get("url") ?? "");
  const uaRaw = String(formData.get("userAgent") ?? "Googlebot");
  const userAgent = ALLOWED_AGENTS.has(uaRaw) ? uaRaw : "Googlebot";

  if (rateLimited(await clientIp())) {
    return { status: "error", message: "You're testing a lot of URLs — give it a minute and try again." };
  }

  const result = await testRobots(url, userAgent);
  if (!result.ok) return { status: "error", message: result.message };
  return { status: "ok", result: result.result };
}
