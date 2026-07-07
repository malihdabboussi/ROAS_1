create extension if not exists vector;

create table if not exists public.composio_toolkits (
  toolkit_slug text primary key,
  name text not null,
  description text not null default '',
  logo text,
  categories text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(768),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_composio_toolkits_updated_at
  on public.composio_toolkits (updated_at desc);

create index if not exists idx_composio_toolkits_embedding
  on public.composio_toolkits
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

grant select on table public.composio_toolkits to authenticated;

create or replace function public.search_composio_toolkits(
  query_embedding vector(768),
  match_count int default 10
)
returns table (
  toolkit_slug text,
  name text,
  description text,
  logo text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
as $$
  select
    ct.toolkit_slug,
    ct.name,
    ct.description,
    ct.logo,
    ct.metadata,
    (1 - (ct.embedding <=> query_embedding))::double precision as similarity
  from public.composio_toolkits ct
  where ct.embedding is not null
  order by ct.embedding <=> query_embedding
  limit greatest(1, least(match_count, 25));
$$;
