import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { buildFirstReport, type FirstReport } from "./firstReport";
import { downloadSnapshot } from "./snapshots";

export type FirstReportState =
  | { status: "not-found" }
  // Added, catalog not read yet — the "building your first report" state.
  | { status: "building" }
  // Not Shopify: no catalog to report on (pages are watched instead).
  | { status: "no-catalog" }
  // The catalog read failed; it's retried automatically.
  | { status: "error"; message: string | null }
  | { status: "ready"; report: FirstReport; checkedAt: string | null };

/**
 * The instant first report for a store the caller follows, built from its
 * latest catalog snapshot. Ownership is enforced by RLS (stores are readable
 * only by followers); the snapshot itself lives in a private bucket, so it's
 * read with the service role once access is confirmed.
 */
export async function getFirstReport(storeId: string): Promise<FirstReportState> {
  const user = await createClient();
  const { data: store } = await user
    .from("stores")
    .select("platform, check_status, check_error, last_checked_at, latest_snapshot_id")
    .eq("id", storeId)
    .maybeSingle();
  if (!store) return { status: "not-found" };
  if (store.platform !== "shopify") return { status: "no-catalog" };

  if (!store.latest_snapshot_id) {
    return store.check_status === "error"
      ? { status: "error", message: store.check_error }
      : { status: "building" };
  }

  const service = createServiceClient();
  const { data: snap } = await service
    .from("catalog_snapshots")
    .select("storage_path")
    .eq("id", store.latest_snapshot_id)
    .single();
  const catalog = snap ? await downloadSnapshot(service, snap.storage_path) : null;
  if (!catalog) return { status: "error", message: "Couldn't read the catalog snapshot." };

  return { status: "ready", report: buildFirstReport(catalog.products), checkedAt: store.last_checked_at };
}
