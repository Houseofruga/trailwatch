import { createServiceClient } from "@/lib/supabase/service";
import { runCheckForPage } from "./runCheck";

export type DailyCheckResult = {
  pages: number;
  changesRecorded: number;
  errors: number;
};

// The daily check job (SPEC.md F3 / build-order slice 7). Runs the check engine
// across every active page. No logged-in user here, so reads go through the
// service client. One page's failure — a fetch timeout, a bad URL — must not
// stop the batch, so each check is isolated.
export async function runDailyChecks(): Promise<DailyCheckResult> {
  const service = createServiceClient();

  const { data: pages, error } = await service
    .from("pages")
    .select("id")
    .eq("is_active", true);
  if (error) throw error;

  let changesRecorded = 0;
  let errors = 0;

  for (const page of pages ?? []) {
    try {
      const result = await runCheckForPage(page.id, service);
      if (result.status === "recorded" && result.meaningful) changesRecorded += 1;
    } catch (err) {
      errors += 1;
      console.error(`Daily check failed for page ${page.id}:`, err);
    }
  }

  return { pages: pages?.length ?? 0, changesRecorded, errors };
}
