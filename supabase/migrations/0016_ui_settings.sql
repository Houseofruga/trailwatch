-- UI Step 6 (trailwatch-shopify-ui-prompt.md): settings and data the new screens need.

-- Monday briefing: the user picks the time (6–11 AM) and time zone; the day
-- stays Monday (UX_SPEC.md §7, decision 1). The on/off switch is the existing
-- users.digest_enabled.
alter table public.users
  add column if not exists briefing_hour smallint not null default 8
    check (briefing_hour between 6 and 11),
  add column if not exists briefing_time_zone text not null default 'America/New_York';

-- Where email alerts go; null = the account's login email.
alter table public.alert_settings
  add column if not exists send_to text
    check (send_to is null or send_to ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- One-line "What it means" for high-priority moves (DESIGN_TO_COMPONENTS.md D2),
-- written once per store event and shared by every follower.
alter table public.events
  add column if not exists meaning text;

-- Home and competitor timelines read a user's moves newest first.
create index if not exists user_events_user_created_idx on public.user_events (user_id, created_at desc);
create index if not exists events_store_page_idx on public.events (store_page_id, detected_at desc)
  where store_page_id is not null;

-- Log the "What it means" calls in the cost view alongside classification.
alter table public.ai_usage drop constraint if exists ai_usage_feature_check;
alter table public.ai_usage add constraint ai_usage_feature_check
  check (feature in ('classify', 'briefing', 'meaning'));
