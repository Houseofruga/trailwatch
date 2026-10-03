-- Onboarding from the homepage widget (2026-10-04, widget prompt Part 3):
-- when a claimed preview's user finished onboarding (signup_from_widget is
-- claimed_by; onboarding_completed_from_widget is this).
alter table public.previews add column if not exists completed_at timestamptz;
