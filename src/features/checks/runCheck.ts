import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { extractMainText } from "./extract";
import { normalizeText } from "./normalize";
import { hashContent } from "./hash";
import { isMeaningfulChange } from "./noiseFilter";
import { fetchPageIfAllowed } from "./fetchPage";

export type CheckResult =
  | { status: "skipped-robots" }
  | { status: "fetch-error"; message: string }
  | { status: "unchanged" }
  | { status: "first-check" }
  | { status: "recorded"; meaningful: boolean };

// Excerpts are the raw normalized text for now, capped as a cheap safeguard —
// slice 4's LLM step replaces this with a real focused excerpt.
const EXCERPT_CAP = 4000;

/**
 * SPEC.md F3 steps 1-6, single page. Reads go through the caller's RLS-scoped
 * client (ownership enforced for free — an unowned pageId just isn't found).
 * Writes go through the service client — see runCheck's sibling doc comment
 * in lib/supabase/service.ts for why.
 */
export async function runCheckForPage(pageId: string): Promise<CheckResult> {
  const userClient = await createClient();

  const { data: page, error: pageError } = await userClient
    .from("pages")
    .select("id, url, latest_snapshot_id")
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
  const touchLastChecked = () =>
    service.from("pages").update({ last_checked_at: new Date().toISOString() }).eq("id", pageId);

  const fetched = await fetchPageIfAllowed(page.url);
  if (!fetched.ok) {
    await touchLastChecked();
    return fetched.reason === "robots"
      ? { status: "skipped-robots" }
      : { status: "fetch-error", message: fetched.message };
  }

  const normalized = normalizeText(extractMainText(fetched.html));
  const hash = hashContent(normalized);

  if (previousSnapshot && previousSnapshot.content_hash === hash) {
    await touchLastChecked();
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
    .update({ last_checked_at: new Date().toISOString(), latest_snapshot_id: newSnapshot.id })
    .eq("id", pageId);

  if (!previousSnapshot) {
    return { status: "first-check" };
  }

  const result = isMeaningfulChange(previousSnapshot.content_text, normalized);
  await service.from("changes").insert({
    page_id: pageId,
    from_snapshot_id: page.latest_snapshot_id,
    to_snapshot_id: newSnapshot.id,
    is_meaningful: result.meaningful,
    filter_reason: result.reason,
    excerpt_before: result.meaningful ? previousSnapshot.content_text.slice(0, EXCERPT_CAP) : null,
    excerpt_after: result.meaningful ? normalized.slice(0, EXCERPT_CAP) : null,
  });

  return { status: "recorded", meaningful: result.meaningful };
}
