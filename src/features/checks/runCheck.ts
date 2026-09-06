import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { extractMainText } from "./extract";
import { normalizeText } from "./normalize";
import { hashContent } from "./hash";
import { isMeaningfulChange } from "./noiseFilter";
import { fetchPageIfAllowed } from "./fetchPage";
import { getSummarizer } from "@/features/summaries";

export type CheckResult =
  | { status: "skipped-robots" }
  | { status: "fetch-error"; message: string; httpStatus?: number }
  | { status: "unchanged" }
  | { status: "first-check" }
  | { status: "recorded"; meaningful: boolean; summarized?: boolean };

// Excerpts are the raw normalized text for now, capped as a cheap safeguard —
// slice 4's LLM step replaces this with a real focused excerpt.
const EXCERPT_CAP = 4000;

/**
 * SPEC.md F3 steps 1-6, single page. Reads go through `reader`: the manual
 * trigger passes nothing, so it defaults to the caller's RLS-scoped client
 * (ownership enforced for free — an unowned pageId just isn't found). The daily
 * cron has no logged-in user, so it passes the service client to read any page.
 * Writes always go through the service client — see the sibling doc comment in
 * lib/supabase/service.ts for why.
 */
export async function runCheckForPage(
  pageId: string,
  reader?: SupabaseClient,
): Promise<CheckResult> {
  const userClient = reader ?? (await createClient());

  const { data: page, error: pageError } = await userClient
    .from("pages")
    .select("id, url, label, latest_snapshot_id")
    .eq("id", pageId)
    .single();
  if (pageError || !page) throw new Error("Page not found.");

  let previousSnapshot: { content_hash: string; content_text: string } | null = null;
  if (page.latest_snapshot_id) {
    const { data: snapshot } = await userClient
      .from("snapshots")
      .select("content_hash, content_text")
      .eq("id", page.latest_snapshot_id)
      .single();
    previousSnapshot = snapshot ?? null;
  }

  const service = createServiceClient();
  // Every check stamps last_checked_at; `extra` also records the check outcome so
  // the UI can flag a page we can't reach (and clear the flag once it works again).
  const markChecked = (extra: Record<string, unknown> = {}) =>
    service
      .from("pages")
      .update({ last_checked_at: new Date().toISOString(), ...extra })
      .eq("id", pageId);
  const OK = { last_check_status: "ok", last_check_error: null };

  const fetched = await fetchPageIfAllowed(page.url);
  if (!fetched.ok) {
    if (fetched.reason === "robots") {
      // Robots-disallowed is a deliberate non-check, not a broken page — leave the
      // error state untouched.
      await markChecked();
      return { status: "skipped-robots" };
    }
    // A 4xx (usually 404) is a permanent "broken URL"; anything else is transient.
    const broken = fetched.status !== undefined && fetched.status >= 400 && fetched.status < 500;
    await markChecked({
      last_check_status: broken ? "broken" : "error",
      last_check_error: fetched.message,
    });
    return { status: "fetch-error", message: fetched.message, httpStatus: fetched.status };
  }

  const normalized = normalizeText(extractMainText(fetched.html));
  const hash = hashContent(normalized);

  if (previousSnapshot && previousSnapshot.content_hash === hash) {
    await markChecked(OK);
    return { status: "unchanged" };
  }

  const { data: newSnapshot, error: snapshotError } = await service
    .from("snapshots")
    .insert({ page_id: pageId, content_text: normalized, content_hash: hash })
    .select("id")
    .single();
  if (snapshotError || !newSnapshot) throw new Error("Couldn't save the new snapshot.");

  await service
    .from("pages")
    .update({
      last_checked_at: new Date().toISOString(),
      latest_snapshot_id: newSnapshot.id,
      ...OK,
    })
    .eq("id", pageId);

  if (!previousSnapshot) {
    return { status: "first-check" };
  }

  const result = isMeaningfulChange(previousSnapshot.content_text, normalized);

  // Only meaningful changes cost an LLM call. The summarizer may also decline
  // (belt-and-suspenders per SPEC.md F5), in which case we suppress the change.
  let summary: string | null = null;
  let meaningful = result.meaningful;
  let filterReason = result.reason;

  if (result.meaningful) {
    try {
      const summarized = await getSummarizer().summarize({
        label: page.label,
        oldText: previousSnapshot.content_text,
        newText: normalized,
      });
      if ("summary" in summarized) {
        summary = summarized.summary;
      } else {
        // Model vetoed — treat as not meaningful, no summary/excerpts.
        meaningful = false;
        filterReason = summarized.reason;
      }
    } catch {
      // Rate limit, network, etc. — still record the change, just unsummarized,
      // so one flaky API call doesn't lose a real detected change.
      filterReason = `${result.reason} (summary unavailable)`;
    }
  }

  await service.from("changes").insert({
    page_id: pageId,
    from_snapshot_id: page.latest_snapshot_id,
    to_snapshot_id: newSnapshot.id,
    is_meaningful: meaningful,
    filter_reason: filterReason,
    summary,
    excerpt_before: meaningful ? previousSnapshot.content_text.slice(0, EXCERPT_CAP) : null,
    excerpt_after: meaningful ? normalized.slice(0, EXCERPT_CAP) : null,
  });

  return { status: "recorded", meaningful, summarized: summary !== null };
}
