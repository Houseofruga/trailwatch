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
