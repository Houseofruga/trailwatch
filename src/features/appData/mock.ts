// Mock data for UI Step 5 (trailwatch-shopify-ui-prompt.md): real numbers from
// the 2026-09-30 crawl of three Shopify stores, fictional brand names. Times
// are relative to "now" so labels ("2h ago", "Yesterday") match the designs.
// Step 6 replaces these functions with real queries of the same shape.

import { dayKey, shortDate } from "./format";
import type {
  Account,
  CompetitorOverview,
  CompetitorRow,
  FirstReport,
  HomeSummary,
  Move,
  OwnStore,
  ReportItem,
  Settings,
  WatchedPage,
} from "./types";

const HOUR = 3_600_000;
const hoursAgo = (h: number) => new Date(Date.now() - h * HOUR).toISOString();
/** A given clock time (US Eastern) `days` days ago. */
function daysAgoAt(days: number, time: string): string {
  const key = dayKey(new Date(Date.now() - days * 24 * HOUR));
  return new Date(`${key}T${time}:00-04:00`).toISOString();
}

export const MOCK_ACCOUNT: Account = { name: "Jo", email: "jo@glowfield.com", hasPassword: true };
export const MOCK_OWN_STORE: OwnStore = { domain: "glowfield.com", products: 214, checkedAt: hoursAgo(3) };

const pages = (domain: string): WatchedPage[] => [
  { label: "Homepage", url: `https://${domain}/`, changedAt: daysAgoAt(5, "11:30") },
  { label: "Sale page", url: `https://${domain}/collections/sale`, changedAt: daysAgoAt(0, "09:10") },
  { label: "Shipping policy", url: `https://${domain}/policies/shipping-policy`, changedAt: daysAgoAt(18, "10:05") },
  { label: "Returns policy", url: `https://${domain}/policies/refund-policy`, changedAt: daysAgoAt(31, "14:00") },
];

const COMPETITORS: CompetitorOverview[] = [
  {
    id: "hearth-and-pine",
    name: "Hearth & Pine",
    domain: "hearthandpine.com",
    products: 1632,
    onSale: 199,
    moves7d: 38,
    movesThisWeek: 38,
    lastCheckedAt: hoursAgo(14 / 60),
    status: "watching",
    addedAt: daysAgoAt(40, "10:00"),
    catalog: { products: 1632, onSale: 199, soldOut: 203, avgPrice: 24769 },
    checkIntervalHours: 2,
    pages: pages("hearthandpine.com"),
    comparison: { similar: 12, cheaper: 3 },
  },
  {
    id: "dewlane",
    name: "Dewlane",
    domain: "dewlane.com",
    products: 313,
    onSale: 78,
    moves7d: 3,
    movesThisWeek: 0,
    lastCheckedAt: hoursAgo(1),
    status: "watching",
    addedAt: daysAgoAt(45, "10:00"),
    catalog: { products: 313, onSale: 78, soldOut: 27, avgPrice: 17370 },
    checkIntervalHours: 2,
    pages: pages("dewlane.com"),
    comparison: { similar: 9, cheaper: 3 },
  },
  {
    id: "northwind-knits",
    name: "Northwind Knits",
    domain: "northwindknits.com",
    products: 692,
    onSale: 144,
    moves7d: 1,
    movesThisWeek: 1,
    lastCheckedAt: hoursAgo(32 / 60),
    status: "watching",
    addedAt: daysAgoAt(30, "10:00"),
    catalog: { products: 692, onSale: 144, soldOut: 260, avgPrice: 9425 },
    checkIntervalHours: 2,
    pages: pages("northwindknits.com"),
    comparison: null,
  },
  {
    id: "oakline-goods",
    name: "Oakline Goods",
    domain: "oaklinegoods.com",
    products: null,
    onSale: null,
    moves7d: 0,
    movesThisWeek: 0,
    lastCheckedAt: hoursAgo(2),
    status: "pages_only",
    addedAt: daysAgoAt(20, "10:00"),
    catalog: { products: null, onSale: null, soldOut: null, avgPrice: null },
    checkIntervalHours: 2,
    pages: pages("oaklinegoods.com"),
    comparison: null,
  },
  {
    id: "peak-tonic",
    name: "Peak Tonic",
    domain: "peaktonic.com",
    products: 540,
    onSale: null,
    moves7d: 0,
    movesThisWeek: 0,
    lastCheckedAt: daysAgoAt(2, "09:00"),
    status: "cant_reach",
    statusReason: `We couldn't open peaktonic.com since ${shortDate(daysAgoAt(2, "09:00"))}. We'll keep trying every 2 hours.`,
    unreachableSince: daysAgoAt(2, "09:00"),
    addedAt: daysAgoAt(25, "10:00"),
    catalog: { products: 540, onSale: null, soldOut: null, avgPrice: 4120 },
    checkIntervalHours: 2,
    pages: pages("peaktonic.com"),
    comparison: null,
  },
];

const BOUCLE = ["Ink", "Tobacco", "Sage", "Oat", "Rust"].map((c) => ({ title: `Boucle Ball Pillow (${c})`, price: 7900 }));

const HP = { competitorId: "hearth-and-pine", competitorName: "Hearth & Pine" };
const DW = { competitorId: "dewlane", competitorName: "Dewlane" };
const NK = { competitorId: "northwind-knits", competitorName: "Northwind Knits" };
const OG = { competitorId: "oakline-goods", competitorName: "Oakline Goods" };
const PT = { competitorId: "peak-tonic", competitorName: "Peak Tonic" };

/** The first page of moves, as drawn on 04-Home / populated. */
const HEADLINE_MOVES: Move[] = [
  {
    id: "m1",
    ...HP,
    kind: "sale",
    priority: "high",
    summary: "Sitewide sale: 34% of products discounted, up to −60%",
    at: hoursAgo(2),
    meaning:
      "Their biggest sale since you started watching. Most of it is bedding, so shoppers will be comparing duvet prices this week.",
    comparedWithYours: "Honeycomb Duvet Cover is now $108 (was $269). Your Waffle Duvet Cover is $189, $81 more.",
  },
  {
    id: "m2",
    ...DW,
    kind: "undercut",
    priority: "high",
    summary: "Cheaper than you: Linen Duvet Cover is $169, yours is $189",
    at: hoursAgo(5),
    meaning: "Dewlane rarely moves prices, so this is a deliberate cut on your best-selling category.",
  },
  {
    id: "m3",
    ...HP,
    kind: "launch",
    priority: "high",
    summary: "Launched 5 products: Boucle Ball Pillow (Ink), (Tobacco), +3",
    at: daysAgoAt(1, "09:40"),
    bundle: BOUCLE,
    meaning: "One pillow in five colours at $79 each. Expect them to push it in their holiday emails.",
  },
  { id: "m4", ...DW, kind: "stock", priority: "normal", summary: "Wideboy Clock sold out", at: daysAgoAt(1, "08:02") },
  { id: "m5", ...NK, kind: "page", priority: "normal", summary: "Changed the returns policy", at: daysAgoAt(3, "13:15") },
  {
    id: "m6",
    ...DW,
    kind: "price",
    priority: "normal",
    summary: "Price change: Luxe Sateen Flat Sheet $86 → $77.40",
    at: daysAgoAt(4, "10:20"),
  },
  {
    id: "m7",
    ...HP,
    kind: "promo",
    priority: "normal",
    summary: "New messaging on the homepage: 'Sleep cooler all year'",
    at: daysAgoAt(5, "11:30"),
  },
  {
    id: "m8",
    ...HP,
    kind: "launch",
    priority: "normal",
    summary: "Launched Organic Rib Knit Throw (Garnet) at $99",
    at: daysAgoAt(6, "16:12"),
  },
  { id: "m9", ...HP, kind: "stock", priority: "low", summary: "Mosaic Washcloth Set sold out", at: daysAgoAt(6, "08:02") },
  {
    id: "m10",
    ...NK,
    kind: "stock",
    priority: "low",
    summary: "Back in stock: Women's Trail Runner Mid Waterproof - Stony Cream/Rugged Beige (Stony Cream Sole)",
    at: daysAgoAt(7, "07:15"),
  },
];

// Older moves to fill pages 2–4 (37 this month in total).
const FILLER: Move[] = Array.from({ length: 27 }, (_, i) => {
  const who = [HP, HP, HP, NK, DW, OG, PT][i % 7];
  const kinds = [
    { kind: "sale" as const, summary: `Sale started: Linen Box Quilt $309 → $247 (−20%)` },
    { kind: "price" as const, summary: "Price change: Percale Sheet Set $189 → $169" },
    { kind: "stock" as const, summary: "Relaxed Cotton Sham Set (Pebble) sold out" },
    { kind: "launch" as const, summary: "Launched Terry Stripe Slippers (Moss and Peacock) at $59" },
    { kind: "page" as const, summary: "Changed the shipping policy: free shipping now over $150 (was $100)" },
  ][i % 5];
  return {
    id: `f${i}`,
    ...who,
    ...kinds,
    priority: i % 4 === 0 ? ("low" as const) : ("normal" as const),
    at: daysAgoAt(8 + Math.floor(i / 2), i % 2 ? "15:20" : "10:05"),
  };
});

/** Busy week (04-Home / busy week): extra Hearth & Pine moves on top. */
const BUSY_EXTRA: Move[] = [
  {
    id: "b1",
    ...HP,
    kind: "sale",
    priority: "high",
    summary: "Sale started on 12 products: Honeycomb Duvet Cover $269 → $108, +11",
    at: hoursAgo(2.1),
    bundle: [
      { title: "Honeycomb Duvet Cover - FINAL SALE (Soft Black and Natural)", price: 10800 },
      { title: "Desert Lumbar Pillow Cover - FINAL SALE (Ivory)", price: 3560 },
      { title: "Essential Cotton Euro Sham - FINAL SALE (Sage)", price: 2360 },
      { title: "Organic Keys Jacquard Bolster Pillow Cover - FINAL SALE (Dusk and Evergreen)", price: 6400 },
    ],
  },
  {
    id: "b2",
    ...HP,
    kind: "sale",
    priority: "high",
    summary: "Breezeweave Crinkle Cotton Sham Set - Last Call: $89 → $13.35 (−85%)",
    at: hoursAgo(6),
    meaning: "Last Call pricing means they're clearing the line, not cutting prices for good.",
  },
];

export async function getAccount(): Promise<Account> {
  return MOCK_ACCOUNT;
}

export async function getOwnStore(): Promise<OwnStore | null> {
  return MOCK_OWN_STORE;
}

export async function listCompetitors(): Promise<CompetitorRow[]> {
  return COMPETITORS;
}

export async function getCompetitorOverview(id: string): Promise<CompetitorOverview | null> {
  return COMPETITORS.find((c) => c.id === id) ?? null;
}

export async function listMoves(opts: { competitorId?: string; busy?: boolean } = {}): Promise<Move[]> {
  const all = [...(opts.busy ? BUSY_EXTRA : []), ...HEADLINE_MOVES, ...FILLER];
  const moves = opts.competitorId ? all.filter((m) => m.competitorId === opts.competitorId) : all;
  return moves.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

/** Moves for a competitor's timeline (06-Competitor detail): theirs, including the busy week. */
export async function listCompetitorMoves(id: string): Promise<Move[]> {
  if (id === "hearth-and-pine") return listMoves({ competitorId: id, busy: true });
  if (id === "oakline-goods")
    return [
      { id: "o1", ...OG, kind: "page", priority: "normal", summary: 'Changed the sale page: new "Fall Edit" banner', at: daysAgoAt(1, "15:20") },
      {
        id: "o2",
        ...OG,
        kind: "page",
        priority: "normal",
        summary: "Changed the shipping policy: free shipping now over $150 (was $100)",
        at: daysAgoAt(18, "10:05"),
      },
    ];
  if (id === "peak-tonic")
    return [{ id: "p1", ...PT, kind: "price", priority: "normal", summary: "Price change: 14 products, average −12%", at: daysAgoAt(5, "14:40") }];
  if (id === "dewlane") return []; // quiet: nothing in 30 days
  return listMoves({ competitorId: id });
}

export async function getHomeSummary(): Promise<HomeSummary> {
  const nextMonday = new Date();
  nextMonday.setDate(nextMonday.getDate() + ((8 - nextMonday.getDay()) % 7 || 7));
  return {
    movesThisMonth: 37,
    highThisWeek: 4,
    nextBriefing: { at: new Date(`${dayKey(nextMonday)}T08:00:00-04:00`).toISOString(), to: MOCK_ACCOUNT.email, timeZone: "America/New_York" },
    setup: { ownStore: true, competitor: true, alerts: false },
  };
}

const item = (id: string, title: string, price: number, extra: Partial<ReportItem> = {}): ReportItem => ({
  id,
  title,
  url: `https://dewlane.com/products/${id}`,
  image: null,
  price,
  ...extra,
});

export async function getFirstReport(id: string): Promise<FirstReport | null> {
  const c = COMPETITORS.find((x) => x.id === id);
  if (!c) return null;
  return {
    competitor: { id: c.id, name: c.name, domain: c.domain, platform: c.status === "pages_only" ? "other" : "shopify" },
    stats: c.catalog,
    checkIntervalHours: c.checkIntervalHours,
    pages: c.pages,
    recentlyLaunched: {
      total: 8,
      items: [
        item("linen-duvet-cover", "Linen Duvet Cover", 16900, { date: daysAgoAt(8, "10:00") }),
        item(
          "organic-keys-bolster",
          "Organic Keys Jacquard Bolster Pillow Cover - FINAL SALE (Dusk and Evergreen)",
          6400,
          { date: daysAgoAt(11, "10:00") },
        ),
        item("mosaic-washcloth-set", "Mosaic Washcloth Set", 3800, { date: daysAgoAt(12, "10:00") }),
        item("marlow-mini-pillow", "Marlow Mini Pillow - Last Call", 2100, { date: daysAgoAt(18, "10:00") }),
        item("luxe-sateen-flat-sheet", "Luxe Sateen Flat Sheet - Last Call", 7740, { date: daysAgoAt(19, "10:00") }),
        item("dreamweave-hand-towels", "Dreamweave Waffle Hand Towels Set of 2 - Last Call", 2940, { date: daysAgoAt(19, "10:00") }),
        item("wideboy-clock", "Wideboy Clock - Last Call", 2950, { date: daysAgoAt(19, "10:00") }),
        item("plush-bath-towels", "Plush Turkish Cotton Bath Towels Set of 2 - Last Call", 5300, { date: daysAgoAt(20, "10:00") }),
      ],
    },
    soldOut: {
      total: 27,
      items: [
        item("wideboy-clock", "Wideboy Clock - Last Call", 2950, { date: daysAgoAt(1, "10:00") }),
        item("mosaic-washcloth-set", "Mosaic Washcloth Set", 3800, { date: daysAgoAt(6, "10:00") }),
        item("plush-washcloths", "Plush Turkish Cotton Washcloths Set of 2 - Last Call", 875),
        item("dreamweave-washcloths", "Dreamweave Waffle Washcloths Set of 2 - Last Call", 725),
      ],
    },
    onSale: {
      total: 78,
      items: [
        item("breezeweave-sham-set", "Breezeweave Crinkle Cotton Sham Set - Last Call", 1335, { compareAtPrice: 8900, pctOff: 85 }),
        item("wideboy-clock", "Wideboy Clock - Last Call", 2950, { compareAtPrice: 5900, pctOff: 50 }),
        item("luxe-sateen-flat-sheet", "Luxe Sateen Flat Sheet - Last Call", 7740, { compareAtPrice: 8600, pctOff: 10 }),
        item("washed-percale-pillowcase", "Washed Classic Percale Pillowcase Set - Last Call", 1475, { compareAtPrice: 6900, pctOff: 79 }),
      ],
    },
    cheaperThanYours: [
      { title: "Linen Duvet Cover", yourTitle: "Linen Duvet Cover", price: 16900, yourPrice: 18900 },
      { title: "Percale Duvet Cover", yourTitle: "Percale Duvet Cover", price: 13900, yourPrice: 15800 },
      { title: "Sateen Duvet Cover", yourTitle: "Sateen Duvet Cover", price: 17900, yourPrice: 19500 },
    ],
  };
}

export async function getSettings(): Promise<Settings> {
  return {
    emailAlerts: true,
    sendTo: MOCK_ACCOUNT.email,
    slackConnected: false,
    alertTypes: {
      sitewide_sale_detected: true,
      promo_launched: true,
      price_undercut: true,
      sale_started: true,
      product_launched: true,
      sold_out: true,
    },
    briefing: { enabled: true, hour: 8, timeZone: "America/New_York" },
    ownStore: MOCK_OWN_STORE,
    plan: { label: "Free beta", foundingMember: true, competitors: 10, checkIntervalHours: 2, slack: true },
    account: MOCK_ACCOUNT,
  };
}
