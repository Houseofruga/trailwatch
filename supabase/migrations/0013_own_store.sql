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
