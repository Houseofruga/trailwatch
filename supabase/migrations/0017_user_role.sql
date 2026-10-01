-- Onboarding asks "What's your role?" (optional, never blocks sign-up): who
-- the beta's users are. Written by the service role like the rest of users.
alter table public.users
  add column if not exists role text
    check (role in ('founder', 'marketer', 'agency', 'other'));
