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
