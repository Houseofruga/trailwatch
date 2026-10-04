-- Opportunities screen (2026-10-04, DESIGN 11-opps): when an opportunity was
-- dismissed, for the "Show dismissed" list ("Dismissed Sep 29").
-- Paste into the Supabase SQL editor and run once (after 0023).
alter table public.opportunities add column if not exists dismissed_at timestamptz;
