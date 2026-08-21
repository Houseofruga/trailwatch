import { createServiceClient } from "@/lib/supabase/service";
import { buildDigests, type RawUser, type UserDigest } from "./build";

// Runs privileged (service client) — the weekly job has no logged-in user, so
// it can't go through RLS. Pulls every user's competitors→pages→changes, then
// buildDigests (pure) filters to the last 7 days of meaningful changes and
// drops anyone with nothing to report.
export async function collectWeeklyDigests(now: number): Promise<UserDigest[]> {
  const service = createServiceClient();

  const { data, error } = await service
    .from("users")
    .select(
      "id, email, competitors ( name, pages ( label, url, changes ( summary, is_meaningful, detected_at ) ) )",
    );

  if (error) throw error;

  return buildDigests((data ?? []) as unknown as RawUser[], now);
}
