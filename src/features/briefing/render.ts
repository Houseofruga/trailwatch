import type { RenderedEmail } from "@/features/digest/email";
import { SANS, button, escapeHtml, item, paragraph, plural, renderShell, section } from "@/features/email/shell";
import { competitorSections, type BriefingInput, type BriefingInterpretation } from "./content";

function weekLabel(weekOf: string): string {
  const d = new Date(`${weekOf}T12:00:00Z`);
  return `Week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
}

/**
 * The Monday briefing email (SPEC.md §5 Phase 4): top 3 moves, per-competitor
 * breakdown, what this means for you, one suggested move, and the value
 * counter. Layout is a placeholder on the shared shell until the email
 * artboards arrive.
 */
export function renderBriefingEmail(opts: {
  input: BriefingInput;
  interpretation: BriefingInterpretation;
  siteUrl: string;
  unsubscribeUrl?: string;
  movesThisMonth: number;
}): RenderedEmail {
  const { input, interpretation: ai, siteUrl } = opts;
  const sections = competitorSections(input);
  const n = input.events.length;
  const competitors = sections.length;
  const countLine = `${n} ${plural(n, "move", "moves")} across ${competitors} ${plural(competitors, "competitor", "competitors")}`;
  const lead = ai.topMoves[0]?.headline ?? "Your competitors' week, interpreted.";
  const subject = `Monday briefing: ${lead}`;
  const unsubHref = opts.unsubscribeUrl ?? `${siteUrl}/settings`;
  const counter = `Competitor moves caught this month: ${opts.movesThisMonth}`;

  // -------------------------------------------------------------- text
  const text = [
    `TRAILWATCH — MONDAY BRIEFING`,
    weekLabel(input.weekOf),
    countLine,
    ``,
    `TOP MOVES THIS WEEK`,
    ...ai.topMoves.map((m, i) => `${i + 1}. ${m.headline}${m.whyItMatters ? `\n   ${m.whyItMatters}` : ""}`),
    ``,
    ...sections.flatMap((s) => [
      s.storeName.toUpperCase(),
      ...s.groups.flatMap((g) => [
        `  ${g.label}`,
        ...g.lines.map((l) => `   • ${l}`),
        ...(g.more ? [`   +${g.more} more on your dashboard`] : []),
      ]),
      ``,
    ]),
    ...(ai.whatThisMeans ? [`WHAT THIS MEANS FOR YOU`, ai.whatThisMeans, ``] : []),
    ...(ai.suggestedMove ? [`ONE MOVE FOR THIS WEEK`, ai.suggestedMove, ``] : []),
    `Open your dashboard: ${siteUrl}/dashboard`,
    ``,
    `—`,
    counter,
    `Unsubscribe: ${unsubHref}   ·   Manage: ${siteUrl}/settings`,
    `© 2026 House of Ruga LLP`,
  ].join("\n");

  // -------------------------------------------------------------- html
  const topMoves = ai.topMoves.map((m, i) => item(`${i + 1}. ${m.headline}`, m.whyItMatters || undefined)).join("");
  const perCompetitor = sections
    .map((s) =>
      section(
        s.storeName,
        s.groups
          .map((g) =>
            [
              `<div class="tw-faint" style="font-family:${SANS};font-size:12px;color:#8b877e;margin-top:8px;">${escapeHtml(g.label)}</div>`,
              ...g.lines.map((l) => item(l)),
              g.more ? item(`+${g.more} more on your dashboard`) : "",
            ].join(""),
          )
          .join(""),
      ),
    )
    .join("");

  const html = renderShell({
    siteUrl,
    subject,
    preheader: ai.suggestedMove || countLine,
    eyebrow: weekLabel(input.weekOf),
    headline: "Your Monday briefing.",
    subline: countLine,
    bodyRows: [
      section("Top moves this week", topMoves),
      perCompetitor,
      ai.whatThisMeans ? section("What this means for you", paragraph(ai.whatThisMeans)) : "",
      ai.suggestedMove ? section("One move for this week", paragraph(ai.suggestedMove)) : "",
      button(`${siteUrl}/dashboard`, "Open your dashboard"),
    ].join(""),
    footerHtml: `${escapeHtml(counter)}.<br>You're getting this because you follow competitors on TrailWatch.<br><a href="${escapeHtml(unsubHref)}" class="tw-faint" style="color:#8b877e;text-decoration:underline;">Unsubscribe from the Monday briefing</a> &nbsp;·&nbsp; <a href="${escapeHtml(siteUrl)}/settings" class="tw-faint" style="color:#8b877e;text-decoration:underline;">manage in Settings</a>`,
  });

  return { subject, html, text };
}
