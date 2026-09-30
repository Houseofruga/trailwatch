import type { SupabaseClient } from "@supabase/supabase-js";
import { movesCaughtThisMonth } from "@/features/alerts/settings";
import { getMailer } from "@/features/digest/mailer";
import { unsubscribeUrl } from "@/features/digest/unsubscribe";
import type { EventType, Severity } from "@/features/events/types";
import { batchAvailable, collectBriefingBatch, submitBriefingBatch } from "./batch";
import { fallbackInterpretation, type BriefingEvent, type BriefingInput, type BriefingInterpretation } from "./content";
import { renderBriefingEmail } from "./render";
import { briefingWeek, canSend, canSubmit, stopWaiting } from "./schedule";

export type BriefingStepResult = {
  week: string | null;
  prepared: number;
  submitted: number;
  collected: number;
  sent: number;
  failed: number;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const one = <T>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/**
 * One pass of the Monday briefing pipeline (SPEC.md §5 Phase 4). Safe to run
 * on every tick — each step is gated by US Eastern time and idempotent:
 *   prepare  (Sun 18:00 ET →) one row per user with moves since their last
 *            briefing; the week's events are frozen onto the row
 *   submit   all prepared rows as one Batch API job (or, with no Anthropic
 *            key, fill them with the no-AI version right away)
 *   collect  finished batch results onto the rows; past Mon 11:00 ET, stop
 *            waiting and use the no-AI version
 *   send     (Mon 08:00 ET →) ready rows; their events are marked delivered
 */
export async function runBriefingStep(service: SupabaseClient, now: Date = new Date()): Promise<BriefingStepResult> {
  const week = briefingWeek(now);
  const result: BriefingStepResult = { week, prepared: 0, submitted: 0, collected: 0, sent: 0, failed: 0 };
  if (!week) return result;

  if (canSubmit(now)) {
    result.prepared = await prepare(service, week, now);
    result.submitted = await submit(service, week);
  }
  result.collected = await collect(service, week, now);
  if (canSend(now)) {
    const { sent, failed } = await send(service, week, now);
    result.sent = sent;
    result.failed = failed;
  }
  return result;
}

type EventRow = {
  user_id: string;
  created_at: string;
  context: { ownMatch?: { title: string; price: number | null } } | null;
  events: { type: EventType; severity: Severity; payload: Record<string, unknown>; detected_at: string } | null;
  stores: { id: string; name: string } | null;
};

async function prepare(service: SupabaseClient, week: string, now: Date): Promise<number> {
  // Candidates: anyone with a fanned-out move in the last week (+ a day of slack).
  const since = new Date(now.getTime() - WEEK_MS - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await service
    .from("user_events")
    .select("user_id, created_at, context, events(type, severity, payload, detected_at), stores(id, name)")
    .gte("created_at", since)
    .lte("created_at", now.toISOString())
    .limit(20000);
  if (error) throw new Error(`Couldn't load the week's events: ${error.message}`);
  const rows = (data ?? []).map((r) => ({ ...r, events: one(r.events), stores: one(r.stores) })) as EventRow[];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  if (userIds.length === 0) return 0;

  const [{ data: users }, { data: existing }, { data: previous }] = await Promise.all([
    // The Monday email honors the existing weekly-email opt-out.
    service.from("users").select("id").in("id", userIds).eq("digest_enabled", true),
    service.from("briefings").select("user_id").eq("week_start", week).in("user_id", userIds),
    service
      .from("briefings")
      .select("user_id, window_end")
      .lt("week_start", week)
      .in("user_id", userIds)
      .order("week_start", { ascending: false }),
  ]);
  const optedIn = new Set((users ?? []).map((u) => u.id));
  const done = new Set((existing ?? []).map((b) => b.user_id));
  // Each briefing starts where the user's last one ended: no gaps, no repeats.
  const lastEnd = new Map<string, string>();
  for (const b of previous ?? []) if (!lastEnd.has(b.user_id)) lastEnd.set(b.user_id, b.window_end);

  let prepared = 0;
  for (const userId of userIds) {
    if (!optedIn.has(userId) || done.has(userId)) continue;
    const windowStart = lastEnd.get(userId) ?? new Date(now.getTime() - WEEK_MS).toISOString();
    // Compare as instants: Postgres (+00:00, µs) and JS (Z, ms) format differently.
    const startMs = Date.parse(windowStart);
    const events: BriefingEvent[] = rows
      .filter((r) => r.user_id === userId && Date.parse(r.created_at) > startMs && r.events && r.stores)
      .map((r) => ({
        storeId: r.stores!.id,
        storeName: r.stores!.name,
        type: r.events!.type,
        severity: r.events!.severity,
        payload: r.events!.payload,
        detectedAt: r.events!.detected_at,
        ownMatch: r.context?.ownMatch ? { title: r.context.ownMatch.title, price: r.context.ownMatch.price } : null,
      }));
    const input: BriefingInput = { weekOf: week, events };
    // A quiet week sends nothing (low noise) — the row still records the window.
    const { error: insertError } = await service.from("briefings").insert({
      user_id: userId,
      week_start: week,
      status: events.length ? "pending" : "skipped",
      window_start: windowStart,
      window_end: now.toISOString(),
      input,
    });
    // 23505: another runner prepared it first — fine.
    if (insertError && insertError.code !== "23505") throw new Error(`Couldn't prepare briefing: ${insertError.message}`);
    if (!insertError && events.length) prepared += 1;
  }
  return prepared;
}

async function setReady(service: SupabaseClient, id: string, content: BriefingInterpretation, ai: boolean, error: string | null) {
  await service.from("briefings").update({ status: "ready", content, ai, error }).eq("id", id);
}

async function submit(service: SupabaseClient, week: string): Promise<number> {
  const { data: pending } = await service
    .from("briefings")
    .select("id, input")
    .eq("week_start", week)
    .eq("status", "pending");
  if (!pending || pending.length === 0) return 0;

  if (!batchAvailable()) {
    for (const b of pending) {
      await setReady(service, b.id, fallbackInterpretation(b.input as BriefingInput), false, "no ANTHROPIC_API_KEY");
    }
    return 0;
  }

  const batchId = await submitBriefingBatch(pending.map((b) => ({ briefingId: b.id, input: b.input as BriefingInput })));
  await service
    .from("briefings")
    .update({ status: "submitted", batch_id: batchId })
    .in("id", pending.map((b) => b.id));
  return pending.length;
}

async function collect(service: SupabaseClient, week: string, now: Date): Promise<number> {
  const { data: submitted } = await service
    .from("briefings")
    .select("id, batch_id, input")
    .eq("week_start", week)
    .eq("status", "submitted");
  if (!submitted || submitted.length === 0) return 0;

  let collected = 0;
  const giveUp = stopWaiting(now);
  for (const batchId of [...new Set(submitted.map((b) => b.batch_id as string))]) {
    const rows = submitted.filter((b) => b.batch_id === batchId);
    let outcome;
    try {
      outcome = await collectBriefingBatch(batchId);
    } catch (err) {
      outcome = { status: "in_progress" as const };
      console.error(`Couldn't read briefing batch ${batchId}:`, err);
    }
    if (outcome.status === "in_progress") {
      if (!giveUp) continue;
      for (const b of rows) {
        await setReady(service, b.id, fallbackInterpretation(b.input as BriefingInput), false, "batch not finished by Monday 11:00 ET");
      }
      continue;
    }
    for (const b of rows) {
      const r = outcome.results.get(b.id);
      if (r?.ok) await setReady(service, b.id, r.interpretation, true, null);
      else await setReady(service, b.id, fallbackInterpretation(b.input as BriefingInput), false, r?.reason ?? "missing from batch results");
      collected += 1;
    }
  }
  return collected;
}

async function send(service: SupabaseClient, week: string, now: Date): Promise<{ sent: number; failed: number }> {
  const { data: ready } = await service
    .from("briefings")
    .select("id, user_id, input, content, window_end, users(email)")
    .eq("week_start", week)
    .eq("status", "ready");
  if (!ready || ready.length === 0) return { sent: 0, failed: 0 };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gettrailwatch.com";
  const mailer = getMailer();
  let sent = 0;
  let failed = 0;

  for (const b of ready) {
    const email = one(b.users as { email: string } | { email: string }[] | null)?.email;
    if (!email) continue;
    const unsub = unsubscribeUrl(siteUrl, b.user_id) ?? undefined;
    const rendered = renderBriefingEmail({
      input: b.input as BriefingInput,
      interpretation: b.content as BriefingInterpretation,
      siteUrl,
      unsubscribeUrl: unsub,
      movesThisMonth: await movesCaughtThisMonth(service, b.user_id, now),
    });
    // One-click unsubscribe (RFC 8058), as on the digest.
    const headers = unsub
      ? { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
      : undefined;
    const res = await mailer.send(email, rendered, headers);
    if (!res.sent) {
      // Left "ready": the next tick retries (until Monday ends).
      failed += 1;
      console.warn(`Briefing not sent to user ${b.user_id}: ${res.reason}`);
      continue;
    }
    sent += 1;
    await service.from("briefings").update({ status: "sent", sent_at: now.toISOString() }).eq("id", b.id);
    await service
      .from("user_events")
      .update({ status: "sent", delivered_at: now.toISOString() })
      .eq("user_id", b.user_id)
      .eq("delivery", "briefing")
      .eq("status", "pending")
      .lte("created_at", b.window_end);
  }
  return { sent, failed };
}
