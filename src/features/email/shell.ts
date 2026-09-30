// Shared chrome for the pivot's emails (instant alert, weekly briefing): the
// exact card, palette, dark mode, logo and footer of the shipped digest
// (features/digest/email.ts), so new emails look like TrailWatch without
// inventing a design. The inner layouts are placeholders until the owner's
// Claude Design email artboards land — then they're rebuilt 1:1 on this shell.
// Table-based + inline styles for Gmail/Outlook/Apple Mail; pure, no I/O.

export const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI','DM Sans',Helvetica,Arial,sans-serif";
export const MONO = "'Geist Mono',ui-monospace,'SF Mono','Roboto Mono','Courier New',monospace";

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

export function money(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

function renderLogo(siteUrl: string): string {
  const common = `width="132" height="29" alt="TrailWatch" style="border:0;outline:none;text-decoration:none;height:29px;width:132px;`;
  return `<a href="${escapeHtml(siteUrl)}" style="text-decoration:none;">
          <img src="${escapeHtml(siteUrl)}/email-logo-dark.png" class="tw-logo-light" ${common}display:block;">
          <!--[if !mso]><!-->
          <img src="${escapeHtml(siteUrl)}/email-logo-light.png" class="tw-logo-dark" ${common}display:none;max-height:0;overflow:hidden;mso-hide:all;">
          <!--<![endif]-->
        </a>`;
}

/** A section: uppercase eyebrow + rows of content. */
export function section(title: string, innerHtml: string): string {
  return `
  <tr><td style="padding:24px 30px 0;">
    <div class="tw-faint" style="font-family:${SANS};font-size:10.5px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#8b877e;margin-bottom:8px;">${escapeHtml(title)}</div>
    ${innerHtml}
  </td></tr>`;
}

/** One line item: a sentence, with an optional muted meta line under it. */
export function item(sentence: string, meta?: string): string {
  return `<div class="tw-rule" style="padding:10px 0 11px;border-bottom:1px solid #f2f0ea;">
      <div class="tw-ink2" style="font-family:${SANS};font-size:14.5px;line-height:1.55;color:#4a4740;">${escapeHtml(sentence)}</div>
      ${meta ? `<div class="tw-faint" style="font-family:${MONO};font-size:11.5px;color:#8b877e;margin-top:5px;">${escapeHtml(meta)}</div>` : ""}
    </div>`;
}

/** A paragraph of body copy. */
export function paragraph(text: string): string {
  return `<div class="tw-ink2" style="font-family:${SANS};font-size:14.5px;line-height:1.6;color:#4a4740;">${escapeHtml(text)}</div>`;
}

export function button(href: string, label: string): string {
  return `
  <tr><td style="padding:26px 30px 4px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td class="tw-btn" style="border:1px solid #1a1a17;padding:12px 22px;">
        <a href="${escapeHtml(href)}" class="tw-ink" style="font-family:${SANS};font-size:13.5px;font-weight:600;color:#1a1a17;text-decoration:none;display:block;white-space:nowrap;">${escapeHtml(label)} &rarr;</a>
      </td>
    </tr></table>
  </td></tr>`;
}

export type ShellInput = {
  siteUrl: string;
  subject: string;
  preheader: string;
  // Top-right mono label, e.g. "Week of Sep 29–Oct 5" or "Instant alert".
  eyebrow: string;
  headline: string;
  subline?: string;
  // <tr> rows (section(), button(), ...) placed between the header and footer.
  bodyRows: string;
  // Footer lines (already-escaped HTML allowed: links).
  footerHtml: string;
};

export function renderShell(input: ShellInput): string {
  const { siteUrl } = input;
  return `<!doctype html>
<html lang="en" style="margin:0;padding:0;">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(input.subject)}</title>
<!--[if mso]><style>* {font-family: Arial, sans-serif !important;}</style><![endif]-->
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  @media (prefers-color-scheme: dark) {
    .tw-bg      { background:#100f0b !important; }
    .tw-card    { background:#1b1b15 !important; border-color:#34332b !important; }
    .tw-ink     { color:#f3f1eb !important; }
    .tw-ink2    { color:#cdcabf !important; }
    .tw-faint   { color:#8c887e !important; }
    .tw-rule    { border-color:#2b2a22 !important; }
    .tw-hr      { background:#2b2a22 !important; border-color:#2b2a22 !important; }
    .tw-btn     { border-color:#4c4a41 !important; color:#f3f1eb !important; }
    .tw-logo-light { display:none !important; }
    .tw-logo-dark  { display:inline-block !important; max-height:none !important; overflow:visible !important; }
  }
  a { text-decoration:none; }
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
</style>
</head>
<body class="tw-bg" style="margin:0;padding:0;background:#f1efe9;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f1efe9;opacity:0;">${escapeHtml(input.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="tw-bg" style="background:#f1efe9;">
  <tr><td align="center" style="padding:30px 14px;">
    <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="tw-card" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e6e2da;">
  <tr><td style="padding:26px 30px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="vertical-align:middle;">${renderLogo(siteUrl)}</td>
      <td align="right" class="tw-faint" style="font-family:${MONO};font-size:11.5px;letter-spacing:0.02em;color:#8b877e;vertical-align:middle;">${escapeHtml(input.eyebrow)}</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:22px 30px 0;"><div class="tw-hr" style="height:1px;background:#ece9e2;font-size:0;line-height:0;">&nbsp;</div></td></tr>
  <tr><td style="padding:24px 30px 0;">
    <div class="tw-ink" style="font-family:${SANS};font-size:21px;line-height:1.3;font-weight:600;letter-spacing:-0.01em;color:#1a1a17;">${escapeHtml(input.headline)}</div>
    ${input.subline ? `<div class="tw-faint" style="font-family:${MONO};font-size:12px;letter-spacing:0.02em;color:#8b877e;margin:9px 0 0;">${escapeHtml(input.subline)}</div>` : ""}
  </td></tr>
  ${input.bodyRows}
  <tr><td style="padding:28px 30px 30px;">
    <div class="tw-hr" style="height:1px;background:#ece9e2;font-size:0;line-height:0;">&nbsp;</div>
    <div class="tw-faint" style="font-family:${SANS};font-size:11.5px;line-height:1.7;color:#8b877e;margin-top:16px;">${input.footerHtml}</div>
    <div class="tw-faint" style="font-family:${SANS};font-size:11px;line-height:1.6;color:#8b877e;margin-top:12px;">&copy; 2026 House of Ruga LLP</div>
  </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr>
</table>
</body>
</html>`;
}
