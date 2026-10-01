// View models for the app screens (UX_SPEC.md §4). Step 5 fills them from
// mock.ts; Step 6 swaps in real queries that return these same shapes.
// Money is integer cents; times are ISO strings.

export type Priority = "high" | "normal" | "low";

/** Buckets for the Type filter and the row icon. */
export type MoveKind = "launch" | "price" | "sale" | "stock" | "promo" | "page" | "undercut";

export type BundleItem = { title: string; price: number | null };

export type Move = {
  id: string;
  competitorId: string;
  competitorName: string;
  competitorDomain?: string;
  kind: MoveKind;
  priority: Priority;
  summary: string;
  at: string;
  /** Launches/sales grouped into one move ("Launched 5 products"). */
  bundle?: BundleItem[];
  /** One-line interpretation (high-priority moves; DESIGN_TO_COMPONENTS D2). */
  meaning?: string;
  comparedWithYours?: string;
};

export type CompetitorStatus = "watching" | "pages_only" | "cant_reach";

export type CatalogStats = {
  products: number | null;
  /** True when we stopped at the 25,000-product ceiling. */
  productsCapped?: boolean;
  onSale: number | null;
  soldOut: number | null;
  avgPrice: number | null;
};

export type CompetitorRow = {
  id: string;
  name: string;
  domain: string;
  products: number | null;
  onSale: number | null;
  moves7d: number;
  lastCheckedAt: string;
  status: CompetitorStatus;
  /** Plain-words reason for "Can't reach". */
  statusReason?: string;
};

export type WatchedPage = { label: string; url: string; changedAt: string | null };

export type CompetitorOverview = CompetitorRow & {
  movesThisWeek: number;
  addedAt: string;
  catalog: CatalogStats;
  checkIntervalHours: number;
  unreachableSince?: string;
  pages: WatchedPage[];
  comparison: { similar: number; cheaper: number } | null;
};

export type ReportItem = {
  id: string;
  title: string;
  url: string;
  image: string | null;
  price: number | null;
  compareAtPrice?: number;
  pctOff?: number;
  /** Launch date, or the sold-out date once we have history (D4). */
  date?: string;
};

export type ReportList = { items: ReportItem[]; total: number };

export type Undercut = { title: string; yourTitle: string; price: number; yourPrice: number };

export type FirstReport = {
  competitor: { id: string; name: string; domain: string; platform: "shopify" | "other" };
  stats: CatalogStats;
  recentlyLaunched: ReportList;
  soldOut: ReportList;
  onSale: ReportList;
  cheaperThanYours: Undercut[] | null;
  pages: WatchedPage[];
  checkIntervalHours: number;
};

export type Account = { name: string; email: string; hasPassword: boolean };

/** products is null until the first catalog read finishes. */
export type OwnStore = { domain: string; products: number | null; checkedAt: string };

/** One top move on the Home briefing card; links to the move when we know which one it is. */
export type BriefingTopMove = {
  headline: string;
  /** Empty in the plain (no-AI) version. */
  why: string;
  competitorId: string | null;
  competitorName: string | null;
  domain: string | null;
  moveId: string | null;
};

/** A Monday briefing as sent (DESIGN 04b). */
export type Briefing = {
  id: string;
  /** The Monday it's for (YYYY-MM-DD). */
  weekStart: string;
  sentAt: string;
  moves: number;
  /** The no-AI version: no "what this means", no "why it matters". */
  plain: boolean;
  whatThisMeans: string | null;
  suggestedMove: string;
  topMoves: BriefingTopMove[];
};

export type BriefingPanel = {
  /** Sent briefings, newest first. Empty before the first Monday. */
  briefings: Briefing[];
  /** The user has added their own store (else the card offers to add it). */
  personalised: boolean;
  /** For the quiet-week line: "We checked A, B and C every 2 hours." */
  checkedStores: string[];
  checkIntervalHours: number;
};

export type HomeSummary = {
  movesThisMonth: number;
  highThisWeek: number;
  /** null when the briefing is turned off. */
  nextBriefing: { at: string; to: string; timeZone: string } | null;
  setup: { ownStore: boolean; competitor: boolean; alerts: boolean };
};

export type MutableAlertType =
  | "sitewide_sale_detected"
  | "promo_launched"
  | "price_undercut"
  | "sale_started"
  | "product_launched"
  | "sold_out";

export type Settings = {
  emailAlerts: boolean;
  sendTo: string;
  slackConnected: boolean;
  alertTypes: Record<MutableAlertType, boolean>;
  briefing: { enabled: boolean; hour: number; timeZone: string };
  ownStore: OwnStore | null;
  plan: { label: string; foundingMember: boolean; competitors: number; checkIntervalHours: number; slack: boolean };
  account: Account;
};

/** A store added during onboarding, with its first-read status. */
export type OnboardingItem = {
  id: string;
  name: string;
  domain: string;
  status: "ready" | "reading" | "pages" | "failed";
  products: number | null;
};
