import { createServiceClient } from "@/lib/supabase/service";
import { collectWeeklyDigests } from "./queries";
import { renderDigest } from "./email";
import { getMailer } from "./mailer";

export type DigestRunResult = {
  usersWithChanges: number;
  sent: number;
  failed: number;
};

// The weekly digest job (SPEC.md F6). One user's failure — a bounce, a rate
// limit — must not stop the rest, so each send is isolated. last_digest_sent_at
// is stamped only on a successful send, so a failed one can be retried next run.
export async function runWeeklyDigest(now: number = Date.now()): Promise<DigestRunResult> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://trailwatch.houseofruga.com";
  const digests = await collectWeeklyDigests(now);
  const mailer = getMailer();
  const service = createServiceClient();

  let sent = 0;
  let failed = 0;

  for (const digest of digests) {
    try {
      const email = renderDigest(digest, siteUrl);
      const result = await mailer.send(digest.email, email);
      if (result.sent) {
        sent += 1;
        await service
          .from("users")
          .update({ last_digest_sent_at: new Date(now).toISOString() })
          .eq("id", digest.userId);
      } else {
        failed += 1;
        console.warn(`Digest not sent to ${digest.email}: ${result.reason}`);
      }
    } catch (err) {
      failed += 1;
      console.error(`Digest failed for ${digest.email}:`, err);
    }
  }

  return { usersWithChanges: digests.length, sent, failed };
}
