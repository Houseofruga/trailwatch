import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModelCall } from "@/features/ai/fastModel";
import { recordEvents } from "@/features/events/record";
import type { NewEvent } from "@/features/events/types";
import { aiTokensToday, recordAiUsage, type AiFeature } from "@/features/usage/record";
import { positionEvent } from "./annotate";
import { matchStatus, shortlist, verdictKey, type Classified } from "./candidates";
import { classifyBatch, classInputHash, obviousClass, relevantFirst, type ProductClass } from "./classify";
import { MATCHING_CONFIG } from "./config";
import { judgeBatch } from "./judge";
import { loadClasses, loadPairs, loadVerdicts, matchingOwners, saveClasses, snapshotProducts } from "./store";

// The matching step of the cron tick (A1, A3): classify the products of every
// store someone matches against, then judge shortlisted pairs. Both are cached,
// so a tick only pays for what's new or changed, and work left when the time
// budget runs out (or the model is rate-limited) resumes on the next tick.

export type MatchingTickResult = { classified: number; judged: number; events: number; stopped?: string };

type StoreRow = { id: string; latest_snapshot_id: string | null; classified_snapshot_id: string | null };

async function logCalls(service: SupabaseClient, feature: AiFeature, storeId: string, calls: ModelCall[]) {
  await recordAiUsage(
    service,
    calls.map((c) => ({ feature, provider: c.provider, model: c.model, usage: c.usage, storeId })),
  );
}

export async function runMatchingTick(service: SupabaseClient, budgetMs = MATCHING_CONFIG.tickBudgetMs): Promise<MatchingTickResult> {
  const deadline = Date.now() + budgetMs;
  const result: MatchingTickResult = { classified: 0, judged: 0, events: 0 };
  const owners = await matchingOwners(service);
  const storeIds = [...new Set(owners.flatMap((o) => [o.ownStoreId, ...o.compStoreIds]))];
  if (storeIds.length === 0) return result;

  const { data: stores } = await service
    .from("stores")
    .select("id, latest_snapshot_id, classified_snapshot_id")
    .in("id", storeIds)
    .eq("platform", "shopify");
  const byId = new Map((stores ?? []).map((s: StoreRow) => [s.id, s]));
  const products = new Map<string, Awaited<ReturnType<typeof snapshotProducts>>>();
  const productsOf = async (s: StoreRow) => {
    if (!products.has(s.id)) products.set(s.id, await snapshotProducts(service, s.latest_snapshot_id));
    return products.get(s.id) ?? null;
  };

  // Daily token budget (free tier): checked before every model call.
  let tokensUsed = await aiTokensToday(service, ["match_classify", "match_judge"]);
  const outOfTokens = () => tokensUsed + MATCHING_CONFIG.callTokenReserve > MATCHING_CONFIG.dailyTokenBudget;
  const spend = (calls: ModelCall[]) => {
    for (const c of calls) tokensUsed += c.usage.inputTokens + c.usage.outputTokens;
  };

  // Own stores first, then competitors with the kinds of products you sell first.
  const ownIds = new Set(owners.map((o) => o.ownStoreId));
  const ownTypes = new Set<string>();
  for (const id of ownIds) {
    const s = byId.get(id);
    for (const p of (s && (await productsOf(s))) ?? []) if (p.productType.trim()) ownTypes.add(p.productType.trim().toLowerCase());
  }
  const storeOrder = [...byId.values()].sort((a, b) => Number(ownIds.has(b.id)) - Number(ownIds.has(a.id)));

  try {
    // 1. Classify each store's latest catalog.
    for (const s of storeOrder) {
      if (!s.latest_snapshot_id || s.latest_snapshot_id === s.classified_snapshot_id) continue;
      if (Date.now() > deadline) return { ...result, stopped: "budget" };
      const latest = await productsOf(s);
      if (!latest) continue;
      const catalog = ownIds.has(s.id) ? latest : relevantFirst(latest, ownTypes);
      const known = await loadClasses(service, s.id);
      const todo = catalog.filter((p) => known.get(p.id)?.hash !== classInputHash(p));

      const obvious = todo.flatMap((p) => {
        const cls = obviousClass(p);
        return cls ? [{ productId: p.id, hash: classInputHash(p), cls }] : [];
      });
      await saveClasses(service, s.id, obvious);
      result.classified += obvious.length;
      const rest = todo.filter((p) => !obviousClass(p));

      let done = true;
      for (let i = 0; i < rest.length; i += MATCHING_CONFIG.classifyBatch) {
        if (Date.now() > deadline) {
          done = false;
          break;
        }
        if (outOfTokens()) return { ...result, stopped: "daily tokens" };
        const batch = rest.slice(i, i + MATCHING_CONFIG.classifyBatch);
        const { classes, calls } = await classifyBatch(batch);
        spend(calls);
        await logCalls(service, "match_classify", s.id, calls);
        if (classes.size === 0) {
          done = false; // the call failed outright: try the batch again next tick
          continue;
        }
        // Products the model skipped while answering the rest become "other",
        // so one odd product can't hold back the whole store.
        const OTHER: ProductClass = { category: "other", subcategory: "other", use: "", attributes: [], packType: "single" };
        await saveClasses(
          service,
          s.id,
          batch.map((p, j) => ({ productId: p.id, hash: classInputHash(p), cls: classes.get(j) ?? OTHER })),
        );
        result.classified += batch.length;
      }
      if (done) {
        await service.from("stores").update({ classified_snapshot_id: s.latest_snapshot_id }).eq("id", s.id);
        s.classified_snapshot_id = s.latest_snapshot_id;
      } else if (Date.now() > deadline) {
        return { ...result, stopped: "budget" };
      }
    }

    // 2. Judge pairs for each (own store, competitor store).
    const pairsToDo = new Map<string, { own: string; comp: string; userIds: string[] }>();
    for (const o of owners) {
      for (const comp of o.compStoreIds) {
        const key = `${o.ownStoreId}:${comp}`;
        const entry = pairsToDo.get(key) ?? { own: o.ownStoreId, comp, userIds: [] };
        entry.userIds.push(o.userId);
        pairsToDo.set(key, entry);
      }
    }
    for (const { own, comp, userIds } of pairsToDo.values()) {
      const os = byId.get(own);
      const cs = byId.get(comp);
      // Both catalogs must be fully classified at their latest snapshot.
      if (!os?.latest_snapshot_id || !cs?.latest_snapshot_id) continue;
      if (os.classified_snapshot_id !== os.latest_snapshot_id || cs.classified_snapshot_id !== cs.latest_snapshot_id) continue;
      const { data: state } = await service
        .from("match_state")
        .select("own_snapshot_id, comp_snapshot_id")
        .eq("own_store_id", own)
        .eq("comp_store_id", comp)
        .maybeSingle();
      if (state?.own_snapshot_id === os.latest_snapshot_id && state?.comp_snapshot_id === cs.latest_snapshot_id) continue;
      if (Date.now() > deadline) return { ...result, stopped: "budget" };

      const [ownProducts, compProducts, ownClasses, compClasses] = await Promise.all([
        productsOf(os),
        productsOf(cs),
        loadClasses(service, own),
        loadClasses(service, comp),
      ]);
      if (!ownProducts || !compProducts) continue;
      const classified = (list: typeof ownProducts, classes: typeof ownClasses): Classified[] =>
        list.flatMap((p) => {
          const c = classes.get(p.id);
          return c ? [{ product: p, cls: c as ProductClass }] : [];
        });
      const candidates = shortlist(classified(ownProducts, ownClasses), classified(compProducts, compClasses));
      const hashOf = (c: (typeof candidates)[number]) => `${ownClasses.get(c.own.product.id)?.hash}:${compClasses.get(c.comp.product.id)?.hash}`;
      const existing = new Map((await loadPairs(service, own, comp)).map((p) => [verdictKey(p.ownProductId, p.compProductId), p]));
      const todo = candidates.filter((c) => existing.get(verdictKey(c.own.product.id, c.comp.product.id))?.pairHash !== hashOf(c));

      let done = true;
      const newlyActive: (typeof candidates)[number][] = [];
      const judgedConfidence = new Map<string, { confidence: number; reason: string }>();
      for (let i = 0; i < todo.length; i += MATCHING_CONFIG.judgeBatch) {
        if (Date.now() > deadline) {
          done = false;
          break;
        }
        if (outOfTokens()) {
          done = false;
          result.stopped = "daily tokens";
          break;
        }
        const batch = todo.slice(i, i + MATCHING_CONFIG.judgeBatch);
        const { judgements, calls } = await judgeBatch(batch);
        spend(calls);
        await logCalls(service, "match_judge", comp, calls);
        if (judgements.size === 0) {
          done = false; // the call failed outright: try again next tick
          continue;
        }
        // A pair skipped while the rest were answered counts as not comparable.
        const rows = batch.map((c, j) => {
          const jd = judgements.get(j) ?? { confidence: 0, reason: "Not judged" };
          judgedConfidence.set(verdictKey(c.own.product.id, c.comp.product.id), jd);
          if (jd.confidence >= MATCHING_CONFIG.highConfidence) newlyActive.push(c);
          return {
            own_store_id: own,
            own_product_id: c.own.product.id,
            comp_store_id: comp,
            comp_product_id: c.comp.product.id,
            pair_hash: hashOf(c),
            confidence: jd.confidence,
            reason: jd.reason,
            judged_at: new Date().toISOString(),
          };
        });
        if (rows.length) {
          const { error } = await service.from("product_matches").upsert(rows);
          if (error) throw new Error(`Couldn't save matches: ${error.message}`);
        }
        result.judged += rows.length;
      }

      result.events += await launchEvents(service, comp, own, userIds, newlyActive, judgedConfidence);

      if (done) {
        // Pairs that are no longer candidates (a product changed or left) go.
        const keep = new Set(candidates.map((c) => verdictKey(c.own.product.id, c.comp.product.id)));
        for (const p of existing.values()) {
          if (keep.has(verdictKey(p.ownProductId, p.compProductId))) continue;
          await service
            .from("product_matches")
            .delete()
            .match({ own_store_id: own, own_product_id: p.ownProductId, comp_store_id: comp, comp_product_id: p.compProductId });
        }
        await service.from("match_state").upsert({
          own_store_id: own,
          comp_store_id: comp,
          own_snapshot_id: os.latest_snapshot_id,
          comp_snapshot_id: cs.latest_snapshot_id,
          matched_at: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    // Usually a rate limit: keep what's saved and pick up next tick.
    return { ...result, stopped: err instanceof Error ? err.message.slice(0, 200) : "error" };
  }
  return result;
}

/**
 * A4, launch case: a newly matched competitor product, published within the
 * launch window, priced below yours like for like. Once per user and product.
 */
async function launchEvents(
  service: SupabaseClient,
  compStoreId: string,
  ownStoreId: string,
  userIds: string[],
  newlyActive: { own: Classified; comp: Classified }[],
  judged: Map<string, { confidence: number; reason: string }>,
): Promise<number> {
  const since = Date.now() - MATCHING_CONFIG.launchWindowDays * 24 * 60 * 60 * 1000;
  const recent = newlyActive.filter((c) => {
    const at = Date.parse(c.comp.product.publishedAt ?? c.comp.product.createdAt ?? "");
    return Number.isFinite(at) && at >= since;
  });
  if (recent.length === 0) return 0;

  const events: NewEvent[] = [];
  for (const userId of userIds) {
    const verdicts = await loadVerdicts(service, userId, ownStoreId, compStoreId);
    for (const c of recent) {
      const key = verdictKey(c.own.product.id, c.comp.product.id);
      const jd = judged.get(key)!;
      if (matchStatus(jd.confidence, verdicts.get(key)) !== "active") continue;
      const { count } = await service
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("store_id", compStoreId)
        .eq("type", "price_position_change")
        .eq("product_id", c.comp.product.id)
        .eq("for_user_id", userId);
      if (count) continue;
      const pair = { ownProductId: c.own.product.id, compProductId: c.comp.product.id, ...jd };
      const e = positionEvent(userId, c.comp.product, c.own.product, pair, "product_launched");
      if (e) events.push(e);
    }
  }
  return events.length ? recordEvents(service, compStoreId, events) : 0;
}
