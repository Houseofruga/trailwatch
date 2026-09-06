"use server";

import { getOrCreatePageInsight } from "./generate";
import type { PageInsightState } from "./types";

// Called by the Competitors page's BaselinePanel (client) on mount. RLS scopes
// the read to the caller; generation is cached, so this is one LLM call per page.
export async function loadPageInsight(pageId: string): Promise<PageInsightState> {
  if (typeof pageId !== "string" || !pageId) return { status: "not-found" };
  return getOrCreatePageInsight(pageId);
}
