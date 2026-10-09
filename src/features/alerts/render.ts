import type { RenderedEmail } from "@/features/digest/email";
import { toMoves, type FeedRow } from "@/features/appData/moves";
import type { Move } from "@/features/appData/types";
import {
  badge,
  button,
  card,
  escapeHtml,
  eyebrow,
  footerLine,
  heading,
  note,
  paragraph,
  ratingRow,
  renderShell,
  rows,
} from "@/features/email/shell";
import { inboxEmail } from "@/features/email/wording";
import type { EventType, Severity } from "@/features/events/types";
import { describeEvent, leadEvent, suggestedAction } from "./describe";

export type AlertEvent = {
  /** events.id: links the alert to that move on the competitor's page. */
  eventId?: string;
  type: EventType;
  severity?: Severity;
  payload: Record<string, unknown>;
  detectedAt: string;
  snapshotId?: string | null;
  /** The one-line "What it means" (high-priority moves), when written. */
  meaning?: string | null;
  // Phase 5: the reader's comparable product, when they've added their store.
  ownMatch?: { title: string; price: number | null } | null;
};

export type AlertBundle = {
  storeName: string;
  storeDomain: string;
  competitorId: string | null;
  events: AlertEvent[]; // one or more high-severity events for one store
};

function competitorUrl(siteUrl: string, b: AlertBundle, moveId?: string): string {
  if (!b.competitorId) return `${siteUrl}/dashboard`;
  return `${siteUrl}/competitors/${encodeURIComponent(b.competitorId)}${moveId ? `?from=alert#move-${encodeURIComponent(moveId)}` : ""}`;
}

/** The alert's events as moves: same-read launches and sales become one move, as on the app. */
function alertMoves(b: AlertBundle): Move[] {
  const feed: FeedRow[] = b.events.map((e, i) => ({
    eventId: e.eventId ?? `e${i}`,
    storeId: b.storeDomain,
    competitorId: b.competitorId ?? "",
    competitorName: b.storeName,
    type: e.type,
    severity: e.severity ?? "high",
    payload: e.payload,
    detectedAt: e.detectedAt,
    snapshotId: e.snapshotId ?? null,
    meaning: e.meaning ?? null,
    ownMatch: e.ownMatch ?? null,
  }));
  return toMoves(feed);
}

const noStop = (s: string) => s.replace(/\.$/, "");

function headlineFor(b: AlertBundle, moves: Move[]): string {
  if (moves.length > 1) return `${b.storeName} made ${moves.length} big moves`;
  const m = moves[0];
  if (m.bundle) {
    return m.kind === "sale"
      ? `${b.storeName} put ${m.bundle.length} products on sale`
      : `${b.storeName} launched ${m.bundle.length} products`;
  }
  const lead = leadEvent(b.events);
  return noStop(describeEvent(lead.type, lead.payload, b.storeName));
}

// "Your Waffle Duvet Cover is $189, $81 more." → "your Waffle Duvet Cover is $189, $81 more."
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/**
 * The instant alert email (E1): a High badge, what happened, the products
 * when several launched or went on sale together, how it compares with the
 * reader's product, one thing they could do, and a link to the move in the app.
 */
export function renderAlertEmail(
  b: AlertBundle,
  siteUrl: string,
  movesThisMonth: number,
  sentTo?: string,
  /** Beta: one-click "Useful / Noise" links (left out when unsigned). */
  rating?: { useful: string; notUseful: string } | null,
): RenderedEmail {
  const moves = alertMoves(b);
  const lead = moves[0];
  const leadEv = leadEvent(b.events);
  const subject = headlineFor(b, moves);
  const suggestion = suggestedAction(leadEv.type, leadEv.payload);
  const href = competitorUrl(siteUrl, b, b.events.some((e) => e.eventId) ? lead.id : undefined);

  // Several products in one move, or several moves: list them.
  const list: { title: string; price: string | null }[] =
    moves.length > 1
      ? moves.map((m) => ({ title: m.summary, price: null }))
      : (lead.bundle ?? []).map((i) => ({ title: i.title, price: i.price !== null ? `$${(i.price / 100).toFixed(2)}` : null }));

  const text = [
    `TRAILWATCH · INSTANT ALERT`,
    ``,
    subject,
    ...(lead.meaning ? [lead.meaning] : []),
    ...list.map((i) => `• ${i.title}${i.price ? `  ${i.price}` : ""}`),
    ...(lead.comparedWithYours ? [``, `Compared with yours: ${lowerFirst(lead.comparedWithYours)}`] : []),
    ``,
    `What you could do: ${suggestion}`,
    ``,
    `See it in Trailwatch: ${href}`,
    ``,
    ...(rating ? [`Was this alert useful? Useful: ${rating.useful}  ·  Noise: ${rating.notUseful}`, ``] : []),
    `—`,
    `Moves caught this month: ${movesThisMonth}`,
    `Change alerts: ${siteUrl}/settings`,
    ...(sentTo ? [`Sent to ${sentTo}`] : []),
    `© 2026 House of Ruga LLP`,
  ].join("\n");

  const inner = [
    badge("high"),
    `<div style="height:12px;line-height:12px;font-size:0;">&nbsp;</div>`,
    heading(subject),
    lead.meaning ? paragraph(lead.meaning, { muted: true, margin: list.length ? "0 0 12px 0" : "0" }) : "",
    list.length
      ? rows(list.map((i) => ({ left: escapeHtml(i.title), right: i.price !== null ? escapeHtml(i.price) : undefined })))
      : "",
    lead.comparedWithYours ? note("Compared with yours:", lowerFirst(lead.comparedWithYours)) : "",
    `<div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>`,
    eyebrow("What you could do"),
    paragraph(suggestion, { margin: "0 0 20px 0" }),
    button(href, "See it in Trailwatch"),
  ].join("");

  const html = renderShell({
    siteUrl,
    subject,
    preheader: lead.meaning ?? lead.comparedWithYours ?? suggestion,
    label: "Instant alert",
    cards: card(inner) + (rating ? ratingRow("Was this alert useful?", rating, ["Useful", "Noise"]) : ""),
    footerHtml: footerLine(siteUrl, movesThisMonth, `${siteUrl}/settings`),
    sentTo,
  });

  return inboxEmail({ subject, html, text });
}

function subjectFor(b: AlertBundle): string {
  return headlineFor(b, alertMoves(b));
}

/** Slack incoming-webhook payload for the same bundle (mrkdwn blocks + text fallback). */
export function renderAlertSlack(b: AlertBundle, siteUrl: string): { text: string; blocks: unknown[] } {
  const lead = leadEvent(b.events);
  // Slack mrkdwn: escape the three control characters in user-derived text.
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = b.events.map((e) => `• ${esc(describeEvent(e.type, e.payload, b.storeName))}`);
  const suggestion = esc(suggestedAction(lead.type, lead.payload));
  const link = competitorUrl(siteUrl, b);
  return {
    text: subjectFor(b),
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `*Trailwatch — ${esc(b.storeName)}*\n${lines.join("\n")}` } },
      { type: "section", text: { type: "mrkdwn", text: `*Suggested move:* ${suggestion}` } },
      { type: "context", elements: [{ type: "mrkdwn", text: `<${link}|See ${esc(b.storeName)} on Trailwatch>` }] },
    ],
  };
}
