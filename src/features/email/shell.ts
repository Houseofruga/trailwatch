// Shared layout for the instant alert and the Monday briefing, built from the
// owner's email artboards (E1, E2): grey page, brand row, white cards, one
// dark button, a centred footer. Table-based with inline styles for
// Gmail/Outlook/Apple Mail; one media query drops the padding to 16px on
// phones (the 375 artboards). Pure, no I/O.

export const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

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

const INK = "#303030";
const INK_2 = "#4a4a4a";
const SUBDUED = "#616161";
const RULE = "#ebebeb";

/** A card: white (default) or the grey "one move" card. `inner` is HTML. */
export function card(inner: string, tone: "white" | "grey" = "white"): string {
  const bg = tone === "grey" ? "#f3f3f3" : "#ffffff";
  return `<tr><td style="padding:0 0 16px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${bg};border:1px solid #e3e3e3;border-radius:10px;border-collapse:separate;">
    <tr><td class="tw-card" style="padding:24px;font-family:${SANS};color:${INK};">${inner}</td></tr>
  </table>
</td></tr>`;
}

/** Small uppercase heading inside a card ("What you could do", "Top moves"). */
export function eyebrow(text: string, dark = false): string {
  return `<p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:${dark ? INK : SUBDUED};text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(text)}</p>`;
}

export function heading(text: string): string {
  return `<h1 style="margin:0 0 8px 0;font-size:22px;line-height:1.3;font-weight:700;color:${INK};">${escapeHtml(text)}</h1>`;
}

export function paragraph(text: string, opts: { size?: number; muted?: boolean; bold?: boolean; margin?: string } = {}): string {
  return `<p style="margin:${opts.margin ?? "0"};font-size:${opts.size ?? 15}px;line-height:1.55;color:${opts.muted ? INK_2 : INK};${opts.bold ? "font-weight:600;" : ""}">${escapeHtml(text)}</p>`;
}

const BADGE: Record<"high" | "normal" | "low", { label: string; bg: string; ink: string }> = {
  high: { label: "High", bg: "#ffeb78", ink: "#4f4700" },
  normal: { label: "Normal", bg: "#d5ebff", ink: "#003a5a" },
  low: { label: "Low", bg: "#ebebeb", ink: SUBDUED },
};

export function badge(priority: "high" | "normal" | "low"): string {
  const b = BADGE[priority];
  return `<span style="display:inline-block;padding:2px 8px;border-radius:6px;background:${b.bg};color:${b.ink};font-size:12px;font-weight:700;line-height:18px;">${b.label}</span>`;
}

/** Rows with a top rule (product lists). Cells are HTML. */
export function rows(items: { left: string; right?: string }[]): string {
  const cell = `padding:8px 0;border-top:1px solid ${RULE};font-size:14px;line-height:1.45;`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${items
    .map(
      (i) =>
        `<tr><td style="${cell}color:${INK};">${i.left}</td>${
          i.right !== undefined ? `<td align="right" style="${cell}font-weight:700;white-space:nowrap;padding-left:12px;">${i.right}</td>` : ""
        }</tr>`,
    )
    .join("")}</table>`;
}

/** The light-grey "Compared with yours" box. */
export function note(label: string, text: string): string {
  return `<div style="margin-top:16px;padding:12px;border-radius:8px;background:#f7f7f7;border:1px solid ${RULE};font-size:14px;line-height:1.5;color:${INK};"><strong>${escapeHtml(label)}</strong> ${escapeHtml(text)}</div>`;
}

export function link(href: string, text: string, opts: { underline?: boolean; color?: string } = {}): string {
  return `<a href="${escapeHtml(href)}" style="color:${opts.color ?? "#005bd3"};${opts.underline ? "text-decoration:underline;text-underline-offset:2px;" : "text-decoration:none;"}">${escapeHtml(text)}</a>`;
}

export function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="background:${INK};border:1px solid #000000;border-radius:8px;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 22px;font-family:${SANS};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
    </td>
  </tr></table>`;
}

export type ShellInput = {
  siteUrl: string;
  subject: string;
  preheader: string;
  /** After the logo: "Instant alert", "Monday briefing · week of Sep 28". */
  label: string;
  /** card() rows. */
  cards: string;
  /** A button() centred under the cards, or null. */
  cta?: { html: string; center: boolean } | null;
  /** First footer line (already-escaped HTML: the counter and links). */
  footerHtml: string;
  /** "Sent to …" address. */
  sentTo?: string;
};

export function renderShell(input: ShellInput): string {
  const site = escapeHtml(input.siteUrl);
  return `<!doctype html>
<html lang="en" style="margin:0;padding:0;">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(input.subject)}</title>
<!--[if mso]><style>* {font-family: Arial, sans-serif !important;}</style><![endif]-->
<style>
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  @media (max-width: 620px) {
    .tw-wrap { padding:24px 16px 32px !important; }
    .tw-card { padding:16px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f1f1f1;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f1f1f1;opacity:0;">${escapeHtml(input.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f1f1;">
  <tr><td align="center">
    <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
      <tr><td class="tw-wrap" style="padding:24px 32px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:0 0 16px 0;font-family:${SANS};font-size:14px;color:${SUBDUED};">
            <a href="${site}" style="text-decoration:none;"><img src="${site}/email-logo-dark.png" width="91" height="20" alt="Trailwatch" style="border:0;outline:none;display:inline-block;vertical-align:middle;height:20px;width:91px;"></a>
            <span style="vertical-align:middle;">&nbsp;&middot; ${escapeHtml(input.label)}</span>
          </td></tr>
          ${input.cards}
          ${
            input.cta
              ? `<tr><td ${input.cta.center ? 'align="center"' : ""} style="padding:0 0 8px 0;">${input.cta.html}</td></tr>`
              : ""
          }
          <tr><td align="center" style="padding:8px 0 0 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${SUBDUED};">
            ${input.footerHtml}${input.sentTo ? `<br>Trailwatch &middot; Sent to ${escapeHtml(input.sentTo)}` : ""}
            <br>&copy; 2026 House of Ruga LLP
          </td></tr>
        </table>
      </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr>
</table>
</body>
</html>`;
}

/** The footer's first line: counter · Change alerts · Unsubscribe. */
export function footerLine(siteUrl: string, movesThisMonth: number, unsubscribeHref: string): string {
  const a = (href: string, text: string) =>
    `<a href="${escapeHtml(href)}" style="color:${INK_2};text-decoration:underline;">${escapeHtml(text)}</a>`;
  return `Moves caught this month: ${movesThisMonth} &middot; ${a(`${siteUrl}/settings`, "Change alerts")} &middot; ${a(unsubscribeHref, "Unsubscribe")}`;
}

/**
 * One-click rating row (beta): "Was this briefing useful?  Yes · No". Two
 * plain button-links, so it works with images off and in every client.
 */
export function ratingRow(question: string, urls: { useful: string; notUseful: string }, labels: [string, string] = ["Yes", "No"]): string {
  // DESIGN 12-Beta 12f: question then two small outlined buttons, centred.
  const pill = (href: string, text: string) =>
    `<a href="${escapeHtml(href)}" style="display:inline-block;padding:6px 14px;margin:0 0 0 10px;border:1px solid #cccccc;border-radius:8px;background:#ffffff;color:#303030;text-decoration:none;font-weight:600;font-size:14px;">${escapeHtml(text)}</a>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:4px 0 20px 0;font-family:${SANS};font-size:14px;color:#4a4a4a;">${escapeHtml(question)}${pill(urls.useful, labels[0])}${pill(urls.notUseful, labels[1])}</td></tr></table>`;
}
