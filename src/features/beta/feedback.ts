import type { SupabaseClient } from "@supabase/supabase-js";
import { getMailer } from "@/features/digest/mailer";
import { escapeHtml } from "@/features/email/shell";
import { BETA_CONFIG } from "./config";

// "Send feedback / request a feature": saved, and emailed to the founder with
// the user's address as reply-to, so answering is one click.

export type FeedbackKind = "feedback" | "feature";

export async function submitFeedback(
  service: SupabaseClient,
  user: { id: string; email: string },
  input: { kind: FeedbackKind; message: string; page?: string | null },
): Promise<boolean> {
  const message = input.message.trim().slice(0, 4000);
  if (!message) return false;
  const { error } = await service.from("feedback").insert({ user_id: user.id, kind: input.kind, message, page: input.page ?? null });
  if (error) return false;
  const label = input.kind === "feature" ? "Feature request" : "Feedback";
  await getMailer().send(
    BETA_CONFIG.founderEmail,
    {
      subject: `${label} from ${user.email}`,
      text: `${message}\n\n${user.email}${input.page ? ` · ${input.page}` : ""}`,
      html: `<p style="white-space:pre-wrap;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;">${escapeHtml(message)}</p><p style="color:#616161;font-family:sans-serif;font-size:13px;">${escapeHtml(user.email)}${input.page ? ` · ${escapeHtml(input.page)}` : ""}</p>`,
    },
    undefined,
    { replyTo: user.email },
  );
  return true;
}
