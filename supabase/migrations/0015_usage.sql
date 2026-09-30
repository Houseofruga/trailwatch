-- Pivot Phase 7: cost guardrails and observability.
-- Paste into the Supabase SQL editor and run once (after 0014_plans.sql).
-- Every table here is service-role only: RLS on, no policies.

-- ---------------------------------------------------------------- ai_usage
-- One row per model call: tokens and list-price cost (src/features/ai/pricing.ts).
-- store_id = shared store work (page classification), split across the
-- store's followers in the admin view; user_id = the user's own (briefing).

create table public.ai_usage (
  id                 uuid primary key default gen_random_uuid(),
  feature            text not null check (feature in ('classify', 'briefing')),
  provider           text not null,
  model              text not null,
  store_id           uuid references public.stores(id) on delete set null,
  user_id            uuid references public.users(id) on delete set null,
  input_tokens       integer not null default 0,
  output_tokens      integer not null default 0,
  cache_read_tokens  integer not null default 0,
  cache_write_tokens integer not null default 0,
  batch              boolean not null default false,
  cost_usd           numeric(12, 6) not null default 0,
  created_at         timestamptz not null default now()
);

create index ai_usage_created_idx on public.ai_usage (created_at);
-- The per-store daily AI cap counts today's calls for one store.
create index ai_usage_store_feature_idx on public.ai_usage (store_id, feature, created_at);

alter table public.ai_usage enable row level security;

-- --------------------------------------------------------------- fetch_log
-- Outbound requests per store per day and kind (catalog pages, watched pages).

create table public.fetch_log (
  store_id uuid not null references public.stores(id) on delete cascade,
  day      date not null,
  kind     text not null check (kind in ('catalog', 'page')),
  requests integer not null default 0,
  primary key (store_id, day, kind)
);

alter table public.fetch_log enable row level security;

-- Atomic "add N requests to today's row" (called from recordFetches).
create or replace function public.increment_fetch_log(p_store_id uuid, p_kind text, p_requests integer)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.fetch_log (store_id, day, kind, requests)
  values (p_store_id, (now() at time zone 'utc')::date, p_kind, p_requests)
  on conflict (store_id, day, kind)
  do update set requests = public.fetch_log.requests + excluded.requests;
$$;

revoke execute on function public.increment_fetch_log(uuid, text, integer) from public, anon, authenticated;

-- ------------------------------------------------------------ app_settings
-- Owner-tunable limits that the database itself enforces. Change with e.g.:
--   update public.app_settings set value = '100' where key = 'free_signups_per_day';

create table public.app_settings (
  key   text primary key,
  value text not null
);

alter table public.app_settings enable row level security;

insert into public.app_settings (key, value) values ('free_signups_per_day', '50')
on conflict (key) do nothing;

-- ------------------------------------------------- daily signup cap (backstop)
-- The signup form checks the cap first with a friendly message; this makes it
-- hold for every path — including Google sign-in, where Supabase creates the
-- account before our code runs. Raising here rolls back the auth.users insert.
-- Same function as 0001, plus the cap check.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cap  integer;
  used integer;
begin
  select value::integer into cap from public.app_settings where key = 'free_signups_per_day';
  if cap is not null then
    select count(*) into used
    from public.users
    where created_at >= (date_trunc('day', now() at time zone 'utc') at time zone 'utc');
    if used >= cap then
      raise exception 'signup_cap_reached';
    end if;
  end if;

  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;
