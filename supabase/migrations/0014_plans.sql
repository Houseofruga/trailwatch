-- Pivot Phase 6: Free / Starter / Pro / Agency, and the founding-member beta.
-- Paste into the Supabase SQL editor and run once (after 0013_own_store.sql).

-- ------------------------------------------------------------------ plans
-- The pre-pivot single paid plan becomes Pro. (Payments were never live, so
-- this only touches sandbox/comp accounts.) Agency exists but isn't sold yet.

alter table public.users drop constraint if exists users_plan_check;
update public.users set plan = 'pro' where plan = 'paid';
alter table public.users add constraint users_plan_check
  check (plan in ('free', 'starter', 'pro', 'agency'));

-- -------------------------------------------------------- founding members
-- Everyone who joins during the free beta is a founding member (40% off for
-- life once billing opens — a Paddle discount, applied at checkout). The
-- default is true for the beta, including existing users.
--
-- WHEN BILLING OPENS (NEXT_PUBLIC_BILLING_ENABLED=true), run:
--   alter table public.users alter column is_founding_member set default false;
-- so later signups aren't founding members.

alter table public.users
  add column if not exists is_founding_member boolean not null default true;
