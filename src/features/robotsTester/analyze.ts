// Fetch a site's robots.txt and test whether a given URL/path is allowed for a
// chosen user-agent. Reuses the SSRF-guarded fetch + validators.

import { safeFetch } from "../lastUpdated/fetch";
import { validateUrlInput } from "../lastUpdated/ssrf";
import { testPath, type Rule } from "./matcher";

const DISPLAY_CAP = 20_000;

export type TesterResult = {
  robotsUrl: string;
  robotsFound: boolean;
  robotsText: string;
  testedUrl: string;
  testedPath: string;
  userAgent: string;
  allowed: boolean;
  matched: Rule | null;
  groupAgent: string | null;
};

export async function testRobots(
  rawUrl: string,
  userAgent: string,
): Promise<{ ok: true; result: TesterResult } | { ok: false; message: string }> {
  const parsed = validateUrlInput(rawUrl);
  if (!parsed.ok) return { ok: false, message: parsed.reason };

  const url = parsed.url;
  const testedPath = `${url.pathname}${url.search}` || "/";
  const robotsUrl = `${url.origin}/robots.txt`;

  const res = await safeFetch(robotsUrl);

  // No robots.txt (404 or unreachable) = crawling is allowed by default.
  if (!res.ok) {
    return {
      ok: true,
      result: {
        robotsUrl,
        robotsFound: false,
        robotsText: "",
        testedUrl: url.toString(),
        testedPath,
        userAgent,
        allowed: true,
        matched: null,
        groupAgent: null,
      },
    };
  }

  const robotsText = res.html;
  const match = testPath(robotsText, userAgent, testedPath);

  return {
    ok: true,
    result: {
      robotsUrl,
      robotsFound: true,
      robotsText: robotsText.length > DISPLAY_CAP ? robotsText.slice(0, DISPLAY_CAP) + "\n…" : robotsText,
      testedUrl: url.toString(),
      testedPath,
      userAgent,
      allowed: match.allowed,
      matched: match.matched,
      groupAgent: match.groupAgent,
    },
  };
}
