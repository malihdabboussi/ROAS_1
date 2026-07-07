alter table public.integration_capabilities
  add column if not exists domains text[] not null default '{shared}'::text[];

create index if not exists idx_integration_capabilities_domains
  on public.integration_capabilities using gin (domains);

drop function if exists public.search_integration_capabilities(vector(768), int, text);

create or replace function public.search_integration_capabilities(
  query_embedding vector(768),
  match_count int default 10,
  filter_integration_id text default null,
  filter_domain text default null
)
returns table (
  id bigint,
  integration_id text,
  action_slug text,
  execution_mode text,
  display_name text,
  description text,
  parameters jsonb,
  examples jsonb,
  metadata jsonb,
  domains text[],
  similarity double precision
)
language sql
stable
as $$
  select
    ic.id,
    ic.integration_id,
    ic.action_slug,
    ic.execution_mode,
    ic.display_name,
    ic.description,
    ic.parameters,
    ic.examples,
    ic.metadata,
    ic.domains,
    (1 - (ic.embedding <=> query_embedding))::double precision as similarity
  from public.integration_capabilities ic
  where ic.embedding is not null
    and (filter_integration_id is null or ic.integration_id = filter_integration_id)
    and (filter_domain is null or filter_domain = any(ic.domains) or 'shared' = any(ic.domains))
  order by ic.embedding <=> query_embedding
  limit greatest(1, least(match_count, 50));
$$;
