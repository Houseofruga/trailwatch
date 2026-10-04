import type { UserDigest, DigestCompetitor, DigestPage } from "./build";

// Pure render — no I/O, so the shape is unit-testable. Produces the subject and
// both an HTML and a plain-text body (some clients prefer text; Resend takes
// both). The design is the redesigned weekly digest: grouped competitor → page
// → change, low-noise, cream/ink with a lime accent, table-based + inline
// styles so it survives Gmail/Outlook/Apple Mail, and legible with images off.

export type RenderedEmail = { subject: string; html: string; text: string };

const DAY_MS = 24 * 60 * 60 * 1000;

// Repeated font stacks. DM Sans / Geist Mono are niceties; the system fallbacks
// carry the design when the web fonts don't load (they usually don't, in email).
const SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI','DM Sans',Helvetica,Arial,sans-serif";
const MONO =
  "'Geist Mono',ui-monospace,'SF Mono','Roboto Mono','Courier New',monospace";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function subjectFor(digest: UserDigest): string {
  const n = digest.changeCount;
  return `Your weekly digest — ${n} ${plural(n, "change", "changes")}`;
}

// The trailing 7-day window the digest covers, e.g. "Week of Sep 8–14" (or
// "Sep 29–Oct 5" across a month boundary). UTC so it's deterministic.
function weekRange(now: number): string {
  const start = new Date(now - 7 * DAY_MS);
  const end = new Date(now - DAY_MS);
  const mo = (d: Date) => d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const from = `${mo(start)} ${start.getUTCDate()}`;
  const to = sameMonth ? `${end.getUTCDate()}` : `${mo(end)} ${end.getUTCDate()}`;
  return `Week of ${from}–${to}`;
}

function changeUrl(siteUrl: string, changeId: string | null): string {
  return changeId ? `${siteUrl}/changes/${encodeURIComponent(changeId)}` : `${siteUrl}/dashboard`;
}

// ------------------------------------------------------------------- HTML

function renderChange(siteUrl: string, ch: DigestPage["changes"][number]): string {
  const label = ch.isFallback ? "Open the page &rarr;" : "View change &rarr;";
  return `
  <tr><td class="tw-rule" style="padding:11px 0 12px;border-bottom:1px solid #f2f0ea;">
    <div class="tw-ink2" style="font-family:${SANS};font-size:14.5px;line-height:1.55;color:#4a4740;">${escapeHtml(ch.summary)}</div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:7px;"><tr>
      <td class="tw-faint" style="font-family:${MONO};font-size:11.5px;color:#8b877e;padding-right:14px;white-space:nowrap;">${escapeHtml(ch.when)}</td>
      <td><a href="${escapeHtml(changeUrl(siteUrl, ch.changeId))}" class="tw-link" style="font-family:${SANS};font-size:12.5px;font-weight:600;color:#557a00;text-decoration:none;">${label}</a></td>
    </tr></table>
  </td></tr>`;
}

function renderPage(siteUrl: string, page: DigestPage): string {
  const changes = page.changes.map((c) => renderChange(siteUrl, c)).join("");
  const more =
    page.moreCount > 0
      ? `
    <tr><td style="padding:10px 0 2px;"><a href="${escapeHtml(siteUrl)}/dashboard" class="tw-link" style="font-family:${SANS};font-size:12.5px;font-weight:600;color:#557a00;text-decoration:none;">+${page.moreCount} more ${plural(page.moreCount, "change", "changes")} on this page &rarr;</a></td></tr>`
      : "";
  return `
  <tr><td style="padding:14px 0 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:0 0 2px;">
        <span class="tw-tag" style="font-family:${SANS};font-size:10.5px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#6e6b63;">${escapeHtml(page.typeLabel)}</span>
        <span class="tw-path" style="font-family:${MONO};font-size:12px;color:#8b877e;">&nbsp;&nbsp;${escapeHtml(page.path)}</span>
      </td></tr>
      ${changes}${more}
    </table>
  </td></tr>`;
}

function renderCompetitor(siteUrl: string, c: DigestCompetitor): string {
  const pages = c.pages.map((p) => renderPage(siteUrl, p)).join("");
  const domainLine = c.domain
    ? `<div class="tw-faint" style="font-family:${MONO};font-size:11.5px;color:#8b877e;margin-top:1px;">${escapeHtml(c.domain)}</div>`
    : "";
  return `
  <tr><td style="padding:26px 30px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="34" style="vertical-align:top;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td class="tw-avatar" width="30" height="30" align="center" style="width:30px;height:30px;background:#eefbc7;font-family:${SANS};font-size:11px;font-weight:700;color:#557a00;text-align:center;line-height:30px;">${escapeHtml(c.initials)}</td>
        </tr></table>
      </td>
      <td style="vertical-align:middle;padding-left:12px;">
        <div class="tw-ink" style="font-family:${SANS};font-size:16px;font-weight:700;letter-spacing:-0.01em;color:#1a1a17;">${escapeHtml(c.name)}</div>
        ${domainLine}
      </td>
      <td align="right" style="vertical-align:middle;"><span class="tw-faint" style="font-family:${SANS};font-size:11.5px;color:#8b877e;white-space:nowrap;">${c.changeCount} ${plural(c.changeCount, "change", "changes")}</span></td>
    </tr></table>
    <div class="tw-hr" style="height:1px;background:#ece9e2;font-size:0;line-height:0;margin-top:14px;">&nbsp;</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding-left:46px;">${pages}</table>
  </td></tr>`;
}

function renderSummaryStrip(digest: UserDigest): string {
  if (!digest.showSummaryStrip) return "";
  const items = digest.summaryStrip
    .map(
      (s, i) =>
        `${i > 0 ? `<span class="tw-faint" style="color:#8b877e;padding:0 8px;">·</span>` : ""}<span class="tw-ink2" style="color:#4a4740;white-space:nowrap;">${escapeHtml(s.name)}&nbsp;<span class="tw-faint" style="color:#8b877e;">${s.count}</span></span>`,
    )
    .join("");
  return `
  <tr><td style="padding:16px 30px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="tw-mod" style="background:#eefbc7;border:1px solid #d6f59b;padding:11px 14px;font-family:${SANS};font-size:12.5px;line-height:1.7;color:#4a4740;">
      ${items}
    </td></tr></table>
  </td></tr>`;
}

function renderOverflowNote(digest: UserDigest, siteUrl: string): string {
  if (digest.hiddenCompetitorCount === 0) return "";
  const shown = digest.competitors.length;
  const hc = digest.hiddenChangeCount;
  const hcomp = digest.hiddenCompetitorCount;
  return `
  <tr><td style="padding:26px 30px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="tw-mod" style="background:#eefbc7;border:1px solid #d6f59b;padding:15px 16px;text-align:center;">
      <div class="tw-ink2" style="font-family:${SANS};font-size:13.5px;line-height:1.55;color:#4a4740;">Showing your ${shown} most active ${plural(shown, "competitor", "competitors")}. <strong style="font-weight:700;">${hc} more ${plural(hc, "change", "changes")} across ${hcomp} other ${plural(hcomp, "competitor", "competitors")}</strong> ${plural(hc, "is", "are")} waiting on your dashboard.</div>
      <a href="${escapeHtml(siteUrl)}/dashboard" class="tw-link" style="font-family:${SANS};font-size:13px;font-weight:700;color:#557a00;text-decoration:none;display:inline-block;margin-top:9px;">See all ${digest.changeCount} changes &rarr;</a>
    </td></tr></table>
  </td></tr>`;
}

function renderTrivialLine(digest: UserDigest): string {
  if (digest.trivialFiltered === 0) return "";
  const n = digest.trivialFiltered;
  return `
  <tr><td style="padding:22px 30px 0;">
    <div class="tw-faint" style="font-family:${SANS};font-size:12.5px;line-height:1.6;color:#8b877e;">
      <span class="tw-tag" style="color:#557a00;font-weight:700;">·</span>&nbsp; We quietly filtered ${n} trivial ${plural(n, "edit", "edits")} this week (timestamps, cache tags, minor reworded copy) so this stays worth reading.
    </div>
  </td></tr>`;
}

function renderUnreachable(digest: UserDigest, siteUrl: string): string {
  if (digest.unreachable.length === 0) return "";
  const rows = digest.unreachable
    .map(
      (u) =>
        `<div class="tw-warnink" style="font-family:${SANS};font-size:13px;line-height:1.55;color:#b4791e;margin-top:4px;"><strong style="font-weight:700;">${escapeHtml(u.competitor)}</strong> <span style="font-family:${MONO};font-size:11.5px;">${escapeHtml(u.path)}</span></div>`,
    )
    .join("");
  return `
  <tr><td style="padding:22px 30px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="tw-warn" style="background:#fbf1df;border:1px solid #eadfc6;padding:13px 15px;">
      <div class="tw-warnink" style="font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:#b4791e;">Couldn't reach this week</div>
      ${rows}
      <a href="${escapeHtml(siteUrl)}/dashboard" class="tw-link" style="font-family:${SANS};font-size:12.5px;font-weight:600;color:#557a00;text-decoration:none;display:inline-block;margin-top:9px;">Check these pages &rarr;</a>
    </td></tr></table>
  </td></tr>`;
}

function renderUpgradeNudge(digest: UserDigest, siteUrl: string): string {
  if (digest.plan !== "free") return "";
  return `
  <tr><td style="padding:24px 30px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding-top:20px;border-top:1px solid #ece9e2;" class="tw-rule">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="tw-upg" bgcolor="#1a1a17" style="background:#1a1a17;padding:12px 20px;">
          <a href="${escapeHtml(siteUrl)}/billing" style="font-family:${SANS};font-size:13.5px;font-weight:700;color:#9ff50a;text-decoration:none;display:block;white-space:nowrap;" class="tw-upglab"><span style="color:#9ff50a;" class="tw-upglab">&#9889;</span>&nbsp; Upgrade to Pro</a>
        </td>
        <td style="padding-left:14px;vertical-align:middle;"><span class="tw-faint" style="font-family:${SANS};font-size:12.5px;line-height:1.5;color:#8b877e;">Track more competitors and every page type.</span></td>
      </tr></table>
    </td></tr></table>
  </td></tr>`;
}

// The logo lockup: a dark-ink wordmark for light backgrounds, a light-ink one
// for dark backgrounds, swapped by the same prefers-color-scheme mechanism the
// rest of the email uses. alt="Trailwatch" keeps the brand legible with images
// off. Outlook (mso) only ever sees the light-background logo, which is right
// for it.
function renderLogo(siteUrl: string): string {
  const common = `width="132" height="29" alt="Trailwatch" style="border:0;outline:none;text-decoration:none;height:29px;width:132px;`;
  return `<a href="${escapeHtml(siteUrl)}" style="text-decoration:none;">
          <img src="${escapeHtml(siteUrl)}/email-logo-dark.png" class="tw-logo-light" ${common}display:block;">
          <!--[if !mso]><!-->
          <img src="${escapeHtml(siteUrl)}/email-logo-light.png" class="tw-logo-dark" ${common}display:none;max-height:0;overflow:hidden;mso-hide:all;">
          <!--<![endif]-->
        </a>`;
}

export function renderDigest(
  digest: UserDigest,
  siteUrl: string,
  unsubscribeUrl?: string,
  now: number = Date.now(),
): RenderedEmail {
  const subject = subjectFor(digest);
  const unsubHref = unsubscribeUrl ?? `${siteUrl}/settings`;
  const planLabel = digest.plan === "pro" ? "Pro plan" : "Free plan";
  const countLine = `${digest.changeCount} ${plural(digest.changeCount, "change", "changes")} across ${digest.competitorCount} ${plural(digest.competitorCount, "competitor", "competitors")}`;

  // -------------------------------------------------------------- text
  const textBlocks = digest.competitors.map((c) => {
    const header = `${c.name.toUpperCase()}  (${c.domain})`;
    const pages = c.pages
      .map((p) => {
        const changes = p.changes
          .map(
            (ch) =>
              `    • ${ch.summary}\n      ${ch.when}  ·  ${changeUrl(siteUrl, ch.changeId)}`,
          )
          .join("\n");
        const more =
          p.moreCount > 0
            ? `\n    +${p.moreCount} more ${plural(p.moreCount, "change", "changes")} on this page → ${siteUrl}/dashboard`
            : "";
        return `  ${p.typeLabel.toUpperCase()} — ${p.path}\n${changes}${more}`;
      })
      .join("\n\n");
    return `──────────────────────────────\n${header}\n\n${pages}`;
  });

  const textExtras: string[] = [];
  if (digest.hiddenCompetitorCount > 0) {
    textExtras.push(
      `Showing your ${digest.competitors.length} most active competitors. ${digest.hiddenChangeCount} more ${plural(digest.hiddenChangeCount, "change", "changes")} across ${digest.hiddenCompetitorCount} other ${plural(digest.hiddenCompetitorCount, "competitor", "competitors")} are on your dashboard: ${siteUrl}/dashboard`,
    );
  }
  if (digest.trivialFiltered > 0) {
    textExtras.push(
      `We filtered ${digest.trivialFiltered} trivial ${plural(digest.trivialFiltered, "edit", "edits")} this week so this stays worth reading.`,
    );
  }
  if (digest.unreachable.length > 0) {
    textExtras.push(
      `Couldn't reach this week: ${digest.unreachable.map((u) => `${u.competitor} ${u.path}`).join(", ")} — ${siteUrl}/dashboard`,
    );
  }

  const text = [
    `TRAILWATCH — WEEKLY DIGEST`,
    weekRange(now),
    ``,
    `Here's what moved this week.`,
    `${countLine}.`,
    ``,
    textBlocks.join("\n\n"),
    ...(textExtras.length ? ["", textExtras.join("\n\n")] : []),
    ``,
    `Open your dashboard: ${siteUrl}/dashboard`,
    ...(digest.plan === "free" ? [`Upgrade to Pro: ${siteUrl}/billing`] : []),
    ``,
    `—`,
    `You're getting this because you track competitors on Trailwatch (${planLabel}).`,
    `Unsubscribe: ${unsubHref}   ·   Manage: ${siteUrl}/settings`,
    `© 2026 House of Ruga LLP`,
  ].join("\n");

  // -------------------------------------------------------------- html
  const competitors = digest.competitors.map((c) => renderCompetitor(siteUrl, c)).join("");

  const html = `<!doctype html>
<html lang="en" style="margin:0;padding:0;">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(subject)}</title>
<!--[if mso]><style>* {font-family: Arial, sans-serif !important;}</style><![endif]-->
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  @media (prefers-color-scheme: dark) {
    .tw-bg      { background:#100f0b !important; }
    .tw-card    { background:#1b1b15 !important; border-color:#34332b !important; }
    .tw-ink     { color:#f3f1eb !important; }
    .tw-ink2    { color:#cdcabf !important; }
    .tw-ink3    { color:#a6a298 !important; }
    .tw-faint   { color:#8c887e !important; }
    .tw-rule    { border-color:#2b2a22 !important; }
    .tw-hr      { background:#2b2a22 !important; border-color:#2b2a22 !important; }
    .tw-link    { color:#b8ef5c !important; }
    .tw-path    { color:#9c988e !important; }
    .tw-avatar  { background:#28331b !important; color:#c9f57c !important; }
    .tw-btn     { border-color:#4c4a41 !important; color:#f3f1eb !important; }
    .tw-mod     { background:#191d12 !important; border-color:#333a24 !important; }
    .tw-warn    { background:#221c10 !important; border-color:#4a3d1e !important; }
    .tw-warnink { color:#e0b463 !important; }
    .tw-upg     { background:#9ff50a !important; }
    .tw-upglab  { color:#12120c !important; }
    .tw-mark    { background:#9ff50a !important; }
    .tw-tag     { color:#a6a298 !important; }
    .tw-logo-light { display:none !important; }
    .tw-logo-dark  { display:inline-block !important; max-height:none !important; overflow:visible !important; }
  }
  a { text-decoration:none; }
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
</style>
</head>
<body class="tw-bg" style="margin:0;padding:0;background:#f1efe9;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f1efe9;opacity:0;">${escapeHtml(countLine)} this week.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="tw-bg" style="background:#f1efe9;">
  <tr><td align="center" style="padding:30px 14px;">
    <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="tw-card" style="width:600px;max-width:600px;background:#ffffff;border:1px solid #e6e2da;">

  <tr><td style="padding:26px 30px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="vertical-align:middle;">
        ${renderLogo(siteUrl)}
      </td>
      <td align="right" class="tw-faint" style="font-family:${MONO};font-size:11.5px;letter-spacing:0.02em;color:#8b877e;vertical-align:middle;">${escapeHtml(weekRange(now))}</td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:22px 30px 0;"><div class="tw-hr" style="height:1px;background:#ece9e2;font-size:0;line-height:0;">&nbsp;</div></td></tr>
  <tr><td style="padding:24px 30px 0;">
    <div class="tw-ink" style="font-family:${SANS};font-size:21px;line-height:1.3;font-weight:600;letter-spacing:-0.01em;color:#1a1a17;">Here's what moved this week.</div>
    <div class="tw-faint" style="font-family:${MONO};font-size:12px;letter-spacing:0.02em;color:#8b877e;margin:9px 0 0;">${escapeHtml(countLine)}</div>
  </td></tr>
  ${renderSummaryStrip(digest)}
  ${competitors}
  ${renderOverflowNote(digest, siteUrl)}
  ${renderTrivialLine(digest)}
  ${renderUnreachable(digest, siteUrl)}
  <tr><td style="padding:26px 30px 4px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td class="tw-btn" style="border:1px solid #1a1a17;padding:12px 22px;">
        <a href="${escapeHtml(siteUrl)}/dashboard" class="tw-ink" style="font-family:${SANS};font-size:13.5px;font-weight:600;color:#1a1a17;text-decoration:none;display:block;white-space:nowrap;">Open your dashboard &rarr;</a>
      </td>
    </tr></table>
  </td></tr>
  ${renderUpgradeNudge(digest, siteUrl)}
  <tr><td style="padding:28px 30px 30px;">
    <div class="tw-hr" style="height:1px;background:#ece9e2;font-size:0;line-height:0;">&nbsp;</div>
    <div class="tw-faint" style="font-family:${SANS};font-size:11.5px;line-height:1.7;color:#8b877e;margin-top:16px;">
      You're getting this because you track competitors on Trailwatch<span class="tw-faint" style="color:#8b877e;"> · ${escapeHtml(planLabel)}</span>.<br>
      <a href="${escapeHtml(unsubHref)}" class="tw-faint" style="color:#8b877e;text-decoration:underline;">Unsubscribe from the weekly digest</a> &nbsp;·&nbsp; <a href="${escapeHtml(siteUrl)}/settings" class="tw-faint" style="color:#8b877e;text-decoration:underline;">manage in Settings</a>
    </div>
    <div class="tw-faint" style="font-family:${SANS};font-size:11px;line-height:1.6;color:#8b877e;margin-top:12px;">&copy; 2026 House of Ruga LLP</div>
  </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
  </td></tr>
</table>
</body>
</html>`;

  return { subject, html, text };
}
