create table if not exists public.integration_capabilities (
  id bigserial primary key,
  integration_id text not null,
  action_slug text not null,
  execution_mode text not null check (execution_mode in ('composio', 'legacy')),
  display_name text not null,
  description text not null default '',
  parameters jsonb not null default '{}'::jsonb,
  examples jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(integration_id, action_slug)
);

create index if not exists idx_integration_capabilities_integration_id
  on public.integration_capabilities (integration_id);

create index if not exists idx_integration_capabilities_embedding
  on public.integration_capabilities
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

grant select on table public.integration_capabilities to authenticated;

create or replace function public.search_integration_capabilities(
  query_embedding vector(768),
  match_count int default 10,
  filter_integration_id text default null
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
    (1 - (ic.embedding <=> query_embedding))::double precision as similarity
  from public.integration_capabilities ic
  where ic.embedding is not null
    and (filter_integration_id is null or ic.integration_id = filter_integration_id)
  order by ic.embedding <=> query_embedding
  limit greatest(1, least(match_count, 50));
$$;
