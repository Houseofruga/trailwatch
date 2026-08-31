// Orchestrator for the AI Competitor Teardown: validate + extract the site,
// then hand the text to the configured provider. Mirrors the ok/message shape
// of the other tools' analyze modules (e.g. sitemapFinder/analyze).

import { extractSite } from "./extract";
import { getTeardownProvider } from "./index";
import type { TeardownResult } from "./types";

export async function runTeardown(
  rawUrl: string,
): Promise<{ ok: true; result: TeardownResult } | { ok: false; message: string }> {
  const extracted = await extractSite(rawUrl);
  if (!extracted.ok) return { ok: false, message: extracted.reason };

  const provider = getTeardownProvider();
  const outcome = await provider.analyze(extracted.site);
  if (!outcome.ok) return { ok: false, message: outcome.reason };

  return { ok: true, result: outcome.result };
}
