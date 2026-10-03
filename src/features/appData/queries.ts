// Real data for the app screens (UI Step 6): the same view models mock.ts
// returns, read for the signed-in user. Reads go through RLS; alert settings
// and catalog snapshots (service-role only) are read with the service client
// after the user's access is confirmed.

import { redirect } from "next/navigation";
import { cache } from "react";
import { DEFAULT_ALERT_SETTINGS, loadAlertSettings, movesCaughtThisMonth, MUTABLE_TYPES } from "@/features/alerts/settings";
import { fallbackInterpretation, rankEvents, type BriefingInput, type BriefingInterpretation } from "@/features/briefing/content";
import { DEFAULT_BRIEFING, nextBriefingAt } from "@/features/briefing/schedule";
import { CATALOG_CONFIG } from "@/features/catalog/config";
import { buildFirstReport, type CatalogStats as StoredStats } from "@/features/catalog/firstReport";
import { downloadSnapshot } from "@/features/catalog/snapshots";
import type { CatalogProduct } from "@/features/catalog/types";
import type { EventType, Severity } from "@/features/events/types";
import { activeMatches, matchStatus, verdictKey } from "@/features/matching/candidates";
import { compareMatched } from "@/features/matching/compare";
import { loadPairs, loadVerdicts } from "@/features/matching/store";
import { headlinePrice } from "@/features/matching/units";
import { resolvePlan } from "@/features/plan/comp";
import { PLANS } from "@/features/plan/limits";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { shortDate } from "./format";
import { toMoves, type FeedRow } from "./moves";
import type { UserRole } from "./roles";
import type {
  Account,
  Briefing,
  BriefingPanel,
  CatalogStats,
  CompetitorOverview,
  CompetitorRow,
  FirstReport,
  HomeSummary,
  Move,
  MutableAlertType,
  OnboardingItem,
  OwnStore,
  ReportItem,
  Settings,
  WatchedPage,
} from "./types";

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

const PAGE_LABEL: Record<string, string> = {
  homepage: "Homepage",
  sale: "Sale page",
  shipping_policy: "Shipping policy",
  refund_policy: "Returns policy",
};
const PAGE_ORDER = ["homepage", "sale", "shipping_policy", "refund_policy"];

// ------------------------------------------------------------------ the user

/** The signed-in user and their profile row, once per request. */
const me = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("users")
    .select("email, plan, own_store_id, digest_enabled, briefing_hour, briefing_time_zone, is_founding_member")
    .eq("id", user.id)
    .single();
  const email = profile?.email ?? user.email ?? "";
  const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
  const account: Account = {
    name: fullName || email.split("@")[0],
    email,
    hasPassword: (user.identities ?? []).some((i) => i.provider === "email"),
  };
  return {
    supabase,
    userId: user.id,
    account,
    plan: resolvePlan(email, profile?.plan),
    ownStoreId: (profile?.own_store_id as string | null) ?? null,
    briefing: {
      enabled: profile?.digest_enabled ?? true,
      hour: profile?.briefing_hour ?? DEFAULT_BRIEFING.hour,
      timeZone: profile?.briefing_time_zone ?? DEFAULT_BRIEFING.timeZone,
    },
    foundingMember: profile?.is_founding_member ?? true,
  };
});

export async function getAccount(): Promise<Account> {
  return (await me()).account;
}

/** The onboarding role answer, or null (also when migration 0017 isn't applied yet). */
export async function getRole(): Promise<UserRole | null> {
  const { supabase, userId } = await me();
  const { data, error } = await supabase.from("users").select("role").eq("id", userId).single();
  return error ? null : ((data?.role as UserRole | null) ?? null);
}

// ------------------------------------------------------------------ stores

type StoreRow = {
  id: string;
  domain: string;
  name: string;
  platform: "shopify" | "generic";
  catalog_stats: StoredStats | null;
  check_status: "ok" | "error" | "skipped" | null;
  check_error: string | null;
  last_checked_at: string | null;
  latest_snapshot_id: string | null;
  created_at: string;
};
const STORE_COLUMNS =
  "id, domain, name, platform, catalog_stats, check_status, check_error, last_checked_at, latest_snapshot_id, created_at";

const toStats = (s: StoredStats | null): CatalogStats => ({
  products: s?.productCount ?? null,
  onSale: s?.onSaleCount ?? null,
  soldOut: s?.soldOutCount ?? null,
  avgPrice: s?.avgPrice ?? null,
});

export const getOwnStore = cache(async (): Promise<OwnStore | null> => {
  const { supabase, ownStoreId } = await me();
  if (!ownStoreId) return null;
  const { data } = await supabase.from("stores").select(STORE_COLUMNS).eq("id", ownStoreId).maybeSingle<StoreRow>();
  if (!data) return null;
  return {
    domain: data.domain,
    products: data.catalog_stats?.productCount ?? null,
    checkedAt: data.last_checked_at ?? data.created_at,
  };
});

/** The user's competitors (pivot rows only: followed stores), newest first. */
const followed = cache(async () => {
  const { supabase } = await me();
  const { data, error } = await supabase
    .from("competitors")
    .select(`id, name, created_at, store_id, stores(${STORE_COLUMNS})`)
    .not("store_id", "is", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Couldn't load competitors: ${error.message}`);
  type Row = { id: string; name: string; created_at: string; store_id: string; stores: StoreRow | StoreRow[] | null };
  return ((data ?? []) as Row[])
    .map((r) => ({ id: r.id, name: r.name, addedAt: r.created_at, store: Array.isArray(r.stores) ? r.stores[0] : r.stores }))
    .filter((r): r is { id: string; name: string; addedAt: string; store: StoreRow } => !!r.store);
});

/** When a store last read cleanly (its latest snapshot), for "can't reach since …". */
async function lastGoodRead(storeIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (storeIds.length === 0) return map;
  const { supabase } = await me();
  const { data } = await supabase
    .from("catalog_snapshots")
    .select("store_id, fetched_at")
    .in("store_id", storeIds)
    .order("fetched_at", { ascending: false });
  for (const r of data ?? []) if (!map.has(r.store_id)) map.set(r.store_id, r.fetched_at);
  return map;
}

function toRow(
  c: { id: string; name: string; store: StoreRow },
  moves7d: number,
  interval: number,
  since: string | undefined,
): CompetitorRow & { unreachableSince?: string } {
  const s = c.store;
  const cantReach = s.check_status === "error";
  const unreachableSince = cantReach ? (since ?? s.created_at) : undefined;
  return {
    id: c.id,
    name: c.name,
    domain: s.domain,
    products: s.catalog_stats?.productCount ?? null,
    onSale: s.catalog_stats?.onSaleCount ?? null,
    moves7d,
    lastCheckedAt: s.last_checked_at ?? s.created_at,
    status: s.platform !== "shopify" ? "pages_only" : cantReach ? "cant_reach" : "watching",
    statusReason: unreachableSince
      ? `We couldn't open ${s.domain} since ${shortDate(unreachableSince)}. We'll keep trying every ${interval} hours.`
      : undefined,
    unreachableSince,
  };
}

export const listCompetitors = cache(async (): Promise<CompetitorRow[]> => {
  const { plan } = await me();
  const rows = await followed();
  const [week, since] = await Promise.all([
    listMoves({ sinceDays: 7 }),
    lastGoodRead(rows.filter((r) => r.store.check_status === "error").map((r) => r.store.id)),
  ]);
  const interval = PLANS[plan].checkIntervalHours;
  return rows.map((c) =>
    toRow(c, week.filter((m) => m.competitorId === c.id).length, interval, since.get(c.store.id)),
  );
});

// ------------------------------------------------------------------ moves

type UserEventRow = {
  store_id: string;
  created_at: string;
  context: { ownMatch?: { title: string; price: number | null } } | null;
  events: {
    id: string;
    type: EventType;
    severity: Severity;
    payload: Record<string, unknown>;
    detected_at: string;
    snapshot_id: string | null;
    meaning: string | null;
  } | null;
};

/** The user's moves, newest first: Home's feed, or one competitor's timeline. */
export async function listMoves(opts: { competitorId?: string; sinceDays?: number } = {}): Promise<Move[]> {
  const { supabase } = await me();
  const competitors = await followed();
  const byStore = new Map(competitors.map((c) => [c.store.id, c]));
  const only = opts.competitorId ? competitors.find((c) => c.id === opts.competitorId) : undefined;
  if (opts.competitorId && !only) return [];

  let query = supabase
    .from("user_events")
    .select("store_id, created_at, context, events(id, type, severity, payload, detected_at, snapshot_id, meaning)")
    .gte("created_at", daysAgo(opts.sinceDays ?? 90))
    .order("created_at", { ascending: false })
    .limit(1000);
  if (only) query = query.eq("store_id", only.store.id);
  const { data, error } = await query;
  if (error) throw new Error(`Couldn't load moves: ${error.message}`);

  const rows: FeedRow[] = [];
  for (const r of (data ?? []) as unknown as UserEventRow[]) {
    const e = r.events;
    const c = byStore.get(r.store_id);
    if (!e || !c) continue; // a store the user no longer follows
    rows.push({
      eventId: e.id,
      storeId: r.store_id,
      competitorId: c.id,
      competitorName: c.name,
      competitorDomain: c.store.domain,
      type: e.type,
      severity: e.severity,
      payload: e.payload,
      detectedAt: e.detected_at,
      snapshotId: e.snapshot_id,
      meaning: e.meaning,
      ownMatch: r.context?.ownMatch ? { title: r.context.ownMatch.title, price: r.context.ownMatch.price } : null,
    });
  }
  return toMoves(rows).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

// ------------------------------------------------------------------ competitor

async function watchedPages(storeId: string): Promise<WatchedPage[]> {
  const { supabase } = await me();
  const [{ data: pages }, { data: changes }] = await Promise.all([
    supabase.from("store_pages").select("id, kind, url").eq("store_id", storeId),
    supabase
      .from("events")
      .select("store_page_id, detected_at")
      .eq("store_id", storeId)
      .not("store_page_id", "is", null)
      .neq("type", "cosmetic")
      .order("detected_at", { ascending: false })
      .limit(200),
  ]);
  const last = new Map<string, string>();
  for (const c of changes ?? []) if (!last.has(c.store_page_id)) last.set(c.store_page_id, c.detected_at);
  return (pages ?? [])
    .sort((a, b) => PAGE_ORDER.indexOf(a.kind) - PAGE_ORDER.indexOf(b.kind))
    .map((p) => ({ label: PAGE_LABEL[p.kind] ?? p.kind, url: p.url, changedAt: last.get(p.id) ?? null }));
}

async function snapshotProducts(snapshotId: string | null): Promise<CatalogProduct[] | null> {
  if (!snapshotId) return null;
  const service = createServiceClient();
  const { data: snap } = await service.from("catalog_snapshots").select("storage_path").eq("id", snapshotId).maybeSingle();
  const catalog = snap ? await downloadSnapshot(service, snap.storage_path) : null;
  return catalog?.products ?? null;
}

/** The user's own catalog, for "compared with yours". Null when there's no own store (or it isn't read yet). */
/** Their catalog against yours, from your active matches (RLS: your store's matches, your verdicts). */
async function comparison(compStoreId: string, theirs: CatalogProduct[], own: CatalogProduct[]) {
  const { supabase, userId, ownStoreId } = await me();
  if (!ownStoreId) return null;
  const [pairs, verdicts] = await Promise.all([
    loadPairs(supabase, ownStoreId, compStoreId),
    loadVerdicts(supabase, userId, ownStoreId, compStoreId),
  ]);
  return compareMatched(theirs, own, activeMatches(pairs, verdicts));
}

const ownProducts = cache(async (): Promise<CatalogProduct[] | null> => {
  const { supabase, ownStoreId } = await me();
  if (!ownStoreId) return null;
  const { data } = await supabase.from("stores").select("latest_snapshot_id").eq("id", ownStoreId).maybeSingle();
  return snapshotProducts(data?.latest_snapshot_id ?? null);
});

export async function getCompetitorOverview(id: string): Promise<CompetitorOverview | null> {
  const { plan } = await me();
  const c = (await followed()).find((x) => x.id === id);
  if (!c) return null;
  const s = c.store;
  const interval = PLANS[plan].checkIntervalHours;
  const [week, since, pages, theirs, own] = await Promise.all([
    listMoves({ competitorId: id, sinceDays: 7 }),
    s.check_status === "error" ? lastGoodRead([s.id]) : Promise.resolve(new Map<string, string>()),
    watchedPages(s.id),
    s.platform === "shopify" ? snapshotProducts(s.latest_snapshot_id) : Promise.resolve(null),
    ownProducts(),
  ]);
  const compared = theirs && own ? await comparison(s.id, theirs, own) : null;
  return {
    ...toRow(c, week.length, interval, since.get(s.id)),
    movesThisWeek: week.length,
    addedAt: c.addedAt,
    catalog: toStats(s.catalog_stats),
    checkIntervalHours: interval,
    pages,
    comparison: compared ? { similar: compared.similar, cheaper: compared.cheaper.length } : null,
  };
}

// ------------------------------------------------------------------ product matches

export type MatchListItem = {
  theirs: { id: string; title: string; price: number | null };
  yours: { id: string; title: string; price: number | null };
  confidence: number | null;
  reason: string;
  status: "active" | "possible";
  linkedByYou: boolean;
};

/**
 * One competitor's products matched to yours, for a matches view (no design
 * yet): active matches and the "possible" ones waiting for your confirmation.
 */
export async function getMatches(competitorId: string): Promise<MatchListItem[] | null> {
  const { supabase, userId, ownStoreId } = await me();
  const c = (await followed()).find((x) => x.id === competitorId);
  if (!c || !ownStoreId) return null;
  const [pairs, verdicts, theirs, own] = await Promise.all([
    loadPairs(supabase, ownStoreId, c.store.id),
    loadVerdicts(supabase, userId, ownStoreId, c.store.id),
    snapshotProducts(c.store.latest_snapshot_id),
    ownProducts(),
  ]);
  if (!theirs || !own) return [];
  const theirById = new Map(theirs.map((p) => [p.id, p]));
  const ownById = new Map(own.map((p) => [p.id, p]));
  const active = activeMatches(pairs, verdicts);
  const activeKeys = new Set([...active.values()].map((p) => verdictKey(p.ownProductId, p.compProductId)));
  const rows = [...active.values(), ...pairs.filter((p) => !activeKeys.has(verdictKey(p.ownProductId, p.compProductId)))];
  return rows.flatMap((p) => {
    const t = theirById.get(p.compProductId);
    const o = ownById.get(p.ownProductId);
    const key = verdictKey(p.ownProductId, p.compProductId);
    const status = matchStatus(p.confidence, verdicts.get(key));
    if (!t || !o || (status !== "active" && status !== "possible")) return [];
    // A product's possible matches only matter while it has no active one.
    if (status === "possible" && active.has(p.compProductId)) return [];
    return [
      {
        theirs: { id: t.id, title: t.title, price: headlinePrice(t) },
        yours: { id: o.id, title: o.title, price: headlinePrice(o) },
        confidence: p.confidence,
        reason: p.reason,
        status,
        linkedByYou: verdicts.get(key) === "confirmed",
      },
    ];
  });
}

// ------------------------------------------------------------------ first report

export type FirstReportResult = { report: FirstReport | null; reading: boolean; error: boolean };

export async function getFirstReport(competitorId: string): Promise<FirstReportResult> {
  const { plan } = await me();
  const c = (await followed()).find((x) => x.id === competitorId);
  if (!c) return { report: null, reading: false, error: false };
  const s = c.store;
  const empty = { items: [], total: 0 };
  const base: FirstReport = {
    competitor: { id: c.id, name: c.name, domain: s.domain, platform: s.platform === "shopify" ? "shopify" : "other" },
    stats: toStats(s.catalog_stats),
    recentlyLaunched: empty,
    soldOut: empty,
    onSale: empty,
    cheaperThanYours: null,
    pages: await watchedPages(s.id),
    checkIntervalHours: PLANS[plan].checkIntervalHours,
  };
  if (s.platform !== "shopify") return { report: base, reading: false, error: false };
  if (!s.latest_snapshot_id) {
    // Not read yet: still reading, unless the first read failed.
    return { report: base, reading: s.check_status !== "error", error: s.check_status === "error" };
  }

  const [products, own] = await Promise.all([snapshotProducts(s.latest_snapshot_id), ownProducts()]);
  if (!products) return { report: base, reading: false, error: true };
  const built = buildFirstReport(products);
  const url = (handle: string) => `https://${s.domain}/products/${handle}`;
  const toItem = (i: (typeof built.recentlyLaunched)[number]): ReportItem => ({
    id: i.id,
    title: i.title,
    url: url(i.handle),
    image: i.image,
    price: i.price,
    ...(i.compareAtPrice ? { compareAtPrice: i.compareAtPrice } : {}),
    ...(i.pctOff ? { pctOff: i.pctOff } : {}),
    ...(i.launchedAt ? { date: i.launchedAt } : {}),
  });
  return {
    report: {
      ...base,
      stats: {
        products: built.stats.productCount,
        productsCapped: products.length >= CATALOG_CONFIG.maxPages * CATALOG_CONFIG.pageSize,
        onSale: built.stats.onSaleCount,
        soldOut: built.stats.soldOutCount,
        avgPrice: built.stats.avgPrice,
      },
      recentlyLaunched: { items: built.recentlyLaunched.map(toItem), total: built.totals.recentlyLaunched },
      onSale: { items: built.onSaleNow.map(toItem), total: built.totals.onSaleNow },
      soldOut: { items: built.soldOut.map(toItem), total: built.totals.soldOut },
      cheaperThanYours: own ? ((await comparison(c.store.id, products, own))?.cheaper.slice(0, 50) ?? []) : null,
    },
    reading: false,
    error: false,
  };
}

// ------------------------------------------------------------------ home + settings

async function alertSettings() {
  const { userId } = await me();
  return (await loadAlertSettings(createServiceClient(), [userId])).get(userId) ?? DEFAULT_ALERT_SETTINGS;
}

/** Whether the user has saved alert settings at least once (Home's setup guide). */
async function alertsChosen(): Promise<boolean> {
  const { userId } = await me();
  const { count } = await createServiceClient()
    .from("alert_settings")
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count ?? 0) > 0;
}

export async function getHomeSummary(moves: Move[]): Promise<HomeSummary> {
  const { userId, account, briefing, ownStoreId } = await me();
  const weekAgo = Date.now() - 7 * DAY;
  const [monthCount, settings, chosen, competitors] = await Promise.all([
    movesCaughtThisMonth(createServiceClient(), userId),
    alertSettings(),
    alertsChosen(),
    followed(),
  ]);
  return {
    movesThisMonth: monthCount,
    highThisWeek: moves.filter((m) => m.priority === "high" && Date.parse(m.at) >= weekAgo).length,
    nextBriefing: briefing.enabled
      ? {
          at: nextBriefingAt(new Date(), briefing.hour, briefing.timeZone).toISOString(),
          to: settings.sendTo ?? account.email,
          timeZone: briefing.timeZone,
        }
      : null,
    setup: { ownStore: !!ownStoreId, competitor: competitors.length > 0, alerts: chosen },
  };
}

/** The Home briefing card: the user's sent briefings, newest first (DESIGN 04b). */
export async function getBriefingPanel(): Promise<BriefingPanel> {
  const { supabase, plan, ownStoreId } = await me();
  const competitors = await followed();
  const { data, error } = await supabase
    .from("briefings")
    .select("id, week_start, sent_at, input, content, ai")
    .eq("status", "sent")
    .order("week_start", { ascending: false })
    .limit(12);
  if (error) throw new Error(`Couldn't load briefings: ${error.message}`);

  const byStore = new Map(competitors.map((c) => [c.store.id, c]));
  type Row = { id: string; week_start: string; sent_at: string; input: BriefingInput; content: BriefingInterpretation | null; ai: boolean };
  const briefings = ((data ?? []) as Row[]).map((b): Briefing => {
    const ranked = rankEvents(b.input.events);
    const content = b.content ?? fallbackInterpretation(b.input);
    return {
      id: b.id,
      weekStart: b.week_start,
      sentAt: b.sent_at,
      moves: b.input.events.length,
      plain: !b.ai,
      whatThisMeans: b.ai ? content.whatThisMeans : null,
      suggestedMove: content.suggestedMove,
      topMoves: content.topMoves.map((t) => {
        // The move it's about (briefings from 2026-10 on); else guess the
        // competitor from the store name the headline starts with.
        const event = t.move ? ranked[t.move - 1] : ranked.find((e) => t.headline.startsWith(e.storeName));
        const competitor = event ? byStore.get(event.storeId) : undefined;
        return {
          headline: t.headline,
          why: b.ai ? t.whyItMatters : "",
          competitorId: competitor?.id ?? null,
          competitorName: competitor?.name ?? event?.storeName ?? null,
          domain: competitor?.store.domain ?? null,
          moveId: t.move && event?.eventId ? event.eventId : null,
        };
      }),
    };
  });
  return {
    briefings,
    personalised: !!ownStoreId,
    checkedStores: competitors.map((c) => c.name),
    checkIntervalHours: PLANS[plan].checkIntervalHours,
  };
}

export async function getSettings(): Promise<Settings> {
  const { account, briefing, plan, foundingMember } = await me();
  const [settings, ownStore] = await Promise.all([alertSettings(), getOwnStore()]);
  const config = PLANS[plan];
  return {
    emailAlerts: settings.emailInstant,
    sendTo: settings.sendTo ?? account.email,
    slackConnected: !!settings.slackWebhookUrl,
    alertTypes: Object.fromEntries(MUTABLE_TYPES.map((t) => [t, !settings.mutedTypes.includes(t)])) as Record<
      MutableAlertType,
      boolean
    >,
    briefing,
    ownStore,
    plan: {
      label: config.label,
      foundingMember,
      competitors: config.competitors,
      checkIntervalHours: config.checkIntervalHours,
      slack: config.slack,
    },
    account,
  };
}

// ------------------------------------------------------------------ onboarding

/** Each followed store's first-read status, oldest first (the order they were added). */
export async function getOnboardingStatus(): Promise<OnboardingItem[]> {
  return [...(await followed())].reverse().map((c) => {
    const s = c.store;
    const status: OnboardingItem["status"] =
      s.platform !== "shopify" ? "pages" : s.latest_snapshot_id ? "ready" : s.check_status === "error" ? "failed" : "reading";
    return { id: c.id, name: c.name, domain: s.domain, status, products: s.catalog_stats?.productCount ?? null };
  });
}

/** Added in the last 30 days: an empty timeline reads "No moves yet" rather than "quiet". */
export function addedThisMonth(addedAt: string): boolean {
  return Date.now() - Date.parse(addedAt) < 30 * DAY;
}
