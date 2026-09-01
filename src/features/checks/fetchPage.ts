import { isPathAllowed } from "./robots";

const USER_AGENT = "TrailwatchBot/1.0 (+https://gettrailwatch.com)";
const TIMEOUT_MS = 10_000;

export type FetchResult =
  | { ok: true; html: string }
  | { ok: false; reason: "robots"; message: string }
  | { ok: false; reason: "fetch-error"; message: string };

async function checkRobots(origin: string, pathname: string): Promise<boolean> {
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // No robots.txt (404, or any non-200) is the common case — treat as allowed.
    if (!res.ok) return true;
    return isPathAllowed(await res.text(), USER_AGENT, pathname);
  } catch {
    // robots.txt itself failing to load (timeout, DNS, ...) shouldn't block
    // the real fetch — most sites don't serve one at all.
    return true;
  }
}

export async function fetchPageIfAllowed(pageUrl: string): Promise<FetchResult> {
  const url = new URL(pageUrl);

  const allowed = await checkRobots(url.origin, url.pathname);
  if (!allowed) {
    return { ok: false, reason: "robots", message: "Disallowed by robots.txt" };
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      return { ok: false, reason: "fetch-error", message: `HTTP ${res.status}` };
    }
    return { ok: true, html: await res.text() };
  } catch (err) {
    return {
      ok: false,
      reason: "fetch-error",
      message: err instanceof Error ? err.message : "Unknown fetch error",
    };
  }
}
