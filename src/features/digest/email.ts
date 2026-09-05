import type { UserDigest } from "./build";

// Pure render — no I/O, so the shape is unit-testable. Produces the subject and
// both an HTML and a plain-text body (some clients prefer text; Resend takes
// both). The product's whole promise is a low-noise, readable digest, so this
// is deliberately plain: one section per competitor, one line per change.

export type RenderedEmail = { subject: string; html: string; text: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function subjectFor(digest: UserDigest): string {
  const n = digest.changeCount;
  return `Your weekly digest — ${n} ${n === 1 ? "change" : "changes"}`;
}

export function renderDigest(
  digest: UserDigest,
  siteUrl: string,
  unsubscribeUrl?: string,
): RenderedEmail {
  const subject = subjectFor(digest);

  const textSections = digest.competitors.map((c) => {
    const lines = c.lines
      .map((l) => `  • [${l.pageLabel}] ${l.summary}\n    ${l.url}`)
      .join("\n");
    return `${c.name}\n${lines}`;
  });
  const text = [
    `Here's what changed across the pages you're tracking this week.`,
    ``,
    textSections.join("\n\n"),
    ``,
    `—`,
    `Manage your competitors: ${siteUrl}/dashboard`,
    unsubscribeUrl
      ? `Unsubscribe from the weekly digest: ${unsubscribeUrl}`
      : `Turn off the weekly digest in Settings: ${siteUrl}/settings`,
  ].join("\n");

  const htmlSections = digest.competitors
    .map((c) => {
      const items = c.lines
        .map(
          (l) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #ececec;">
            <div style="font-size:11px;letter-spacing:0.07em;text-transform:uppercase;color:#8a8780;">${escapeHtml(l.pageLabel)}</div>
            <div style="font-size:15px;line-height:1.5;color:#1c1b19;margin:3px 0 5px;">${escapeHtml(l.summary)}</div>
            <a href="${escapeHtml(l.url)}" style="font-size:13px;color:#5a7d0a;text-decoration:none;">View the page →</a>
          </td>
        </tr>`,
        )
        .join("");
      return `
      <h2 style="font-size:16px;font-weight:600;color:#1c1b19;margin:28px 0 6px;">${escapeHtml(c.name)}</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${items}</table>`;
    })
    .join("");

  const html = `<!doctype html>
<html>
<body style="margin:0;background:#f7f6f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f3;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e6e4df;">
        <tr><td style="padding:28px 28px 8px;">
          <div style="font-size:13px;font-weight:600;letter-spacing:-0.01em;color:#1c1b19;">Trailwatch</div>
          <p style="font-size:14px;color:#57544d;line-height:1.6;margin:14px 0 0;">Here's what changed across the pages you're tracking this week.</p>
          ${htmlSections}
        </td></tr>
        <tr><td style="padding:20px 28px 28px;border-top:1px solid #ececec;">
          <a href="${escapeHtml(siteUrl)}/dashboard" style="font-size:13px;color:#57544d;text-decoration:none;">Manage your competitors →</a>
          <div style="font-size:11px;color:#8a8780;margin-top:12px;">
            You get this because you track competitors on TrailWatch.
            <a href="${escapeHtml(unsubscribeUrl ?? `${siteUrl}/settings`)}" style="color:#8a8780;text-decoration:underline;">Unsubscribe</a>.
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
