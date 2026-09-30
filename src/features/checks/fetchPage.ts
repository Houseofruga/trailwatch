import { isPathAllowed } from "./robots";
import { safeFetch } from "@/features/lastUpdated/fetch";

// The check engine fetches user-supplied URLs on a schedule, server-side, and
// stores the response so it can be shown back in change excerpts. That makes it
// an SSRF + data-exfiltration target, so every fetch here goes through the same
// hardened `safeFetch` the public tools use: it resolves DNS and refuses private
// / internal hosts, re-validates every redirect hop, and caps the body size.
// (safeFetch lives under features/lastUpdated for now — the shared network layer.)

const USER_AGENT = "TrailwatchBot/1.0 (+https://gettrailwatch.com)";
const ROBOTS_MAX_BYTES = 512_000;

export type FetchResult =
  | { ok: true; html: string }
  | { ok: false; reason: "robots"; message: string }
  | { ok: false; reason: "fetch-error"; message: string; status?: number };

/** A site's robots.txt body, or null when there isn't a reachable one. */
export async function fetchRobotsTxt(origin: string): Promise<string | null> {
  const res = await safeFetch(`${origin}/robots.txt`, { maxBytes: ROBOTS_MAX_BYTES });
  return res.ok ? res.html : null;
}

/** Whether our bot may fetch `path` (pathname + query) under this robots.txt. */
export function robotsAllows(robotsTxt: string | null, path: string): boolean {
  // No reachable robots.txt (404, private/blocked host, network error) is the
  // common case → treat as allowed. An internal host is still refused when we
  // fetch the page itself, so this can't be used to reach one.
  return robotsTxt === null || isPathAllowed(robotsTxt, USER_AGENT, path);
}

async function checkRobots(origin: string, path: string): Promise<boolean> {
  return robotsAllows(await fetchRobotsTxt(origin), path);
}

export async function fetchPageIfAllowed(pageUrl: string): Promise<FetchResult> {
  let origin: string;
  let pathname: string;
  try {
    const url = new URL(pageUrl);
    origin = url.origin;
    pathname = url.pathname + url.search;
  } catch {
    return { ok: false, reason: "fetch-error", message: "Invalid URL" };
  }

  if (!(await checkRobots(origin, pathname))) {
    return { ok: false, reason: "robots", message: "Disallowed by robots.txt" };
  }

  const res = await safeFetch(pageUrl);
  if (!res.ok) {
    // reason "blocked" = private/internal host caught by the SSRF guard; "invalid-url"
    // / "fetch-error" = unreachable or bad. Either way it's a soft fetch-error so the
    // daily batch keeps going and this page simply doesn't capture this run. `status`
    // is present when the failure was a non-2xx response (e.g. 404), so callers can
    // flag a broken URL distinctly from a transient error.
    return { ok: false, reason: "fetch-error", message: res.message, status: res.status };
  }
  return { ok: true, html: res.html };
}
