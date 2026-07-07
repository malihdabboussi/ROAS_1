-- Add path-based routing support for funnels.
-- Enables multi-page "website" funnels without relying on page_type.

alter table public.funnel_pages
  add column if not exists path text;

alter table public.funnels
  add column if not exists home_page_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'funnels_home_page_id_fkey'
  ) then
    alter table public.funnels
      add constraint funnels_home_page_id_fkey
      foreign key (home_page_id)
      references public.funnel_pages(id)
      on delete set null;
  end if;
end $$;

create unique index if not exists funnel_pages_unique_path_per_funnel
  on public.funnel_pages (funnel_id, path)
  where path is not null;

-- Backfill:
-- - home_page_id: first page by order_index (tie-breaker created_at)
-- - home page path: '/' if missing
with first_pages as (
  select distinct on (p.funnel_id)
    p.funnel_id,
    p.id as page_id
  from public.funnel_pages p
  order by p.funnel_id, p.order_index asc, p.created_at asc
)
update public.funnels f
set home_page_id = fp.page_id
from first_pages fp
where f.id = fp.funnel_id
  and f.home_page_id is null;

update public.funnel_pages p
set path = '/'
from public.funnels f
where f.home_page_id = p.id
  and p.path is null;

