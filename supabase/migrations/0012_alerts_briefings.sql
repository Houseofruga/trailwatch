-- Pivot Phase 4: instant-alert settings and the Monday briefing.
-- Paste into the Supabase SQL editor and run once (after 0011_events.sql).

-- ----------------------------------------------------------- alert_settings
-- One row per user who changed a default (no row = email on, no Slack,
-- nothing muted). The Slack webhook URL is a secret outbound target, so the
-- table has RLS on and NO policies: only the service role (server actions,
-- the sender) can read or write it — it's never exposed through the API.

create table public.alert_settings (
  user_id           uuid primary key references public.users(id) on delete cascade,
  email_instant     boolean not null default true,
  slack_webhook_url text check (slack_webhook_url is null or slack_webhook_url like 'https://hooks.slack.com/%'),
  muted_types       text[] not null default '{}',
  updated_at        timestamptz not null default now()
);

alter table public.alert_settings enable row level security;

-- ---------------------------------------------------------------- briefings
-- One row per user per Monday. The week's events are frozen into `input`
-- when prepared, so the email matches what the model saw; the next briefing
-- starts at this one's window_end (no gaps, no repeats).

create table public.briefings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  week_start   date not null,  -- the Monday (US Eastern) it's for
  status       text not null default 'pending'
    check (status in ('pending', 'submitted', 'ready', 'sent', 'skipped')),
  window_start timestamptz not null,
  window_end   timestamptz not null,
  input        jsonb not null,
  -- { topMoves, whatThisMeans, suggestedMove } — src/features/briefing/content.ts
  content      jsonb,
  -- True when written by the model; false = the no-AI fallback.
  ai           boolean not null default false,
  batch_id     text,
  error        text,
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, week_start)
);

create index briefings_week_status_idx on public.briefings (week_start, status);

alter table public.briefings enable row level security;

create policy "read own briefings" on public.briefings
  for select using (user_id = (select auth.uid()));

-- Senders look up a user's pending/sent rows by delivery.
create index if not exists user_events_user_delivery_idx
  on public.user_events (user_id, delivery, status);
