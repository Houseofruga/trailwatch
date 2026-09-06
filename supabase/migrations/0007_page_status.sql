-- v3 follow-up: surface unreachable/404 pages, and show a page's own "last
-- updated" date on the dashboard when it's quiet.

-- Last check outcome, so the UI can flag a page it can't reach.
-- 'ok'     — the last check fetched and processed the page.
-- 'broken' — the last fetch returned a 4xx (usually 404 — a bad URL, permanent).
-- 'error'  — a transient failure (5xx, timeout, network, redirect problem).
-- null     — never checked yet.
alter table public.pages
  add column if not exists last_check_status text
    check (last_check_status in ('ok', 'broken', 'error'));

-- Human-readable failure message for the flagged state, e.g. "The page returned
-- HTTP 404." Null on success.
alter table public.pages
  add column if not exists last_check_error text;

-- Cached "last updated" from the last-updated finder (site-declared freshness:
-- Last-Modified header, sitemap lastmod, JSON-LD dateModified, ...). Shown on the
-- dashboard for quiet pages instead of a change we haven't detected.
-- last_updated_iso    — the finder's best-guess timestamp (null = none found).
-- last_updated_source — human label of the winning signal, e.g. "Last-Modified header".
-- last_updated_checked_at — when the finder last ran, for the cache TTL.
alter table public.pages
  add column if not exists last_updated_iso        timestamptz,
  add column if not exists last_updated_source     text,
  add column if not exists last_updated_checked_at timestamptz;
