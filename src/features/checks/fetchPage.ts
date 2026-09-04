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
  | { ok: false; reason: "fetch-error"; message: string };

async function checkRobots(origin: string, pathname: string): Promise<boolean> {
  const res = await safeFetch(`${origin}/robots.txt`, { maxBytes: ROBOTS_MAX_BYTES });
  // No reachable robots.txt (404, private/blocked host, network error) is the
  // common case → treat as allowed. An internal host is still refused when we
  // fetch the page itself below, so this can't be used to reach one.
  if (!res.ok) return true;
  return isPathAllowed(res.html, USER_AGENT, pathname);
}

export async function fetchPageIfAllowed(pageUrl: string): Promise<FetchResult> {
  let origin: string;
  let pathname: string;
  try {
    const url = new URL(pageUrl);
    origin = url.origin;
    pathname = url.pathname;
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
    // daily batch keeps going and this page simply doesn't capture this run.
    return { ok: false, reason: "fetch-error", message: res.message };
  }
  return { ok: true, html: res.html };
}
