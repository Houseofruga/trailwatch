// Shared layout for the instant alert and the Monday briefing.
//
// Deliberately plain (owner's decision, 2026-10-07): these were built from the
// email artboards E1 and E2 (grey page, logo, white cards, a dark button) and
// Gmail filed them under Promotions. They now read like a note from a person:
// white page, no images, no boxes or buttons, left-aligned text with ordinary
// links and thin rules between sections. The same pieces (card, button, badge…)
// are kept so the alert and briefing renderers are unchanged. Pure, no I/O.

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

/** A section of the email. `inner` is HTML. `tone` is kept for callers; both render plain. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function card(inner: string, tone: "white" | "grey" = "white"): string {
  return `<tr><td style="padding:0 0 20px 0;border-top:1px solid ${RULE};">
  <div style="padding-top:20px;font-family:${SANS};color:${INK};">${inner}</div>
</td></tr>`;
}

/** Small heading inside a section ("What you could do", "Top moves"). */
export function eyebrow(text: string, dark = false): string {
  return `<p style="margin:0 0 8px 0;font-size:13px;font-weight:700;color:${dark ? INK : SUBDUED};">${escapeHtml(text)}</p>`;
}

export function heading(text: string): string {
  return `<h1 style="margin:0 0 8px 0;font-size:18px;line-height:1.35;font-weight:700;color:${INK};">${escapeHtml(text)}</h1>`;
}

export function paragraph(text: string, opts: { size?: number; muted?: boolean; bold?: boolean; margin?: string } = {}): string {
  return `<p style="margin:${opts.margin ?? "0"};font-size:${opts.size ?? 15}px;line-height:1.55;color:${opts.muted ? INK_2 : INK};${opts.bold ? "font-weight:600;" : ""}">${escapeHtml(text)}</p>`;
}

const BADGE: Record<"high" | "normal" | "low", string> = { high: "High", normal: "Normal", low: "Low" };

/** The priority, as plain bold text. */
export function badge(priority: "high" | "normal" | "low"): string {
  return `<strong style="font-size:13px;color:${priority === "high" ? INK : SUBDUED};">${BADGE[priority]}</strong>`;
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

/** A labelled line ("Compared with yours: …"). */
export function note(label: string, text: string): string {
  return `<p style="margin:14px 0 0 0;font-size:14px;line-height:1.5;color:${INK};"><strong>${escapeHtml(label)}</strong> ${escapeHtml(text)}</p>`;
}

export function link(href: string, text: string, opts: { underline?: boolean; color?: string } = {}): string {
  return `<a href="${escapeHtml(href)}" style="color:${opts.color ?? "#005bd3"};${opts.underline ? "text-decoration:underline;text-underline-offset:2px;" : "text-decoration:none;"}">${escapeHtml(text)}</a>`;
}

/** The main link, as an ordinary bold link (no button). */
export function button(href: string, label: string): string {
  return `<p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.5;"><a href="${escapeHtml(href)}" style="color:#005bd3;font-weight:700;text-decoration:underline;text-underline-offset:2px;">${escapeHtml(label)}</a></p>`;
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
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;opacity:0;">${escapeHtml(input.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
  <tr><td style="padding:20px 20px 28px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:0 0 16px 0;font-family:${SANS};font-size:13px;color:${SUBDUED};">Trailwatch &middot; ${escapeHtml(input.label)}</td></tr>
      ${input.cards}
      ${input.cta ? `<tr><td style="padding:0 0 20px 0;">${input.cta.html}</td></tr>` : ""}
      <tr><td style="padding:16px 0 0 0;border-top:1px solid ${RULE};font-family:${SANS};font-size:12px;line-height:1.6;color:${SUBDUED};">
        ${input.footerHtml}${input.sentTo ? `<br>Trailwatch &middot; Sent to ${escapeHtml(input.sentTo)}` : ""}
        <br>&copy; 2026 House of Ruga LLP
      </td></tr>
    </table>
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
 * One-click rating row (beta): "Was this briefing useful?  Yes · No", as two
 * ordinary links, so it works with images off and in every client.
 */
export function ratingRow(question: string, urls: { useful: string; notUseful: string }, labels: [string, string] = ["Yes", "No"]): string {
  const choice = (href: string, text: string) =>
    `<a href="${escapeHtml(href)}" style="color:#005bd3;font-weight:600;text-decoration:underline;text-underline-offset:2px;">${escapeHtml(text)}</a>`;
  return `<p style="margin:0 0 20px 0;font-family:${SANS};font-size:14px;line-height:1.5;color:${INK_2};">${escapeHtml(question)} ${choice(urls.useful, labels[0])} &middot; ${choice(urls.notUseful, labels[1])}</p>`;
}
