// Slack incoming webhooks: user-supplied outbound URLs, so only Slack's own
// webhook host is accepted (CLAUDE.md Security) — this is what keeps the
// endpoint from being turned into a request to an arbitrary/internal host.
const SLACK_WEBHOOK = /^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9]+\/[A-Za-z0-9]+\/[A-Za-z0-9]+$/;

export function isSlackWebhookUrl(url: string): boolean {
  return SLACK_WEBHOOK.test(url.trim());
}

export type SlackResult = { sent: true } | { sent: false; reason: string };

export async function postToSlack(webhookUrl: string, message: unknown): Promise<SlackResult> {
  if (!isSlackWebhookUrl(webhookUrl)) return { sent: false, reason: "not a Slack webhook URL" };
  try {
    const res = await fetch(webhookUrl.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    // Slack answers 200 "ok"; 404/410 mean the webhook was revoked or deleted.
    return res.ok ? { sent: true } : { sent: false, reason: `Slack returned HTTP ${res.status}` };
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : String(err) };
  }
}
