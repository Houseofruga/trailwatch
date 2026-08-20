-- Competitor Radar — initial schema
-- Paste into the Supabase SQL editor and run once.
-- Mirrors SPEC.md §3, with the four deltas recorded in the slice-1 plan:
--   1. changes.is_meaningful  — trivial diffs are stored, not discarded, so the
--                               "trivial edits filtered" count has something to count.
--   2. changes.filter_reason  — the reason isMeaningfulChange already returns.
--   3. excerpt_before/after   — the detail screen shows two panels, not one blob.
--   4. users rows created by trigger, not app code.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- users

create table public.users (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text not null,
  plan                text not null default 'free' check (plan in ('free', 'paid')),
  stripe_customer_id  text,
  last_digest_sent_at timestamptz,
  created_at          timestamptz not null default now()
);

-- A profile row is created by a trigger rather than by the app so that a user can
-- never land on the dashboard before their row exists.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------- competitors

create table public.competitors (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create index competitors_user_id_idx on public.competitors (user_id);

-- ---------------------------------------------------------------- pages

create table public.pages (
  id              uuid primary key default gen_random_uuid(),
  competitor_id   uuid not null references public.competitors(id) on delete cascade,
  url             text not null,
  label           text not null,
  is_active       boolean not null default true,
  last_checked_at timestamptz,
  created_at      timestamptz not null default now()
);

create index pages_competitor_id_idx on public.pages (competitor_id);
-- The daily job scans for active pages due a check.
create index pages_active_check_idx on public.pages (is_active, last_checked_at);

-- ------------------------------------------------------------ snapshots

create table public.snapshots (
  id           uuid primary key default gen_random_uuid(),
  page_id      uuid not null references public.pages(id) on delete cascade,
  content_text text not null,
  content_hash text not null,
  fetched_at   timestamptz not null default now()
);

-- The check engine's hot path: "most recent snapshot for this page".
create index snapshots_page_fetched_idx on public.snapshots (page_id, fetched_at desc);

-- pages.latest_snapshot_id is added after snapshots exists, to avoid a circular
-- table dependency at create time.
alter table public.pages
  add column latest_snapshot_id uuid references public.snapshots(id) on delete set null;

-- -------------------------------------------------------------- changes

create table public.changes (
  id               uuid primary key default gen_random_uuid(),
  page_id          uuid not null references public.pages(id) on delete cascade,
  from_snapshot_id uuid references public.snapshots(id) on delete set null,
  to_snapshot_id   uuid references public.snapshots(id) on delete set null,
  is_meaningful    boolean not null,
  filter_reason    text,
  summary          text,
  excerpt_before   text,
  excerpt_after    text,
  detected_at      timestamptz not null default now()
);

-- Every user-facing query is "meaningful changes for this page, newest first";
-- the digest and the filtered-count stat are windowed on detected_at.
create index changes_page_detected_idx on public.changes (page_id, detected_at desc);
create index changes_meaningful_idx on public.changes (page_id, is_meaningful, detected_at desc);

-- ------------------------------------------------------------------ RLS
-- Every table is owner-scoped. Child tables reach up to competitors.user_id.
-- The daily check job uses the service-role key and bypasses all of this.

alter table public.users       enable row level security;
alter table public.competitors enable row level security;
alter table public.pages       enable row level security;
alter table public.snapshots   enable row level security;
alter table public.changes     enable row level security;

create policy "read own profile" on public.users
  for select using (id = (select auth.uid()));
create policy "update own profile" on public.users
  for update using (id = (select auth.uid()));

create policy "own competitors" on public.competitors
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own pages" on public.pages
  for all using (
    exists (
      select 1 from public.competitors c
      where c.id = pages.competitor_id and c.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.competitors c
      where c.id = pages.competitor_id and c.user_id = (select auth.uid())
    )
  );

create policy "read own snapshots" on public.snapshots
  for select using (
    exists (
      select 1 from public.pages p
      join public.competitors c on c.id = p.competitor_id
      where p.id = snapshots.page_id and c.user_id = (select auth.uid())
    )
  );

create policy "read own changes" on public.changes
  for select using (
    exists (
      select 1 from public.pages p
      join public.competitors c on c.id = p.competitor_id
      where p.id = changes.page_id and c.user_id = (select auth.uid())
    )
  );
