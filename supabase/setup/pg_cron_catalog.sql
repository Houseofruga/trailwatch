-- One-time setup: schedule the catalog tick from Supabase (pivot Phase 2).
-- NOT a migration — it contains your cron secret and production URL.
--
-- Why: Vercel Cron is daily-only on our plan; catalogs need checks every few
-- hours. pg_cron (free, built into Supabase) calls our endpoint every 10
-- minutes; each call checks only the stores that are due.
--
-- Before running:
--   1. Replace <CRON_SECRET> below with the same value as CRON_SECRET in Vercel.
--   2. Confirm the URL is your production domain.
--   3. Deploy the code containing /api/cron/catalog first.
-- Run in the Supabase SQL editor.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Keep the secret in Supabase Vault rather than in the job text.
select vault.create_secret('<CRON_SECRET>', 'trailwatch_cron_secret');

select cron.schedule(
  'trailwatch-catalog-tick',
  '*/10 * * * *',
  $$
  select net.http_get(
    url := 'https://gettrailwatch.com/api/cron/catalog',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'trailwatch_cron_secret')
    ),
    timeout_milliseconds := 300000
  );
  $$
);

-- Check it's scheduled:        select * from cron.job;
-- See recent runs:              select * from cron.job_run_details order by start_time desc limit 10;
-- See the HTTP responses:       select * from net._http_response order by created desc limit 10;
-- Remove it:                    select cron.unschedule('trailwatch-catalog-tick');
