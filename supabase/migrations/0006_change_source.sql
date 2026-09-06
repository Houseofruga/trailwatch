-- Phase 2: historical backfill from the Wayback Machine.
-- Backfilled changes are recorded as ordinary `changes` rows so the existing
-- change-detail UI renders them, but tagged with a source so they can be kept
-- out of the live "this week" feed and the weekly email, and dated to the
-- archive capture rather than "now".

-- 'live'  — detected by the daily/ manual check engine (the default).
-- 'archive' — reconstructed from an Internet Archive capture pair.
alter table public.changes
  add column source text not null default 'live' check (source in ('live', 'archive'));

-- The "before" capture date for an archive change. Live rows leave this null and
-- keep deriving the before-date from from_snapshot.fetched_at; archive rows have
-- no snapshot rows, so they carry the date here instead.
alter table public.changes
  add column compared_from_at timestamptz;

-- When we last attempted a Wayback backfill for this page (null = never). Set
-- before the work runs so it happens at most once, even on a thin/empty archive.
alter table public.pages
  add column backfilled_at timestamptz;

-- Fast "this page's archive history, newest first" reads for the history panel.
create index changes_page_source_detected_idx
  on public.changes (page_id, source, detected_at desc);
