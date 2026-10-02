-- In-app competitor suggestions (2026-10-02): the finder's last result for the
-- user's own store, so reopening onboarding or the Add competitor modal doesn't
-- run another search. Written by the service role like the rest of users.
alter table public.users
  add column if not exists suggestions jsonb,
  add column if not exists suggestions_store text,
  add column if not exists suggestions_at timestamptz;
