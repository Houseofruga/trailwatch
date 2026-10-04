-- Preloaded stores (2026-10-04): prospects' stores read ahead of sign-up, so a
-- new user's first report and comparison are ready sooner. A preloaded store
-- nobody follows is read once a day (catalog, Best Sellers, categories; no page
-- checks, so no AI is spent on news nobody receives) and its products are
-- classified at the lowest priority, after every real user's stores.
-- Paste into the Supabase SQL editor and run once (after 0026).

alter table public.stores add column if not exists preload boolean not null default false;
create index if not exists stores_preload_idx on public.stores (next_check_at) where preload;
