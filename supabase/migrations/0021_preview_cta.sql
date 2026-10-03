-- Homepage widget: when a visitor clicked "Join the beta" on a preview
-- (2026-10-04). Sign-ups and finished onboarding come from claimed_by.
alter table public.previews add column if not exists cta_clicked_at timestamptz;
