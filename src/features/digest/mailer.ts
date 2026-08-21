import { Resend } from "resend";
import type { RenderedEmail } from "./email";

// The send seam. Same graceful-degradation shape as the summarizer: if no key
// is configured, the null mailer reports each send as skipped instead of
// throwing, so the digest job runs end-to-end in dev/preview without email set
// up. Swapping providers later is one new implementation of this interface.

export type SendResult = { sent: true } | { sent: false; reason: string };

export interface Mailer {
  send(to: string, email: RenderedEmail): Promise<SendResult>;
}

// From address is env-configurable. Resend requires a verified domain in
// production; onboarding@resend.dev works for testing to your own account email.
const DEFAULT_FROM = "Trailwatch <onboarding@resend.dev>";

function createResendMailer(apiKey: string): Mailer {
  const resend = new Resend(apiKey);
  const from = process.env.EMAIL_FROM || DEFAULT_FROM;

  return {
    async send(to, email) {
      const { error } = await resend.emails.send({
        from,
        to,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      if (error) return { sent: false, reason: error.message };
      return { sent: true };
    },
  };
}

const nullMailer: Mailer = {
  async send() {
    return { sent: false, reason: "email not configured (no RESEND_API_KEY)" };
  },
};

export function getMailer(): Mailer {
  const key = process.env.RESEND_API_KEY;
  return key ? createResendMailer(key) : nullMailer;
}
