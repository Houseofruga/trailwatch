-- Day-0 value: an instant AI "baseline profile" of each page we start watching
-- (positioning, pricing tiers, what-to-watch), generated once from the page's
-- first snapshot and cached here so the user sees value immediately instead of an
-- empty dashboard. One row per page; regenerated only if deleted.

create table public.page_insights (
  page_id      uuid primary key references public.pages(id) on delete cascade,
  profile      jsonb not null,
  model        text,
  generated_at timestamptz not null default now()
);

-- Owner-scoped reads, same shape as snapshots/changes (child reaches up to
-- competitors.user_id). Writes go through the service-role key (see
-- src/features/insights/generate.ts), which bypasses RLS — so, like snapshots,
-- only a SELECT policy is needed.
alter table public.page_insights enable row level security;

create policy "read own page_insights" on public.page_insights
  for select using (
    exists (
      select 1 from public.pages p
      join public.competitors c on c.id = p.competitor_id
      where p.id = page_insights.page_id and c.user_id = (select auth.uid())
    )
  );
