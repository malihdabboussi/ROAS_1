-- Public docs RAG: chunked MDX embeddings (768-dim, same as brain). Anon reads only via SECURITY DEFINER RPC.

create table if not exists public.public_docs_chunks (
  id bigserial primary key,
  index_run_id text not null,
  doc_slug text not null,
  chunk_index int not null,
  title text not null default '',
  body text not null,
  embedding vector(768) not null,
  created_at timestamptz not null default now(),
  unique (index_run_id, doc_slug, chunk_index)
);

create index if not exists idx_public_docs_chunks_embedding
  on public.public_docs_chunks
  using hnsw (embedding vector_cosine_ops);

create index if not exists idx_public_docs_chunks_run
  on public.public_docs_chunks (index_run_id);

alter table public.public_docs_chunks enable row level security;

revoke all on table public.public_docs_chunks from public;
grant all on table public.public_docs_chunks to service_role;
grant all on table public.public_docs_chunks to postgres;

create or replace function public.search_public_docs_chunks(
  query_embedding text,
  match_count int default 8,
  min_similarity double precision default 0.35
)
returns table (
  doc_slug text,
  title text,
  body text,
  chunk_index int,
  similarity double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.doc_slug,
    p.title,
    p.body,
    p.chunk_index,
    (1 - (p.embedding <=> (query_embedding::vector(768))))::double precision as similarity
  from public.public_docs_chunks p
  where p.embedding is not null
    and (1 - (p.embedding <=> (query_embedding::vector(768)))) >= coalesce(min_similarity, 0.35)::double precision
  order by p.embedding <=> (query_embedding::vector(768))
  limit greatest(1, least(coalesce(match_count, 8), 20));
$$;

grant execute on function public.search_public_docs_chunks(text, int, double precision) to anon;
grant execute on function public.search_public_docs_chunks(text, int, double precision) to authenticated;
