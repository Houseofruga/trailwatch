-- Store categories (2026-10-04): the collections a store links from its own
-- menu, with product and on-sale counts, read once a day (DESIGN 13-Categories).
-- Listed on the competitor report and detail page; never alerted on.
-- Paste into the Supabase SQL editor and run once (after 0025).

alter table public.stores
  -- [{ handle, title, products, onSale }], largest first. onSale is null when
  -- the category was too big to count fully. Null column = not read yet.
  add column if not exists categories jsonb,
  add column if not exists categories_checked_at timestamptz;
