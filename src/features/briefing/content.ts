import { z } from "zod";
import { CATEGORY, CATEGORY_LABEL, describeEvent, leadEvent, suggestedAction, type BriefingCategory } from "@/features/alerts/describe";
import type { EventType, Severity } from "@/features/events/types";
import type { BriefingOpportunity } from "@/features/opportunities/queries";

// What a briefing is built from: one user's week of events, frozen on the
// briefing row when it's prepared so the email matches what the model saw.
export type BriefingEvent = {
  /** events.id, for links to the move (briefings prepared before 2026-10 lack it). */
  eventId?: string;
  snapshotId?: string | null;
  storeId: string;
  storeName: string;
  type: EventType;
  severity: Severity;
  payload: Record<string, unknown>;
  detectedAt: string;
  // Phase 5: the reader's comparable product, when they've added their store.
  ownMatch?: { title: string; price: number | null } | null;
};

export type BriefingInput = {
  weekOf: string;
  events: BriefingEvent[];
  // Up to three Opportunities (Part B), frozen with the week; normal severity,
  // briefing only. Absent on briefings prepared before 2026-10-04.
  opportunities?: BriefingOpportunity[];
};

// The model's part: interpretation only. Facts (the per-competitor lists) are
// rendered from the events themselves, so the model can't invent any.
export type BriefingInterpretation = {
  /** `move`: the 1-based number of the move it's about, in rankEvents order (briefings from 2026-10 on). */
  topMoves: { headline: string; whyItMatters: string; move?: number }[];
  whatThisMeans: string | null;
  suggestedMove: string;
};

export type CompetitorSection = {
  storeId: string;
  storeName: string;
  groups: { category: BriefingCategory; label: string; lines: string[]; more: number }[];
};

const LINES_PER_GROUP = 5;
const ORDER: BriefingCategory[] = ["launches", "pricing", "stock", "positioning"];

/** Per-competitor breakdown (SPEC.md §5 Phase 4, section 2) — busiest competitor first. */
export function competitorSections(input: BriefingInput): CompetitorSection[] {
  const byStore = new Map<string, BriefingEvent[]>();
  for (const e of input.events) {
    if (!CATEGORY[e.type]) continue;
    byStore.set(e.storeId, [...(byStore.get(e.storeId) ?? []), e]);
  }
  return [...byStore.values()]
    .sort((a, b) => b.length - a.length)
    .map((events) => ({
      storeId: events[0].storeId,
      storeName: events[0].storeName,
      groups: ORDER.flatMap((category) => {
        const inGroup = events
          .filter((e) => CATEGORY[e.type] === category)
          // High severity first, then newest.
          .sort((a, b) => Number(b.severity === "high") - Number(a.severity === "high") || b.detectedAt.localeCompare(a.detectedAt));
        if (inGroup.length === 0) return [];
        return [
          {
            category,
            label: CATEGORY_LABEL[category],
            lines: inGroup.slice(0, LINES_PER_GROUP).map((e) => describeEvent(e.type, e.payload, e.storeName)),
            more: Math.max(0, inGroup.length - LINES_PER_GROUP),
          },
        ];
      }),
    }));
}

/** The week's events, most important first (high severity, then newest): the order the model sees them in. */
export function rankEvents(events: BriefingEvent[]): BriefingEvent[] {
  return [...events].sort(
    (a, b) => Number(b.severity === "high") - Number(a.severity === "high") || b.detectedAt.localeCompare(a.detectedAt),
  );
}

/**
 * The no-AI version: top moves are the highest-severity, newest events stated
 * plainly, plus the templated suggestion. Used when no AI key is set or the
 * model didn't answer in time — the briefing still goes out.
 */
export function fallbackInterpretation(input: BriefingInput): BriefingInterpretation {
  const top = rankEvents(input.events).slice(0, 3);
  const lead = top.length ? leadEvent(top) : null;
  return {
    topMoves: top.map((e, i) => ({ headline: describeEvent(e.type, e.payload, e.storeName), whyItMatters: "", move: i + 1 })),
    whatThisMeans: null,
    suggestedMove: lead ? suggestedAction(lead.type, lead.payload) : "",
  };
}

const interpretationSchema = z.object({
  topMoves: z
    .array(
      z.object({
        headline: z.string().trim().min(1),
        whyItMatters: z.string().trim().default(""),
        move: z.number().int().positive().optional().catch(undefined),
      }),
    )
    .min(1)
    .transform((moves) => moves.slice(0, 3)),
  whatThisMeans: z.string().trim().min(1).nullable().catch(null),
  suggestedMove: z.string().trim().min(1),
});

/** Parse the model's JSON (tolerates a code fence / surrounding text). */
export function parseInterpretation(text: string): BriefingInterpretation | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = interpretationSchema.safeParse(JSON.parse(text.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
