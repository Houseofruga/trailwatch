import { toMoves, type FeedRow } from "@/features/appData/moves";
import type { Move } from "@/features/appData/types";
import type { RenderedEmail } from "@/features/digest/email";
import {
  badge,
  button,
  card,
  escapeHtml,
  eyebrow,
  footerLine,
  heading,
  link,
  paragraph,
  plural,
  ratingRow,
  renderShell,
} from "@/features/email/shell";
import type { BriefingInput, BriefingInterpretation } from "./content";

/** A competitor the reader follows: quiet ones still get a "Quiet week" line. */
export type BriefingCompetitor = { id: string; name: string; storeId: string };

const TOP_MOVES = 5;
const LINES_PER_COMPETITOR = 3;
const RANK = { high: 2, normal: 1, low: 0 } as const;

function weekLabel(weekOf: string): string {
  const d = new Date(`${weekOf}T12:00:00Z`);
  return `week of ${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
}

/**
 * The Monday briefing email (E2): what the week means for you and one move
 * (the model's part), the top moves and a per-competitor breakdown (facts,
 * from the events), each linking to the move or competitor in the app. A week
 * with no moves gets the quiet-week version.
 */
export function renderBriefingEmail(opts: {
  input: BriefingInput;
  interpretation: BriefingInterpretation;
  siteUrl: string;
  unsubscribeUrl?: string;
  movesThisMonth: number;
  /** Everyone the reader follows; defaults to the stores in this week's events. */
  competitors?: BriefingCompetitor[];
  sentTo?: string;
  /** Beta: one-click "Was this useful?" links (left out when unsigned). */
  rating?: { useful: string; notUseful: string } | null;
}): RenderedEmail {
  const { input, interpretation: ai, siteUrl } = opts;
  const competitors: BriefingCompetitor[] =
    opts.competitors ??
    [...new Map(input.events.map((e) => [e.storeId, { id: "", name: e.storeName, storeId: e.storeId }])).values()];
  const byStore = new Map(competitors.map((c) => [c.storeId, c]));

  const feed: FeedRow[] = input.events.map((e, i) => ({
    eventId: e.eventId ?? `e${i}`,
    storeId: e.storeId,
    competitorId: byStore.get(e.storeId)?.id ?? "",
    competitorName: byStore.get(e.storeId)?.name ?? e.storeName,
    type: e.type,
    severity: e.severity,
    payload: e.payload,
    detectedAt: e.detectedAt,
    snapshotId: e.snapshotId ?? null,
    meaning: null,
    ownMatch: e.ownMatch ?? null,
  }));
  const moves = toMoves(feed).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  // Briefings prepared before event ids were frozen in link to the competitor only.
  const linkMoves = input.events.every((e) => e.eventId);
  const quiet = moves.length === 0;

  const competitorUrl = (id: string) => (id ? `${siteUrl}/competitors/${encodeURIComponent(id)}` : `${siteUrl}/dashboard`);
  const moveUrl = (m: Move) =>
    m.competitorId && linkMoves ? `${competitorUrl(m.competitorId)}#move-${encodeURIComponent(m.id)}` : competitorUrl(m.competitorId);

  const top = [...moves].sort((a, b) => RANK[b.priority] - RANK[a.priority] || Date.parse(b.at) - Date.parse(a.at)).slice(0, TOP_MOVES);
  const perCompetitor = competitors
    .map((c) => {
      const theirs = moves.filter((m) => m.competitorId === c.id && (c.id || m.competitorName === c.name));
      return { c, moves: theirs, high: theirs.filter((m) => m.priority === "high").length };
    })
    .sort((a, b) => b.moves.length - a.moves.length);

  const n = moves.length;
  const k = competitors.length;
  const subject = quiet
    ? "Your Monday briefing: a quiet week"
    : `Your Monday briefing: ${k} ${plural(k, "competitor", "competitors")}, ${n} ${plural(n, "move", "moves")}`;
  const quietLine = `None of your ${k} ${plural(k, "competitor", "competitors")} made a big move. Prices, launches and pages stayed where they were.`;
  const preheader = quiet ? quietLine : (ai.whatThisMeans ?? ai.suggestedMove) || subject;
  const unsubHref = opts.unsubscribeUrl ?? `${siteUrl}/settings`;
  const countFor = (x: (typeof perCompetitor)[number]) =>
    `${x.moves.length} ${plural(x.moves.length, "move", "moves")}${x.high ? ` · ${x.high} high` : ""}`;

  // Opportunities (Part B): briefing only, at most three, each with evidence and one action.
  const opportunities = (input.opportunities ?? []).slice(0, 3);
  const opportunitiesText = opportunities.length
    ? [
        `OPPORTUNITIES`,
        ...opportunities.flatMap((o) => [`• ${o.noticed}`, ...(o.evidence ? [`  Evidence: ${o.evidence}`] : []), `  Try: ${o.action}`]),
        `See all opportunities: ${siteUrl}/opportunities`,
        ``,
      ]
    : [];

  // -------------------------------------------------------------- text
  const text = [
    `TRAILWATCH · MONDAY BRIEFING · ${weekLabel(input.weekOf).toUpperCase()}`,
    ``,
    ...(quiet
      ? [`A quiet week`, quietLine, ``]
      : [
          ...(ai.whatThisMeans ? [`WHAT THIS MEANS FOR YOU`, ai.whatThisMeans, ``] : []),
          ...(ai.suggestedMove ? [`ONE MOVE FOR THIS WEEK`, ai.suggestedMove, ``] : []),
          `TOP MOVES`,
          ...top.map((m) => `• [${m.priority}] ${m.competitorName}: ${m.summary}\n  ${moveUrl(m)}`),
          ``,
        ]),
    ...opportunitiesText,
    `BY COMPETITOR`,
    ...perCompetitor.flatMap((x) =>
      x.moves.length
        ? [
            `${x.c.name} (${countFor(x)})`,
            ...x.moves.slice(0, LINES_PER_COMPETITOR).map((m) => `  • ${m.summary}`),
            `  See all ${x.moves.length}: ${competitorUrl(x.c.id)}`,
          ]
        : [`${x.c.name}: quiet week, nothing changed.`],
    ),
    ``,
    `Open Trailwatch: ${siteUrl}/dashboard`,
    ``,
    ...(opts.rating ? [`Was this briefing useful? Yes: ${opts.rating.useful}  ·  No: ${opts.rating.notUseful}`, ``] : []),
    `—`,
    `Moves caught this month: ${opts.movesThisMonth}`,
    `Change alerts: ${siteUrl}/settings   ·   Unsubscribe: ${unsubHref}`,
    ...(opts.sentTo ? [`Sent to ${opts.sentTo}`] : []),
    `© 2026 House of Ruga LLP`,
  ].join("\n");

  // -------------------------------------------------------------- html
  const rule = "border-top:1px solid #ebebeb;";
  const byCompetitor =
    eyebrow("By competitor") +
    perCompetitor
      .map((x) =>
        x.moves.length
          ? `<div style="padding:12px 0;${rule}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="font-size:15px;font-weight:700;color:#303030;">${escapeHtml(x.c.name)}</td>
    <td align="right" style="font-size:13px;color:#616161;white-space:nowrap;">${escapeHtml(countFor(x))}</td>
  </tr></table>
  <ul style="margin:8px 0 6px 0;padding-left:18px;font-size:14px;line-height:1.45;color:#4a4a4a;">${x.moves
    .slice(0, LINES_PER_COMPETITOR)
    .map((m) => `<li style="margin:0 0 6px 0;">${escapeHtml(m.summary)}</li>`)
    .join("")}</ul>
  <div style="font-size:14px;">${link(competitorUrl(x.c.id), `See all ${x.moves.length}`)}</div>
</div>`
          : `<div style="padding:12px 0;${rule}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="font-size:15px;font-weight:700;color:#303030;">${escapeHtml(x.c.name)}</td>
    <td align="right" style="font-size:14px;color:#616161;">Quiet week, nothing changed.</td>
  </tr></table>
</div>`,
      )
      .join("");

  const opportunitiesCard = opportunities.length
    ? card(
        eyebrow("Opportunities") +
          opportunities
            .map(
              (o) => `<div style="padding:12px 0;${rule}">
  <div style="font-size:15px;line-height:1.45;color:#303030;font-weight:600;">${escapeHtml(o.noticed)}</div>
  ${o.evidence ? `<div style="margin-top:4px;font-size:13px;line-height:1.45;color:#616161;">${escapeHtml(o.evidence)}</div>` : ""}
  <div style="margin-top:6px;font-size:14px;line-height:1.45;color:#4a4a4a;"><strong>Try:</strong> ${escapeHtml(o.action)}</div>
</div>`,
            )
            .join("") +
          `<div style="padding-top:8px;font-size:14px;">${link(`${siteUrl}/opportunities`, "See all opportunities")}</div>`,
      )
    : "";

  const cards = quiet
    ? [card(heading("A quiet week") + paragraph(quietLine, { muted: true })), opportunitiesCard, card(byCompetitor)]
    : [
        ai.whatThisMeans ? card(eyebrow("What this means for you") + paragraph(ai.whatThisMeans, { size: 16 })) : "",
        ai.suggestedMove ? card(eyebrow("One move for this week", true) + paragraph(ai.suggestedMove, { size: 16, bold: true }), "grey") : "",
        card(
          eyebrow("Top moves") +
            top
              .map(
                (m) =>
                  `<div style="padding:10px 0;${rule}font-size:15px;line-height:1.45;">${badge(m.priority)} ${link(
                    moveUrl(m),
                    `${m.competitorName}: ${m.summary}`,
                    { underline: true, color: "#303030" },
                  )}</div>`,
              )
              .join(""),
        ),
        opportunitiesCard,
        card(byCompetitor),
      ];

  const html = renderShell({
    siteUrl,
    subject,
    preheader,
    label: `Monday briefing · ${weekLabel(input.weekOf)}`,
    cards: cards.join("") + (opts.rating ? ratingRow("Was this briefing useful?", opts.rating) : ""),
    cta: { html: button(`${siteUrl}/dashboard`, "Open Trailwatch"), center: true },
    footerHtml: footerLine(siteUrl, opts.movesThisMonth, unsubHref),
    sentTo: opts.sentTo,
  });

  return { subject, html, text };
}
