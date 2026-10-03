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
