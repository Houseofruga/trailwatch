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
