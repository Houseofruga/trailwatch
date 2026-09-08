-- IA redesign: pages get a fixed "page type" — the dashboard's grouping key.
-- Pages of the same type across competitors sit in one card ("all pricing pages",
-- "all homepages"). `label` stays as the free-text page name; page_type is a
-- closed set. Keep the value list + backfill in sync with
-- src/features/competitors/pageTypes.ts.

alter table public.pages
  add column if not exists page_type text not null default 'other'
    check (page_type in ('homepage', 'pricing', 'product', 'blog', 'changelog', 'other'));

-- Backfill existing rows best-effort from their label (mirrors labelToType()).
update public.pages set page_type = case
  when lower(label) in ('home', 'homepage', 'home page')            then 'homepage'
  when lower(label) in ('pricing', 'plans', 'price')                then 'pricing'
  when lower(label) like '%pricing%' or lower(label) like '%plans%' then 'pricing'
  when lower(label) in ('product', 'products', 'features', 'integrations') then 'product'
  when lower(label) in ('changelog', 'releases', 'release notes', 'updates') then 'changelog'
  when lower(label) like '%changelog%' or lower(label) like '%release%' then 'changelog'
  when lower(label) in ('blog', 'news') or lower(label) like '%blog%' then 'blog'
  when lower(label) like '%home%'                                    then 'homepage'
  else 'other'
end
where page_type = 'other';

-- Group/filter pages by type within a user's set.
create index if not exists pages_page_type_idx on public.pages (page_type);
