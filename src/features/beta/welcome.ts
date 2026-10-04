import type { SupabaseClient } from "@supabase/supabase-js";
import type { RenderedEmail } from "@/features/digest/email";
import { getMailer } from "@/features/digest/mailer";
import { escapeHtml } from "@/features/email/shell";
import { BETA_CONFIG as C, betaEndsLabel, bookingUrl } from "./config";

// The founder welcome email: plain and personal (no branded layout), sent once
// after sign-up. Replies go straight to the founder (the mailer's reply-to).

export function renderWelcomeEmail(opts: { founding: boolean; booking: string | null }): RenderedEmail {
  const lines: string[] = [
    "Hi there,",
    `I'm ${C.founderName}, the founder of TrailWatch. Thanks for joining the beta.`,
    ...(opts.founding
      ? [
          `You're one of our first ${C.foundingCap} beta members. That means up to ${C.baseDiscountPct + C.callsDiscountPct}% off for life when paid plans start on ${betaEndsLabel()}: ${C.baseDiscountPct}% is already yours, and ${C.callsDiscountPct}% more unlocks after ${C.callsNeeded} short feedback calls with me.`,
        ]
      : []),
    "A quick question: who do you compete with most? Just hit reply. This comes straight to me, and I read every one.",
    ...(opts.booking
      ? [`Or grab 20 minutes and I'll set up your competitors with you and walk you through what they did in the last 30 days: ${opts.booking}`]
      : []),
  ];
  const sign = [C.founderName, "Founder, TrailWatch"];
  const text = [...lines, sign.join("\n")].join("\n\n");
  const html = `<!doctype html><html><body style="margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#303030;background:#ffffff;">
<div style="max-width:560px;">
${lines
  .map((l) => {
    const linked = opts.booking ? escapeHtml(l).replace(escapeHtml(opts.booking), `<a href="${escapeHtml(opts.booking)}" style="color:#005bd3;">${escapeHtml(opts.booking)}</a>`) : escapeHtml(l);
    return `<p style="margin:0 0 16px 0;">${linked}</p>`;
  })
  .join("\n")}
<p style="margin:24px 0 0 0;">${escapeHtml(sign[0])}<br><span style="color:#616161;">${escapeHtml(sign[1])}</span></p>
</div></body></html>`;
  return { subject: "Welcome to TrailWatch (and a quick question)", html, text };
}

/**
 * Send the welcome once per user. The conditional update is the lock: only the
 * request that stamps `welcomed_at` sends, so a double confirm can't send twice.
 */
export async function sendWelcomeOnce(service: SupabaseClient, userId: string): Promise<void> {
  const { data } = await service
    .from("users")
    .update({ welcomed_at: new Date().toISOString() })
    .eq("id", userId)
    .is("welcomed_at", null)
    .select("email, is_founding_member");
  const user = data?.[0];
  if (!user?.email) return;
  const res = await getMailer().send(user.email, renderWelcomeEmail({ founding: !!user.is_founding_member, booking: bookingUrl() }));
  if (!res.sent) {
    // Let a later sign-in try again.
    await service.from("users").update({ welcomed_at: null }).eq("id", userId);
    console.warn(`Welcome email not sent to user ${userId}: ${res.reason}`);
  }
}
