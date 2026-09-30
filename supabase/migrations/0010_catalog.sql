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
