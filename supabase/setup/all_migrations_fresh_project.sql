-- All migrations 0001-0026 in order, for a brand-new Supabase project (US move, 2026-10-04).
-- Paste the whole file into the SQL editor of the NEW project and run once.
-- Generated from supabase/migrations; do not edit by hand.

-- ===================================================================
-- 0001_init.sql
-- ===================================================================
-- Competitor Radar — initial schema
-- Paste into the Supabase SQL editor and run once.
-- Mirrors SPEC.md §3, with the four deltas recorded in the slice-1 plan:
--   1. changes.is_meaningful  — trivial diffs are stored, not discarded, so the
--                               "trivial edits filtered" count has something to count.
--   2. changes.filter_reason  — the reason isMeaningfulChange already returns.
--   3. excerpt_before/after   — the detail screen shows two panels, not one blob.
--   4. users rows created by trigger, not app code.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- users

create table public.users (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text not null,
  plan                text not null default 'free' check (plan in ('free', 'paid')),
  stripe_customer_id  text,
  last_digest_sent_at timestamptz,
  created_at          timestamptz not null default now()
);

-- A profile row is created by a trigger rather than by the app so that a user can
-- never land on the dashboard before their row exists.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------- competitors

create table public.competitors (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create index competitors_user_id_idx on public.competitors (user_id);

-- ---------------------------------------------------------------- pages

create table public.pages (
  id              uuid primary key default gen_random_uuid(),
  competitor_id   uuid not null references public.competitors(id) on delete cascade,
  url             text not null,
  label           text not null,
  is_active       boolean not null default true,
  last_checked_at timestamptz,
  created_at      timestamptz not null default now()
);

create index pages_competitor_id_idx on public.pages (competitor_id);
-- The daily job scans for active pages due a check.
create index pages_active_check_idx on public.pages (is_active, last_checked_at);

-- ------------------------------------------------------------ snapshots

create table public.snapshots (
  id           uuid primary key default gen_random_uuid(),
  page_id      uuid not null references public.pages(id) on delete cascade,
  content_text text not null,
  content_hash text not null,
  fetched_at   timestamptz not null default now()
);

-- The check engine's hot path: "most recent snapshot for this page".
create index snapshots_page_fetched_idx on public.snapshots (page_id, fetched_at desc);

-- pages.latest_snapshot_id is added after snapshots exists, to avoid a circular
-- table dependency at create time.
alter table public.pages
  add column latest_snapshot_id uuid references public.snapshots(id) on delete set null;

-- -------------------------------------------------------------- changes

create table public.changes (
  id               uuid primary key default gen_random_uuid(),
  page_id          uuid not null references public.pages(id) on delete cascade,
  from_snapshot_id uuid references public.snapshots(id) on delete set null,
  to_snapshot_id   uuid references public.snapshots(id) on delete set null,
  is_meaningful    boolean not null,
  filter_reason    text,
  summary          text,
  excerpt_before   text,
  excerpt_after    text,
  detected_at      timestamptz not null default now()
);

-- Every user-facing query is "meaningful changes for this page, newest first";
-- the digest and the filtered-count stat are windowed on detected_at.
create index changes_page_detected_idx on public.changes (page_id, detected_at desc);
create index changes_meaningful_idx on public.changes (page_id, is_meaningful, detected_at desc);

-- ------------------------------------------------------------------ RLS
-- Every table is owner-scoped. Child tables reach up to competitors.user_id.
-- The daily check job uses the service-role key and bypasses all of this.

alter table public.users       enable row level security;
alter table public.competitors enable row level security;
alter table public.pages       enable row level security;
alter table public.snapshots   enable row level security;
alter table public.changes     enable row level security;

create policy "read own profile" on public.users
  for select using (id = (select auth.uid()));
create policy "update own profile" on public.users
  for update using (id = (select auth.uid()));

create policy "own competitors" on public.competitors
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own pages" on public.pages
  for all using (
    exists (
      select 1 from public.competitors c
      where c.id = pages.competitor_id and c.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.competitors c
      where c.id = pages.competitor_id and c.user_id = (select auth.uid())
    )
  );

create policy "read own snapshots" on public.snapshots
  for select using (
    exists (
      select 1 from public.pages p
      join public.competitors c on c.id = p.competitor_id
      where p.id = snapshots.page_id and c.user_id = (select auth.uid())
    )
  );

create policy "read own changes" on public.changes
  for select using (
    exists (
      select 1 from public.pages p
      join public.competitors c on c.id = p.competitor_id
      where p.id = changes.page_id and c.user_id = (select auth.uid())
    )
  );


-- ===================================================================
-- 0002_paddle.sql
-- ===================================================================
-- Billing via Paddle (slice 8). We identify a user's subscription two ways:
-- the customer id (stable across subscriptions) and the current subscription id
-- (needed to cancel via the API). plan itself already lives on users (0001).
-- The unused stripe_customer_id column from 0001 is left in place for now.

alter table public.users
  add column if not exists paddle_customer_id     text,
  add column if not exists paddle_subscription_id text;


-- ===================================================================
-- 0003_settings.sql
-- ===================================================================
-- Settings: let users pause the weekly digest. Defaults to on, so existing
-- users keep receiving it. The digest job filters on this; the toggle is
-- written by a server action (service role), never trusted from the client.
alter table public.users
  add column if not exists digest_enabled boolean not null default true;


-- ===================================================================
-- 0004_lock_plan.sql
-- ===================================================================
-- Security fix: the "update own profile" policy let an authenticated user
-- update ANY column of their own users row via a direct API call — including
-- `plan`, i.e. self-upgrade to Pro without paying (violates "never trust
-- client-supplied plan/limit values").
--
-- No app code updates public.users through the user (authenticated) client:
-- every legitimate write — plan from the Paddle webhook, digest_enabled from
-- Settings, last_digest_sent_at from the digest job — goes through the service
-- role, which bypasses RLS. So authenticated users don't need UPDATE at all.
-- Drop the policy; the "read own profile" SELECT policy stays intact.
drop policy if exists "update own profile" on public.users;


-- ===================================================================
-- 0005_page_insights.sql
-- ===================================================================
-- Day-0 value: an instant AI "baseline profile" of each page we start watching
-- (positioning, pricing tiers, what-to-watch), generated once from the page's
-- first snapshot and cached here so the user sees value immediately instead of an
-- empty dashboard. One row per page; regenerated only if deleted.

create table public.page_insights (
  page_id      uuid primary key references public.pages(id) on delete cascade,
  profile      jsonb not null,
  model        text,
  generated_at timestamptz not null default now()
);

-- Owner-scoped reads, same shape as snapshots/changes (child reaches up to
-- competitors.user_id). Writes go through the service-role key (see
-- src/features/insights/generate.ts), which bypasses RLS — so, like snapshots,
-- only a SELECT policy is needed.
alter table public.page_insights enable row level security;

create policy "read own page_insights" on public.page_insights
  for select using (
    exists (
      select 1 from public.pages p
      join public.competitors c on c.id = p.competitor_id
      where p.id = page_insights.page_id and c.user_id = (select auth.uid())
    )
  );


-- ===================================================================
-- 0006_change_source.sql
-- ===================================================================
-- Phase 2: historical backfill from the Wayback Machine.
-- Backfilled changes are recorded as ordinary `changes` rows so the existing
-- change-detail UI renders them, but tagged with a source so they can be kept
-- out of the live "this week" feed and the weekly email, and dated to the
-- archive capture rather than "now".

-- 'live'  — detected by the daily/ manual check engine (the default).
-- 'archive' — reconstructed from an Internet Archive capture pair.
alter table public.changes
  add column source text not null default 'live' check (source in ('live', 'archive'));

-- The "before" capture date for an archive change. Live rows leave this null and
-- keep deriving the before-date from from_snapshot.fetched_at; archive rows have
-- no snapshot rows, so they carry the date here instead.
alter table public.changes
  add column compared_from_at timestamptz;

-- When we last attempted a Wayback backfill for this page (null = never). Set
-- before the work runs so it happens at most once, even on a thin/empty archive.
alter table public.pages
  add column backfilled_at timestamptz;

-- Fast "this page's archive history, newest first" reads for the history panel.
create index changes_page_source_detected_idx
  on public.changes (page_id, source, detected_at desc);


-- ===================================================================
-- 0007_page_status.sql
-- ===================================================================
-- v3 follow-up: surface unreachable/404 pages, and show a page's own "last
-- updated" date on the dashboard when it's quiet.

-- Last check outcome, so the UI can flag a page it can't reach.
-- 'ok'     — the last check fetched and processed the page.
-- 'broken' — the last fetch returned a 4xx (usually 404 — a bad URL, permanent).
-- 'error'  — a transient failure (5xx, timeout, network, redirect problem).
-- null     — never checked yet.
alter table public.pages
  add column if not exists last_check_status text
    check (last_check_status in ('ok', 'broken', 'error'));

-- Human-readable failure message for the flagged state, e.g. "The page returned
-- HTTP 404." Null on success.
alter table public.pages
  add column if not exists last_check_error text;

-- Cached "last updated" from the last-updated finder (site-declared freshness:
-- Last-Modified header, sitemap lastmod, JSON-LD dateModified, ...). Shown on the
-- dashboard for quiet pages instead of a change we haven't detected.
-- last_updated_iso    — the finder's best-guess timestamp (null = none found).
-- last_updated_source — human label of the winning signal, e.g. "Last-Modified header".
-- last_updated_checked_at — when the finder last ran, for the cache TTL.
alter table public.pages
  add column if not exists last_updated_iso        timestamptz,
  add column if not exists last_updated_source     text,
  add column if not exists last_updated_checked_at timestamptz;


-- ===================================================================
-- 0008_page_type.sql
-- ===================================================================
-- IA redesign: pages get a fixed "page type" — the dashboard's grouping key.
-- Pages of the same type across competitors sit in one card ("all pricing pages",
-- "all homepages"). `label` stays as the free-text page name; page_type is a
-- closed set. Keep the value list + backfill in sync with
-- src/features/competitors/pageTypes.ts.

alter table public.pages
  add column if not exists page_type text not null default 'other'
    check (page_type in ('homepage', 'pricing', 'product', 'blog', 'changelog', 'other'));

-- Backfill existing rows best-effort from their label (mirrors labelToType()).
update public.pages set page_type = case
  when lower(label) in ('home', 'homepage', 'home page')            then 'homepage'
  when lower(label) in ('pricing', 'plans', 'price')                then 'pricing'
  when lower(label) like '%pricing%' or lower(label) like '%plans%' then 'pricing'
  when lower(label) in ('product', 'products', 'features', 'integrations') then 'product'
  when lower(label) in ('changelog', 'releases', 'release notes', 'updates') then 'changelog'
  when lower(label) like '%changelog%' or lower(label) like '%release%' then 'changelog'
  when lower(label) in ('blog', 'news') or lower(label) like '%blog%' then 'blog'
  when lower(label) like '%home%'                                    then 'homepage'
  else 'other'
end
where page_type = 'other';

-- Group/filter pages by type within a user's set.
create index if not exists pages_page_type_idx on public.pages (page_type);


-- ===================================================================
-- 0009_stores.sql
-- ===================================================================
-- Pivot Phase 1: a competitor is a STORE, added by domain.
-- Paste into the Supabase SQL editor and run once.
--
-- Stores are GLOBAL: one row per domain, crawled once and shared by every user
-- who follows it (SPEC.md §3). Only the service role writes them. A user's
-- `competitors` row becomes their follow of a store (competitors.store_id).
-- The legacy page-centric tables (pages/snapshots/changes) are untouched.

-- ---------------------------------------------------------------- stores

create table public.stores (
  id                      uuid primary key default gen_random_uuid(),
  -- Canonical host: lowercase, no leading "www." (src/features/stores/domain.ts).
  domain                  text not null unique,
  name                    text not null,
  platform                text not null check (platform in ('shopify', 'generic')),
  -- Can the catalog be read from /products.json? Shopify stores that lock it down
  -- fall back to the sitemap + JSON-LD in Phase 2.
  products_json_available boolean not null default false,
  -- Which signal decided the platform: products.json | headers | assets | none.
  platform_evidence       text,
  platform_checked_at     timestamptz not null default now(),
  created_at              timestamptz not null default now()
);

-- ----------------------------------------------------------- store_pages
-- Pages we watch on a store, auto-discovered on add (no user page picking).
-- Phase 3 adds the check-pipeline columns (hash, status, ...).

create table public.store_pages (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id) on delete cascade,
  kind       text not null
    check (kind in ('homepage', 'sale', 'shipping_policy', 'refund_policy')),
  url        text not null,
  created_at timestamptz not null default now(),
  unique (store_id, kind)
);

-- ------------------------------------------------ competitors → stores
-- Nullable: legacy competitors (added as page lists) have no store.

alter table public.competitors
  add column if not exists store_id uuid references public.stores(id) on delete set null;

-- A user follows a store at most once.
create unique index if not exists competitors_user_store_idx
  on public.competitors (user_id, store_id)
  where store_id is not null;

create index if not exists competitors_store_id_idx on public.competitors (store_id);

-- ------------------------------------------------------------------ RLS
-- Readable by users who follow the store; writes only via the service role
-- (which bypasses RLS), same pattern as snapshots/changes.

alter table public.stores      enable row level security;
alter table public.store_pages enable row level security;

create policy "read followed stores" on public.stores
  for select using (
    exists (
      select 1 from public.competitors c
      where c.store_id = stores.id and c.user_id = (select auth.uid())
    )
  );

create policy "read followed store pages" on public.store_pages
  for select using (
    exists (
      select 1 from public.competitors c
      where c.store_id = store_pages.store_id and c.user_id = (select auth.uid())
    )
  );


-- ===================================================================
-- 0010_catalog.sql
-- ===================================================================
-- Pivot Phase 2: catalog tracking.
-- Paste into the Supabase SQL editor and run once (after 0009_stores.sql).
--
-- Storage design (PIVOT_PLAN.md C3): a store's full normalized catalog is saved
-- as a gzipped JSON object in the private `catalog-snapshots` Storage bucket,
-- only when its hash changes. The latest snapshot IS the current state (the
-- diff baseline), so there are no per-product tables; the dashboard reads the
-- summary stats cached on `stores`. Every write goes through the service role.

-- -------------------------------------------------- stores: check scheduling
-- The due queue: a frequent tick (Supabase pg_cron → /api/cron/catalog) checks
-- stores whose next_check_at has passed. New stores are due immediately.

alter table public.stores
  add column if not exists next_check_at   timestamptz not null default now(),
  add column if not exists last_checked_at timestamptz,
  add column if not exists check_status    text check (check_status in ('ok', 'error', 'skipped')),
  add column if not exists check_error     text,
  add column if not exists catalog_source  text check (catalog_source in ('products.json', 'sitemap')),
  add column if not exists catalog_hash    text,
  -- { productCount, onSaleCount, soldOutCount, avgPrice } — see catalog/firstReport.ts
  add column if not exists catalog_stats   jsonb;

create index if not exists stores_next_check_idx on public.stores (next_check_at);

-- ------------------------------------------------------- catalog_snapshots

create table public.catalog_snapshots (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  source        text not null check (source in ('products.json', 'sitemap')),
  product_count integer not null,
  -- False when the crawl stopped at the page ceiling (removals not inferred).
  complete      boolean not null,
  content_hash  text not null,
  -- Object path in the catalog-snapshots bucket: <store_id>/<timestamp>.json.gz
  storage_path  text not null,
  fetched_at    timestamptz not null default now()
);

create index catalog_snapshots_store_idx on public.catalog_snapshots (store_id, fetched_at desc);

alter table public.stores
  add column if not exists latest_snapshot_id uuid
    references public.catalog_snapshots(id) on delete set null;

-- ------------------------------------------------------------------ events
-- Typed, per-store events from diffing snapshots (SPEC.md §5 Phase 2). Global
-- like the store: generated once, fanned out to followers later (Phase 3/4,
-- which also adds severity and page-change types).

create table public.events (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  type        text not null check (type in (
                'product_launched', 'product_removed', 'price_changed',
                'sale_started', 'sale_ended', 'sold_out', 'restocked',
                'sitewide_sale_detected')),
  source      text not null default 'catalog' check (source in ('catalog', 'page')),
  -- The product an event is about (null for store-wide events).
  product_id  text,
  payload     jsonb not null,
  snapshot_id uuid references public.catalog_snapshots(id) on delete set null,
  detected_at timestamptz not null default now()
);

create index events_store_detected_idx on public.events (store_id, detected_at desc);

-- ------------------------------------------------------------------ RLS
-- Readable by followers of the store; writes only via the service role.

alter table public.catalog_snapshots enable row level security;
alter table public.events            enable row level security;

create policy "read followed store snapshots" on public.catalog_snapshots
  for select using (
    exists (
      select 1 from public.competitors c
      where c.store_id = catalog_snapshots.store_id and c.user_id = (select auth.uid())
    )
  );

create policy "read followed store events" on public.events
  for select using (
    exists (
      select 1 from public.competitors c
      where c.store_id = events.store_id and c.user_id = (select auth.uid())
    )
  );

-- ------------------------------------------------------- storage bucket
-- Private; no storage policies, so only the service role can read/write it.

insert into storage.buckets (id, name, public)
values ('catalog-snapshots', 'catalog-snapshots', false)
on conflict (id) do nothing;


-- ===================================================================
-- 0011_events.sql
-- ===================================================================
-- Pivot Phase 3: one event model with severity, page-change events, fan-out.
-- Paste into the Supabase SQL editor and run once (after 0010_catalog.sql).

-- ------------------------------------------------------------------ events
-- Severity drives delivery: high → instant alert, normal → Monday briefing,
-- low → stored only (src/features/events/severity.config.ts).

alter table public.events
  add column if not exists severity text not null default 'normal'
    check (severity in ('high', 'normal', 'low')),
  -- The watched page a page event came from (null for catalog events).
  add column if not exists store_page_id uuid references public.store_pages(id) on delete set null,
  -- "Same news" key for alert dedupe: <type>:<product id | page id | store>.
  add column if not exists dedupe_key text;

alter table public.events drop constraint if exists events_type_check;
alter table public.events add constraint events_type_check check (type in (
  -- catalog (Phase 2)
  'product_launched', 'product_removed', 'price_changed',
  'sale_started', 'sale_ended', 'sold_out', 'restocked',
  'sitewide_sale_detected',
  -- page changes, classified (Phase 3)
  'promo_launched', 'positioning_shift', 'policy_change', 'cosmetic'
));

-- ----------------------------------------------------- store_pages: checks
-- The page pipeline keeps only the latest normalized text (the diff baseline);
-- what changed lives on the event as before/after excerpts.

alter table public.store_pages
  add column if not exists content_hash    text,
  add column if not exists content_text    text,
  add column if not exists last_checked_at timestamptz,
  add column if not exists check_status    text check (check_status in ('ok', 'error', 'blocked')),
  add column if not exists check_error     text;

-- ------------------------------------------------ stores: featured products
-- Product handles linked from the homepage, refreshed on each homepage check —
-- the "top product" signal (a top product selling out is high severity).

alter table public.stores
  add column if not exists featured_handles text[] not null default '{}';

-- -------------------------------------------------------------- user_events
-- Fan-out: one row per (follower, event) saying where it goes for their plan.
-- Phase 4's senders move `status` from pending to sent/skipped.

create table public.user_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  event_id     uuid not null references public.events(id) on delete cascade,
  store_id     uuid not null references public.stores(id) on delete cascade,
  delivery     text not null check (delivery in ('instant', 'briefing')),
  status       text not null default 'pending' check (status in ('pending', 'sent', 'skipped')),
  -- Instant alerts sent together share a bundle id.
  bundle_id    uuid,
  delivered_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, event_id)
);

create index user_events_pending_idx on public.user_events (delivery, status, created_at);
create index user_events_user_idx on public.user_events (user_id, created_at desc);

alter table public.user_events enable row level security;

create policy "read own user_events" on public.user_events
  for select using (user_id = (select auth.uid()));


-- ===================================================================
-- 0012_alerts_briefings.sql
-- ===================================================================
-- Pivot Phase 4: instant-alert settings and the Monday briefing.
-- Paste into the Supabase SQL editor and run once (after 0011_events.sql).

-- ----------------------------------------------------------- alert_settings
-- One row per user who changed a default (no row = email on, no Slack,
-- nothing muted). The Slack webhook URL is a secret outbound target, so the
-- table has RLS on and NO policies: only the service role (server actions,
-- the sender) can read or write it — it's never exposed through the API.

create table public.alert_settings (
  user_id           uuid primary key references public.users(id) on delete cascade,
  email_instant     boolean not null default true,
  slack_webhook_url text check (slack_webhook_url is null or slack_webhook_url like 'https://hooks.slack.com/%'),
  muted_types       text[] not null default '{}',
  updated_at        timestamptz not null default now()
);

alter table public.alert_settings enable row level security;

-- ---------------------------------------------------------------- briefings
-- One row per user per Monday. The week's events are frozen into `input`
-- when prepared, so the email matches what the model saw; the next briefing
-- starts at this one's window_end (no gaps, no repeats).

create table public.briefings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  week_start   date not null,  -- the Monday (US Eastern) it's for
  status       text not null default 'pending'
    check (status in ('pending', 'submitted', 'ready', 'sent', 'skipped')),
  window_start timestamptz not null,
  window_end   timestamptz not null,
  input        jsonb not null,
  -- { topMoves, whatThisMeans, suggestedMove } — src/features/briefing/content.ts
  content      jsonb,
  -- True when written by the model; false = the no-AI fallback.
  ai           boolean not null default false,
  batch_id     text,
  error        text,
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, week_start)
);

create index briefings_week_status_idx on public.briefings (week_start, status);

alter table public.briefings enable row level security;

create policy "read own briefings" on public.briefings
  for select using (user_id = (select auth.uid()));

-- Senders look up a user's pending/sent rows by delivery.
create index if not exists user_events_user_delivery_idx
  on public.user_events (user_id, delivery, status);


-- ===================================================================
-- 0013_own_store.sql
-- ===================================================================
-- Pivot Phase 5: the user's own store, product matching, price undercuts.
-- Paste into the Supabase SQL editor and run once (after 0012_alerts_briefings.sql).

-- ----------------------------------------------------- users → own store
-- Your own store is an ordinary shared store (same crawler, same snapshots),
-- linked here instead of followed. Its catalog is the matching baseline.

alter table public.users
  add column if not exists own_store_id uuid references public.stores(id) on delete set null;

-- Owners can read their own store's row (followers already can via 0009).
create policy "read own store" on public.stores
  for select using (
    exists (select 1 from public.users u where u.own_store_id = stores.id and u.id = (select auth.uid()))
  );

-- ---------------------------------------------------------- price_undercut
-- A competitor's comparable product priced below yours. It depends on one
-- user's catalog, so it's addressed to that user (for_user_id) and fanned out
-- only to them.

alter table public.events
  add column if not exists for_user_id uuid references public.users(id) on delete cascade;

alter table public.events drop constraint if exists events_type_check;
alter table public.events add constraint events_type_check check (type in (
  'product_launched', 'product_removed', 'price_changed',
  'sale_started', 'sale_ended', 'sold_out', 'restocked',
  'sitewide_sale_detected',
  'promo_launched', 'positioning_shift', 'policy_change', 'cosmetic',
  'price_undercut'
));

-- A per-user event is visible only to its user; store-wide events stay
-- visible to every follower.
drop policy if exists "read followed store events" on public.events;
create policy "read followed store events" on public.events
  for select using (
    (for_user_id is null or for_user_id = (select auth.uid()))
    and exists (
      select 1 from public.competitors c
      where c.store_id = events.store_id and c.user_id = (select auth.uid())
    )
  );

-- ------------------------------------------------ user_events: per-user context
-- e.g. { "ownMatch": { "title", "handle", "price", "score" } } — the reader's
-- comparable product for this event, used by alerts and the briefing.

alter table public.user_events
  add column if not exists context jsonb;


-- ===================================================================
-- 0014_plans.sql
-- ===================================================================
-- Pivot Phase 6: Free / Starter / Pro / Agency, and the founding-member beta.
-- Paste into the Supabase SQL editor and run once (after 0013_own_store.sql).

-- ------------------------------------------------------------------ plans
-- The pre-pivot single paid plan becomes Pro. (Payments were never live, so
-- this only touches sandbox/comp accounts.) Agency exists but isn't sold yet.

alter table public.users drop constraint if exists users_plan_check;
update public.users set plan = 'pro' where plan = 'paid';
alter table public.users add constraint users_plan_check
  check (plan in ('free', 'starter', 'pro', 'agency'));

-- -------------------------------------------------------- founding members
-- Everyone who joins during the free beta is a founding member (40% off for
-- life once billing opens — a Paddle discount, applied at checkout). The
-- default is true for the beta, including existing users.
--
-- WHEN BILLING OPENS (NEXT_PUBLIC_BILLING_ENABLED=true), run:
--   alter table public.users alter column is_founding_member set default false;
-- so later signups aren't founding members.

alter table public.users
  add column if not exists is_founding_member boolean not null default true;


-- ===================================================================
-- 0015_usage.sql
-- ===================================================================
-- Pivot Phase 7: cost guardrails and observability.
-- Paste into the Supabase SQL editor and run once (after 0014_plans.sql).
-- Every table here is service-role only: RLS on, no policies.

-- ---------------------------------------------------------------- ai_usage
-- One row per model call: tokens and list-price cost (src/features/ai/pricing.ts).
-- store_id = shared store work (page classification), split across the
-- store's followers in the admin view; user_id = the user's own (briefing).

create table public.ai_usage (
  id                 uuid primary key default gen_random_uuid(),
  feature            text not null check (feature in ('classify', 'briefing')),
  provider           text not null,
  model              text not null,
  store_id           uuid references public.stores(id) on delete set null,
  user_id            uuid references public.users(id) on delete set null,
  input_tokens       integer not null default 0,
  output_tokens      integer not null default 0,
  cache_read_tokens  integer not null default 0,
  cache_write_tokens integer not null default 0,
  batch              boolean not null default false,
  cost_usd           numeric(12, 6) not null default 0,
  created_at         timestamptz not null default now()
);

create index ai_usage_created_idx on public.ai_usage (created_at);
-- The per-store daily AI cap counts today's calls for one store.
create index ai_usage_store_feature_idx on public.ai_usage (store_id, feature, created_at);

alter table public.ai_usage enable row level security;

-- --------------------------------------------------------------- fetch_log
-- Outbound requests per store per day and kind (catalog pages, watched pages).

create table public.fetch_log (
  store_id uuid not null references public.stores(id) on delete cascade,
  day      date not null,
  kind     text not null check (kind in ('catalog', 'page')),
  requests integer not null default 0,
  primary key (store_id, day, kind)
);

alter table public.fetch_log enable row level security;

-- Atomic "add N requests to today's row" (called from recordFetches).
create or replace function public.increment_fetch_log(p_store_id uuid, p_kind text, p_requests integer)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.fetch_log (store_id, day, kind, requests)
  values (p_store_id, (now() at time zone 'utc')::date, p_kind, p_requests)
  on conflict (store_id, day, kind)
  do update set requests = public.fetch_log.requests + excluded.requests;
$$;

revoke execute on function public.increment_fetch_log(uuid, text, integer) from public, anon, authenticated;

-- ------------------------------------------------------------ app_settings
-- Owner-tunable limits that the database itself enforces. Change with e.g.:
--   update public.app_settings set value = '100' where key = 'free_signups_per_day';

create table public.app_settings (
  key   text primary key,
  value text not null
);

alter table public.app_settings enable row level security;

insert into public.app_settings (key, value) values ('free_signups_per_day', '50')
on conflict (key) do nothing;

-- ------------------------------------------------- daily signup cap (backstop)
-- The signup form checks the cap first with a friendly message; this makes it
-- hold for every path — including Google sign-in, where Supabase creates the
-- account before our code runs. Raising here rolls back the auth.users insert.
-- Same function as 0001, plus the cap check.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cap  integer;
  used integer;
begin
  select value::integer into cap from public.app_settings where key = 'free_signups_per_day';
  if cap is not null then
    select count(*) into used
    from public.users
    where created_at >= (date_trunc('day', now() at time zone 'utc') at time zone 'utc');
    if used >= cap then
      raise exception 'signup_cap_reached';
    end if;
  end if;

  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;


-- ===================================================================
-- 0016_ui_settings.sql
-- ===================================================================
-- UI Step 6 (trailwatch-shopify-ui-prompt.md): settings and data the new screens need.

-- Monday briefing: the user picks the time (6–11 AM) and time zone; the day
-- stays Monday (UX_SPEC.md §7, decision 1). The on/off switch is the existing
-- users.digest_enabled.
alter table public.users
  add column if not exists briefing_hour smallint not null default 8
    check (briefing_hour between 6 and 11),
  add column if not exists briefing_time_zone text not null default 'America/New_York';

-- Where email alerts go; null = the account's login email.
alter table public.alert_settings
  add column if not exists send_to text
    check (send_to is null or send_to ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- One-line "What it means" for high-priority moves (DESIGN_TO_COMPONENTS.md D2),
-- written once per store event and shared by every follower.
alter table public.events
  add column if not exists meaning text;

-- Home and competitor timelines read a user's moves newest first.
create index if not exists user_events_user_created_idx on public.user_events (user_id, created_at desc);
create index if not exists events_store_page_idx on public.events (store_page_id, detected_at desc)
  where store_page_id is not null;

-- Log the "What it means" calls in the cost view alongside classification.
alter table public.ai_usage drop constraint if exists ai_usage_feature_check;
alter table public.ai_usage add constraint ai_usage_feature_check
  check (feature in ('classify', 'briefing', 'meaning'));


-- ===================================================================
-- 0017_user_role.sql
-- ===================================================================
-- Onboarding asks "What's your role?" (optional, never blocks sign-up): who
-- the beta's users are. Written by the service role like the rest of users.
alter table public.users
  add column if not exists role text
    check (role in ('founder', 'marketer', 'agency', 'other'));


-- ===================================================================
-- 0018_competitor_suggestions.sql
-- ===================================================================
-- In-app competitor suggestions (2026-10-02): the finder's last result for the
-- user's own store, so reopening onboarding or the Add competitor modal doesn't
-- run another search. Written by the service role like the rest of users.
alter table public.users
  add column if not exists suggestions jsonb,
  add column if not exists suggestions_store text,
  add column if not exists suggestions_at timestamptz;


-- ===================================================================
-- 0019_product_matching.sql
-- ===================================================================
-- Comparable-product matching (2026-10-03, matching prompt Part A).
-- Paste into the Supabase SQL editor and run once (after 0018).

-- --------------------------------------------------------- product_classes
-- What each product is (category, use, attributes, pack type), from the
-- classifier. Shared per store like the catalog; redone only when the
-- product's text changes (input_hash).
create table if not exists public.product_classes (
  store_id     uuid not null references public.stores(id) on delete cascade,
  product_id   text not null,
  input_hash   text not null,
  category     text not null,
  subcategory  text not null,
  use          text not null default '',
  attributes   text[] not null default '{}',
  pack_type    text not null,
  updated_at   timestamptz not null default now(),
  primary key (store_id, product_id)
);
alter table public.product_classes enable row level security;

-- The snapshot whose products are all classified; matching waits for it.
alter table public.stores
  add column if not exists classified_snapshot_id uuid references public.catalog_snapshots(id) on delete set null;

-- --------------------------------------------------------- product_matches
-- The model's judgement of one (your product, their product) pair. Shared by
-- everyone with the same own store. pair_hash = both products' input hashes,
-- so a pair is judged again only when either product changes.
create table if not exists public.product_matches (
  own_store_id     uuid not null references public.stores(id) on delete cascade,
  own_product_id   text not null,
  comp_store_id    uuid not null references public.stores(id) on delete cascade,
  comp_product_id  text not null,
  pair_hash        text not null,
  confidence       real not null,
  reason           text not null default '',
  judged_at        timestamptz not null default now(),
  primary key (own_store_id, own_product_id, comp_store_id, comp_product_id)
);
create index if not exists product_matches_comp_idx on public.product_matches (comp_store_id, own_store_id);
alter table public.product_matches enable row level security;

-- Read: the owners of that own store.
create policy "read matches for my store" on public.product_matches
  for select using (
    exists (select 1 from public.users u where u.own_store_id = product_matches.own_store_id and u.id = (select auth.uid()))
  );

-- Which (own store, competitor store) pairs are fully judged, and for which snapshots.
create table if not exists public.match_state (
  own_store_id      uuid not null references public.stores(id) on delete cascade,
  comp_store_id     uuid not null references public.stores(id) on delete cascade,
  own_snapshot_id   uuid,
  comp_snapshot_id  uuid,
  matched_at        timestamptz not null default now(),
  primary key (own_store_id, comp_store_id)
);
alter table public.match_state enable row level security;

-- ---------------------------------------------------------- match_feedback
-- A user's verdict on a pair: confirmed (incl. manual links) or rejected.
-- Rejected pairs never come back; confirmed ones are always active.
create table if not exists public.match_feedback (
  user_id          uuid not null references public.users(id) on delete cascade,
  own_store_id     uuid not null references public.stores(id) on delete cascade,
  own_product_id   text not null,
  comp_store_id    uuid not null references public.stores(id) on delete cascade,
  comp_product_id  text not null,
  verdict          text not null check (verdict in ('confirmed', 'rejected')),
  manual           boolean not null default false,
  created_at       timestamptz not null default now(),
  primary key (user_id, own_store_id, own_product_id, comp_store_id, comp_product_id)
);
alter table public.match_feedback enable row level security;
create policy "own match feedback" on public.match_feedback
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ------------------------------------------- price_undercut → price_position_change
alter table public.events drop constraint if exists events_type_check;
update public.events set type = 'price_position_change', dedupe_key = replace(dedupe_key, 'price_undercut:', 'price_position_change:')
  where type = 'price_undercut';
alter table public.events add constraint events_type_check check (type in (
  'product_launched', 'product_removed', 'price_changed',
  'sale_started', 'sale_ended', 'sold_out', 'restocked',
  'sitewide_sale_detected',
  'promo_launched', 'positioning_shift', 'policy_change', 'cosmetic',
  'price_position_change'
));
update public.alert_settings set muted_types = array_replace(muted_types, 'price_undercut', 'price_position_change')
  where 'price_undercut' = any(muted_types);
-- Frozen briefing inputs name event types too.
update public.briefings set input = replace(input::text, '"price_undercut"', '"price_position_change"')::jsonb
  where input::text like '%"price_undercut"%';

-- The classifier and pair judge log their AI cost like the other features.
alter table public.ai_usage drop constraint if exists ai_usage_feature_check;
alter table public.ai_usage add constraint ai_usage_feature_check
  check (feature in ('classify', 'briefing', 'meaning', 'match_classify', 'match_judge'));


-- ===================================================================
-- 0020_previews.sql
-- ===================================================================
-- Homepage "Try it on a competitor" previews (2026-10-04, widget prompt Part 1).
-- Paste into the Supabase SQL editor and run once (after 0019).

-- One lookup's result, under an unguessable id. The full snapshot (`result`)
-- is only returned to a signed-up user who claims it.
create table if not exists public.previews (
  id           text primary key,
  domain       text not null,
  store_id     uuid references public.stores(id) on delete set null,
  snapshot_id  uuid references public.catalog_snapshots(id) on delete set null,
  status       text not null check (status in ('processing', 'ready', 'instant_not_supported', 'error')),
  reason       text,
  result       jsonb,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  claimed_by   uuid references public.users(id) on delete set null,
  claimed_at   timestamptz
);
create index if not exists previews_domain_idx on public.previews (domain, created_at desc);
alter table public.previews enable row level security;

-- Every lookup, for rate limits, the global cap and the admin totals. The IP
-- is stored only as a salted hash.
create table if not exists public.preview_lookups (
  id           bigserial primary key,
  ip_hash      text not null,
  domain       text,
  status       text not null,
  cached       boolean not null default false,
  duration_ms  integer,
  products     integer,
  created_at   timestamptz not null default now()
);
create index if not exists preview_lookups_ip_idx on public.preview_lookups (ip_hash, created_at desc);
create index if not exists preview_lookups_day_idx on public.preview_lookups (created_at);
alter table public.preview_lookups enable row level security;


-- ===================================================================
-- 0021_preview_cta.sql
-- ===================================================================
-- Homepage widget: when a visitor clicked "Join the beta" on a preview
-- (2026-10-04). Sign-ups and finished onboarding come from claimed_by.
alter table public.previews add column if not exists cta_clicked_at timestamptz;


-- ===================================================================
-- 0022_preview_onboarding.sql
-- ===================================================================
-- Onboarding from the homepage widget (2026-10-04, widget prompt Part 3):
-- when a claimed preview's user finished onboarding (signup_from_widget is
-- claimed_by; onboarding_completed_from_widget is this).
alter table public.previews add column if not exists completed_at timestamptz;


-- ===================================================================
-- 0023_opportunities.sql
-- ===================================================================
-- Opportunities (2026-10-04, matching prompt Part B).
-- Paste into the Supabase SQL editor and run once (after 0022).

-- ------------------------------------------------------------- bestsellers
-- B1: a competitor's own "Best Sellers" collection, read once a day. The
-- best-selling sort itself is disallowed by Shopify's default robots.txt, so
-- this is the store's own list. 'unavailable' = the store has none we can use;
-- we never infer a ranking.
alter table public.stores
  add column if not exists bestseller_collection text,
  add column if not exists bestseller_status text check (bestseller_status in ('available', 'unavailable')),
  add column if not exists bestseller_checked_at timestamptz,
  -- B2: when each product the homepage features was first seen there (handle → ISO date).
  add column if not exists featured_since jsonb not null default '{}'::jsonb;

-- One row per daily read. members = product handles; the first ranked_count
-- are in the order the store's own page shows them (their position), the rest
-- are members with no position. ranked_count 0 = membership only.
create table if not exists public.bestseller_snapshots (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  collection    text not null,
  members       text[] not null,
  ranked_count  integer not null default 0,
  fetched_at    timestamptz not null default now()
);
create index if not exists bestseller_snapshots_store_idx on public.bestseller_snapshots (store_id, fetched_at desc);
alter table public.bestseller_snapshots enable row level security;

-- ----------------------------------------------------------- opportunities
-- B3/B4: one row per user and opportunity (key = kind + what it's about).
-- Refreshed daily. Dismissed rows are kept so they stay away until the
-- evidence changes significantly; 'not_relevant' ones stay away for good.
create table if not exists public.opportunities (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  key                text not null,
  kind               text not null check (kind in ('category_gap', 'format_gap', 'price_tier_gap', 'rising_product', 'demand')),
  score              real not null,
  noticed            text not null,
  action             text not null,
  evidence           jsonb not null,
  status             text not null default 'open' check (status in ('open', 'dismissed', 'not_relevant')),
  dismissed_score    real,
  -- Last Monday briefing it appeared in; it isn't repeated for a few weeks.
  briefed_at         timestamptz,
  detected_at        timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, key)
);
create index if not exists opportunities_user_idx on public.opportunities (user_id, status, score desc);
alter table public.opportunities enable row level security;
-- Read only: dismissing goes through the server (which sets dismissed_score),
-- so a client can't rewrite scores or evidence.
create policy "read my opportunities" on public.opportunities
  for select using (user_id = (select auth.uid()));

alter table public.users add column if not exists opportunities_at timestamptz;


-- ===================================================================
-- 0024_opportunity_dismissed_at.sql
-- ===================================================================
-- Opportunities screen (2026-10-04, DESIGN 11-opps): when an opportunity was
-- dismissed, for the "Show dismissed" list ("Dismissed Sep 29").
-- Paste into the Supabase SQL editor and run once (after 0023).
alter table public.opportunities add column if not exists dismissed_at timestamptz;


-- ===================================================================
-- 0025_beta_relationship.sql
-- ===================================================================
-- Beta relationship (2026-10-04): founding members (first 25), feedback calls,
-- ratings on briefings and alerts, in-app feedback, the founder welcome email.
-- Paste into the Supabase SQL editor and run once (after 0024).

-- ------------------------------------------------------ founding members
-- Founding members are the first N sign-ups (app_settings.founding_member_cap),
-- not everyone. Offer: 10% off for life when paid plans start, 30% more after
-- `founder_calls` reaches 3 (src/features/beta/config.ts).
insert into public.app_settings (key, value) values ('founding_member_cap', '25')
on conflict (key) do nothing;

alter table public.users alter column is_founding_member set default false;
alter table public.users
  add column if not exists founder_calls integer not null default 0 check (founder_calls >= 0),
  -- The founder welcome email went out (sent once, after sign-up).
  add column if not exists welcomed_at timestamptz;

-- No real users yet (only test accounts): the 25 spots start empty, and nobody
-- existing gets the welcome email. The owner can grant founding status in /admin.
update public.users set is_founding_member = false;
update public.users set welcomed_at = now() where welcomed_at is null;

-- Same function as 0015 (daily signup cap), plus a founding spot while any are left.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cap      integer;
  used     integer;
  founding integer;
  founders integer;
begin
  select value::integer into cap from public.app_settings where key = 'free_signups_per_day';
  if cap is not null then
    select count(*) into used
    from public.users
    where created_at >= (date_trunc('day', now() at time zone 'utc') at time zone 'utc');
    if used >= cap then
      raise exception 'signup_cap_reached';
    end if;
  end if;

  select value::integer into founding from public.app_settings where key = 'founding_member_cap';
  select count(*) into founders from public.users where is_founding_member;

  insert into public.users (id, email, is_founding_member)
  values (new.id, new.email, coalesce(founders < founding, false))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------- ratings
-- One-click "Was this useful?" on the Monday briefing and "Useful / Noise" on
-- instant alerts. One rating per user and item; a second click changes it.
create table if not exists public.ratings (
  user_id      uuid not null references public.users(id) on delete cascade,
  target_type  text not null check (target_type in ('briefing', 'alert')),
  target_id    text not null,
  value        text not null check (value in ('useful', 'not_useful')),
  comment      text check (char_length(comment) <= 2000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);
alter table public.ratings enable row level security;

-- --------------------------------------------------------------- feedback
-- "Send feedback / request a feature" from the app. Emailed to the founder too.
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  kind        text not null check (kind in ('feedback', 'feature')),
  message     text not null check (char_length(message) between 1 and 4000),
  page        text,
  created_at  timestamptz not null default now()
);
create index if not exists feedback_created_idx on public.feedback (created_at desc);
alter table public.feedback enable row level security;
-- Written and read by the server only (service role): no client policies.


-- ===================================================================
-- 0026_store_categories.sql
-- ===================================================================
-- Store categories (2026-10-04): the collections a store links from its own
-- menu, with product and on-sale counts, read once a day (DESIGN 13-Categories).
-- Listed on the competitor report and detail page; never alerted on.
-- Paste into the Supabase SQL editor and run once (after 0025).

alter table public.stores
  -- [{ handle, title, products, onSale }], largest first. onSale is null when
  -- the category was too big to count fully. Null column = not read yet.
  add column if not exists categories jsonb,
  add column if not exists categories_checked_at timestamptz;

