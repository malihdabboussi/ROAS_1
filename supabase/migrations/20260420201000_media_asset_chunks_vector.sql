create table if not exists public.media_asset_chunks (
  id bigserial primary key,
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  user_id uuid not null,
  org_id uuid null,
  page_number integer null,
  chunk_index integer not null,
  content text not null,
  embedding extensions.vector(768) not null,
  created_at timestamptz not null default now(),
  unique (asset_id, chunk_index)
);

create index if not exists idx_media_asset_chunks_asset_id
  on public.media_asset_chunks (asset_id);

create index if not exists idx_media_asset_chunks_embedding
  on public.media_asset_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.media_asset_chunks enable row level security;

revoke all on table public.media_asset_chunks from public;
grant all on table public.media_asset_chunks to service_role;
grant all on table public.media_asset_chunks to postgres;

create or replace function public.search_media_asset_chunks(
  p_asset_id uuid,
  p_user_id uuid,
  p_org_id uuid,
  p_query_embedding text,
  p_match_count int default 8,
  p_min_similarity double precision default 0.35
)
returns table (
  page_number integer,
  snippet text,
  similarity double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    c.page_number,
    c.content as snippet,
    (1 - (c.embedding <=> (p_query_embedding::extensions.vector(768))))::double precision as similarity
  from public.media_asset_chunks c
  where c.asset_id = p_asset_id
    and c.user_id = p_user_id
    and ((p_org_id is null and c.org_id is null) or c.org_id = p_org_id)
    and (1 - (c.embedding <=> (p_query_embedding::extensions.vector(768)))) >= coalesce(p_min_similarity, 0.35)::double precision
  order by c.embedding <=> (p_query_embedding::extensions.vector(768))
  limit greatest(1, least(coalesce(p_match_count, 8), 20));
$$;

grant execute on function public.search_media_asset_chunks(uuid, uuid, uuid, text, int, double precision) to service_role;
