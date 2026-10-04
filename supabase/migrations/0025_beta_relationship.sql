-- Beta relationship (2026-10-04): founding members (first 25), feedback calls,
-- ratings on briefings and alerts, in-app feedback, the founder welcome email.
-- Paste into the Supabase SQL editor and run once (after 0024).

-- ------------------------------------------------------ founding members
-- Founding members are the first N sign-ups (app_settings.founding_member_cap),
-- not everyone. Offer: 10% off for life when paid plans start, 30% more after
-- `founder_calls` reaches 3 (src/features/beta/config.ts).
insert into public.app_settings (key, value) values ('founding_member_cap', '25')
on conflict (key) do nothing;

alter table public.users alter column is_founding_member set default false;
alter table public.users
  add column if not exists founder_calls integer not null default 0 check (founder_calls >= 0),
  -- The founder welcome email went out (sent once, after sign-up).
  add column if not exists welcomed_at timestamptz;

-- No real users yet (only test accounts): the 25 spots start empty, and nobody
-- existing gets the welcome email. The owner can grant founding status in /admin.
update public.users set is_founding_member = false;
update public.users set welcomed_at = now() where welcomed_at is null;

-- Same function as 0015 (daily signup cap), plus a founding spot while any are left.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cap      integer;
  used     integer;
  founding integer;
  founders integer;
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

  select value::integer into founding from public.app_settings where key = 'founding_member_cap';
  select count(*) into founders from public.users where is_founding_member;

  insert into public.users (id, email, is_founding_member)
  values (new.id, new.email, coalesce(founders < founding, false))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------- ratings
-- One-click "Was this useful?" on the Monday briefing and "Useful / Noise" on
-- instant alerts. One rating per user and item; a second click changes it.
create table if not exists public.ratings (
  user_id      uuid not null references public.users(id) on delete cascade,
  target_type  text not null check (target_type in ('briefing', 'alert')),
  target_id    text not null,
  value        text not null check (value in ('useful', 'not_useful')),
  comment      text check (char_length(comment) <= 2000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);
alter table public.ratings enable row level security;

-- --------------------------------------------------------------- feedback
-- "Send feedback / request a feature" from the app. Emailed to the founder too.
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  kind        text not null check (kind in ('feedback', 'feature')),
  message     text not null check (char_length(message) between 1 and 4000),
  page        text,
  created_at  timestamptz not null default now()
);
create index if not exists feedback_created_idx on public.feedback (created_at desc);
alter table public.feedback enable row level security;
-- Written and read by the server only (service role): no client policies.
