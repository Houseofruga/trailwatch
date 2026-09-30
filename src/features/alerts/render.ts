import type { RenderedEmail } from "@/features/digest/email";
import { button, escapeHtml, item, money, paragraph, plural, renderShell, section } from "@/features/email/shell";
import type { EventType } from "@/features/events/types";
import { describeEvent, leadEvent, suggestedAction } from "./describe";

export type AlertEvent = {
  type: EventType;
  payload: Record<string, unknown>;
  detectedAt: string;
  // Phase 5: the reader's comparable product, when they've added their store.
  ownMatch?: { title: string; price: number | null } | null;
};

// "vs your Overnight Recovery Balm ($52)" — appended to a line's timestamp.
function vsYours(e: AlertEvent): string {
  if (!e.ownMatch || e.type === "price_undercut") return ""; // undercut already says it
  return ` · vs your ${e.ownMatch.title}${e.ownMatch.price !== null ? ` (${money(e.ownMatch.price)})` : ""}`;
}

export type AlertBundle = {
  storeName: string;
  storeDomain: string;
  competitorId: string | null;
  events: AlertEvent[]; // one or more high-severity events for one store
};

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function competitorUrl(siteUrl: string, b: AlertBundle): string {
  return b.competitorId ? `${siteUrl}/competitors/${encodeURIComponent(b.competitorId)}` : `${siteUrl}/dashboard`;
}

function subjectFor(b: AlertBundle): string {
  if (b.events.length === 1) return describeEvent(b.events[0].type, b.events[0].payload, b.storeName);
  return `${b.storeName}: ${b.events.length} moves just now`;
}

/**
 * The instant alert email (SPEC.md §5 Phase 4): what happened, when, a link,
 * and one suggested action. A bundle of several events from one store becomes
 * one email led by the biggest move. Layout is a placeholder on the shared
 * shell until the email artboards arrive.
 */
export function renderAlertEmail(b: AlertBundle, siteUrl: string, movesThisMonth: number): RenderedEmail {
  const lead = leadEvent(b.events);
  const lines = b.events.map((e) => ({
    sentence: describeEvent(e.type, e.payload, b.storeName),
    when: when(e.detectedAt) + vsYours(e),
  }));
  const suggestion = suggestedAction(lead.type, lead.payload);
  const subject = subjectFor(b);
  const link = competitorUrl(siteUrl, b);
  const counter = `Competitor moves caught this month: ${movesThisMonth}`;

  const text = [
    `TRAILWATCH — INSTANT ALERT`,
    ``,
    ...lines.map((l) => `• ${l.sentence}\n  ${l.when}`),
    ``,
    `Suggested move: ${suggestion}`,
    ``,
    `See ${b.storeName}: ${link}`,
    ``,
    `—`,
    counter,
    `Manage alerts: ${siteUrl}/settings`,
    `© 2026 House of Ruga LLP`,
  ].join("\n");

  const html = renderShell({
    siteUrl,
    subject,
    preheader: suggestion,
    eyebrow: "Instant alert",
    headline:
      b.events.length === 1
        ? lines[0].sentence
        : `${b.storeName} made ${b.events.length} ${plural(b.events.length, "move", "moves")}.`,
    subline: `${b.storeDomain} · ${lines[0].when}`,
    bodyRows: [
      b.events.length > 1 ? section("What happened", lines.map((l) => item(l.sentence, l.when)).join("")) : "",
      section("Suggested move", paragraph(suggestion)),
      button(link, `See ${b.storeName}`),
    ].join(""),
    footerHtml: `${escapeHtml(counter)}.<br>You're getting instant alerts for competitors you follow on TrailWatch. <a href="${escapeHtml(siteUrl)}/settings" class="tw-faint" style="color:#8b877e;text-decoration:underline;">Manage alerts in Settings</a>`,
  });

  return { subject, html, text };
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
      { type: "section", text: { type: "mrkdwn", text: `*TrailWatch — ${esc(b.storeName)}*\n${lines.join("\n")}` } },
      { type: "section", text: { type: "mrkdwn", text: `*Suggested move:* ${suggestion}` } },
      { type: "context", elements: [{ type: "mrkdwn", text: `<${link}|See ${esc(b.storeName)} on TrailWatch>` }] },
    ],
  };
}
