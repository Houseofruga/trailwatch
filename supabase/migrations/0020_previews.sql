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
