-- Complete Brain retrieval lanes: additive schema, indexes, and RPCs.
-- No destructive operations.

alter table public.ns_belief_patterns
  add column if not exists embedding vector(768);

alter table public.ns_perspectives
  add column if not exists embedding vector(768);

alter table public.ns_snapshots
  add column if not exists search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(core, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(one_liner, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(story, '')), 'D')
  ) stored;

alter table public.customer_avatars
  add column if not exists embedding vector(768),
  add column if not exists search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(narrative_md, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(blind_spots, '')), 'D')
  ) stored;

alter table public.avatar_discriminator_axes
  add column if not exists embedding vector(768),
  add column if not exists search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(high_end_signature, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(low_end_signature, '')), 'C')
  ) stored;

alter table public.company_cortex_signals
  add column if not exists embedding vector(768),
  add column if not exists search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(signal_type, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(truth, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(reason, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(context_form, '')), 'D')
  ) stored;

create index if not exists idx_ns_belief_patterns_embedding
  on public.ns_belief_patterns using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

create index if not exists idx_ns_perspectives_embedding
  on public.ns_perspectives using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

create index if not exists idx_ns_narrative_pages_embedding
  on public.ns_narrative_pages using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

create index if not exists idx_ns_snapshots_search_vector
  on public.ns_snapshots using gin (search_vector);

create index if not exists idx_customer_avatars_embedding
  on public.customer_avatars using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

create index if not exists idx_customer_avatars_search_vector
  on public.customer_avatars using gin (search_vector);

create index if not exists idx_avatar_discriminator_axes_embedding
  on public.avatar_discriminator_axes using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

create index if not exists idx_avatar_discriminator_axes_search_vector
  on public.avatar_discriminator_axes using gin (search_vector);

create index if not exists idx_company_cortex_signals_embedding
  on public.company_cortex_signals using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

create index if not exists idx_company_cortex_signals_search_vector
  on public.company_cortex_signals using gin (search_vector);

drop function if exists public.resolve_brain_evidence_types(uuid[]);

create or replace function public.resolve_brain_evidence_types(p_ids text[])
returns table(id text, evidence_type text)
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  select x.id, x.evidence_type
  from (
    select m.id::text as id, 'memory'::text as evidence_type from public.ns_memories m where m.id::text = any(p_ids)
    union all
    select s.id::text, 'snapshot'::text from public.ns_snapshots s where s.id::text = any(p_ids)
    union all
    select sk.id::text, 'sk_entry'::text from public.ns_sk_entries sk where sk.id::text = any(p_ids)
    union all
    select np.id::text, 'narrative_page'::text from public.ns_narrative_pages np where np.id::text = any(p_ids)
    union all
    select bp.id::text, 'belief_pattern'::text from public.ns_belief_patterns bp where bp.id::text = any(p_ids)
    union all
    select p.id::text, 'perspective'::text from public.ns_perspectives p where p.id::text = any(p_ids)
    union all
    select co.id::text, 'company_object'::text from public.company_cortex_objects co where co.id::text = any(p_ids)
    union all
    select cs.id::text, 'company_signal'::text from public.company_cortex_signals cs where cs.id::text = any(p_ids)
    union all
    select ca.id::text, 'customer_avatar'::text from public.customer_avatars ca where ca.id::text = any(p_ids)
    union all
    select ec.id::text, 'evidence_chunk'::text from public.ns_brain_evidence_chunks ec where ec.id::text = any(p_ids)
    union all
    select a.id, 'avatar_axis'::text from public.avatar_discriminator_axes a where a.id = any(p_ids)
  ) x;
$$;

create or replace function public.search_narrative_pages(
  p_brain_id uuid,
  p_query_embedding vector,
  p_match_threshold numeric default 0.3,
  p_match_count integer default 5
)
returns table(id uuid, slug text, title text, page_type text, summary text, content_md text, similarity numeric)
language sql
stable
set search_path to 'public', 'extensions', 'pg_temp'
as $$
  select
    np.id, np.slug, np.title, np.page_type, np.summary, np.content_md,
    1 - (np.embedding <=> p_query_embedding) as similarity
  from public.ns_narrative_pages np
  where np.brain_id = p_brain_id
    and np.status = 'active'
    and np.embedding is not null
    and (1 - (np.embedding <=> p_query_embedding)) >= p_match_threshold
  order by np.embedding <=> p_query_embedding
  limit least(greatest(coalesce(p_match_count, 5), 1), 50);
$$;

create or replace function public.search_ns_snapshots_lexical(
  p_brain_id uuid,
  p_query text,
  p_limit integer default 20
)
returns table(
  id uuid,
  brain_id uuid,
  name text,
  type text,
  core text,
  confidence numeric,
  significance_score numeric,
  tags text[],
  source text,
  source_type text,
  source_id text,
  lexical_rank bigint,
  lexical_score real
)
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  with query as (
    select websearch_to_tsquery('english', coalesce(p_query, '')) as tsquery
  ),
  ranked as (
    select
      s.id,
      s.brain_id,
      s.name,
      s.type,
      s.core,
      s.confidence,
      s.significance_score,
      s.tags,
      s.source,
      s.source_type,
      s.source_id,
      ts_rank_cd(s.search_vector, query.tsquery)::real as lexical_score
    from public.ns_snapshots s
    cross join query
    where s.brain_id = p_brain_id
      and s.search_vector @@ query.tsquery
  )
  select
    ranked.id,
    ranked.brain_id,
    ranked.name,
    ranked.type,
    ranked.core,
    ranked.confidence,
    ranked.significance_score,
    ranked.tags,
    ranked.source,
    ranked.source_type,
    ranked.source_id,
    row_number() over (order by ranked.lexical_score desc, ranked.significance_score desc nulls last, ranked.confidence desc nulls last) as lexical_rank,
    ranked.lexical_score
  from ranked
  order by ranked.lexical_score desc, ranked.significance_score desc nulls last, ranked.confidence desc nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

create or replace function public.search_ns_belief_patterns(
  p_brain_id uuid,
  p_query_embedding vector,
  p_match_threshold numeric default 0.3,
  p_match_count integer default 10
)
returns table(
  id uuid,
  brain_id uuid,
  pattern_name text,
  description text,
  status text,
  strength numeric,
  supporting_memories uuid[],
  similarity numeric
)
language sql
stable
set search_path to 'public', 'extensions', 'pg_temp'
as $$
  select
    bp.id,
    bp.brain_id,
    bp.pattern_name,
    bp.description,
    bp.status,
    bp.strength,
    bp.supporting_memories,
    1 - (bp.embedding <=> p_query_embedding) as similarity
  from public.ns_belief_patterns bp
  where bp.brain_id = p_brain_id
    and bp.embedding is not null
    and bp.status in ('emerging', 'active', 'challenged')
    and (1 - (bp.embedding <=> p_query_embedding)) >= p_match_threshold
  order by bp.embedding <=> p_query_embedding
  limit least(greatest(coalesce(p_match_count, 10), 1), 50);
$$;

create or replace function public.search_brain_evidence_chunks(
  p_brain_id uuid,
  p_query_embedding vector,
  p_match_threshold numeric default 0.25,
  p_match_count integer default 10
)
returns table(
  id uuid,
  brain_id uuid,
  source_type text,
  source_id text,
  source_title text,
  chunk_index integer,
  contextual_prefix text,
  content text,
  metadata jsonb,
  similarity numeric
)
language sql
stable
set search_path to 'public', 'extensions', 'pg_temp'
as $$
  select
    c.id,
    c.brain_id,
    c.source_type,
    c.source_id,
    c.source_title,
    c.chunk_index,
    c.contextual_prefix,
    c.content,
    c.metadata,
    1 - (c.embedding <=> p_query_embedding) as similarity
  from public.ns_brain_evidence_chunks c
  where c.brain_id = p_brain_id
    and c.embedding is not null
    and (1 - (c.embedding <=> p_query_embedding)) >= p_match_threshold
  order by c.embedding <=> p_query_embedding
  limit least(greatest(coalesce(p_match_count, 10), 1), 50);
$$;

create or replace function public.search_ns_belief_patterns_lexical(
  p_brain_id uuid,
  p_query text,
  p_limit integer default 20
)
returns table(
  id uuid,
  brain_id uuid,
  pattern_name text,
  description text,
  status text,
  strength numeric,
  supporting_memories uuid[],
  lexical_rank bigint,
  lexical_score real
)
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  with query as (
    select websearch_to_tsquery('english', coalesce(p_query, '')) as tsquery
  ),
  ranked as (
    select
      bp.id,
      bp.brain_id,
      bp.pattern_name,
      bp.description,
      bp.status,
      bp.strength,
      bp.supporting_memories,
      ts_rank_cd(bp.search_vector, query.tsquery)::real as lexical_score
    from public.ns_belief_patterns bp
    cross join query
    where bp.brain_id = p_brain_id
      and bp.status in ('emerging', 'active', 'challenged')
      and bp.search_vector @@ query.tsquery
  )
  select
    ranked.id,
    ranked.brain_id,
    ranked.pattern_name,
    ranked.description,
    ranked.status,
    ranked.strength,
    ranked.supporting_memories,
    row_number() over (order by ranked.lexical_score desc, ranked.strength desc nulls last) as lexical_rank,
    ranked.lexical_score
  from ranked
  order by ranked.lexical_score desc, ranked.strength desc nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

create or replace function public.search_ns_perspectives(
  p_brain_id uuid,
  p_query_embedding vector,
  p_match_threshold numeric default 0.3,
  p_match_count integer default 10
)
returns table(
  id uuid,
  brain_id uuid,
  name text,
  description text,
  narrative_md text,
  status text,
  strength numeric,
  beliefs uuid[],
  similarity numeric
)
language sql
stable
set search_path to 'public', 'extensions', 'pg_temp'
as $$
  select
    p.id,
    p.brain_id,
    p.name,
    p.description,
    p.narrative_md,
    p.status,
    p.strength,
    p.beliefs,
    1 - (p.embedding <=> p_query_embedding) as similarity
  from public.ns_perspectives p
  where p.brain_id = p_brain_id
    and p.embedding is not null
    and p.status in ('emerging', 'active')
    and (1 - (p.embedding <=> p_query_embedding)) >= p_match_threshold
  order by p.embedding <=> p_query_embedding
  limit least(greatest(coalesce(p_match_count, 10), 1), 50);
$$;

create or replace function public.search_ns_perspectives_lexical(
  p_brain_id uuid,
  p_query text,
  p_limit integer default 20
)
returns table(
  id uuid,
  brain_id uuid,
  name text,
  description text,
  narrative_md text,
  status text,
  strength numeric,
  beliefs uuid[],
  lexical_rank bigint,
  lexical_score real
)
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  with query as (
    select websearch_to_tsquery('english', coalesce(p_query, '')) as tsquery
  ),
  ranked as (
    select
      p.id,
      p.brain_id,
      p.name,
      p.description,
      p.narrative_md,
      p.status,
      p.strength,
      p.beliefs,
      ts_rank_cd(p.search_vector, query.tsquery)::real as lexical_score
    from public.ns_perspectives p
    cross join query
    where p.brain_id = p_brain_id
      and p.status in ('emerging', 'active')
      and p.search_vector @@ query.tsquery
  )
  select
    ranked.id,
    ranked.brain_id,
    ranked.name,
    ranked.description,
    ranked.narrative_md,
    ranked.status,
    ranked.strength,
    ranked.beliefs,
    row_number() over (order by ranked.lexical_score desc, ranked.strength desc nulls last) as lexical_rank,
    ranked.lexical_score
  from ranked
  order by ranked.lexical_score desc, ranked.strength desc nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

create or replace function public.search_customer_avatars(
  p_brain_id uuid,
  p_query_embedding vector,
  p_match_threshold numeric default 0.3,
  p_match_count integer default 10
)
returns table(
  id uuid,
  brain_id uuid,
  name text,
  summary text,
  narrative_md text,
  status text,
  strength numeric,
  confidence numeric,
  similarity numeric
)
language sql
stable
set search_path to 'public', 'extensions', 'pg_temp'
as $$
  select
    ca.id,
    ca.brain_id,
    ca.name,
    ca.summary,
    ca.narrative_md,
    ca.status,
    ca.strength,
    ca.confidence,
    1 - (ca.embedding <=> p_query_embedding) as similarity
  from public.customer_avatars ca
  where ca.brain_id = p_brain_id
    and ca.embedding is not null
    and ca.status = 'active'
    and (1 - (ca.embedding <=> p_query_embedding)) >= p_match_threshold
  order by ca.embedding <=> p_query_embedding
  limit least(greatest(coalesce(p_match_count, 10), 1), 50);
$$;

create or replace function public.search_customer_avatars_lexical(
  p_brain_id uuid,
  p_query text,
  p_limit integer default 20
)
returns table(
  id uuid,
  brain_id uuid,
  name text,
  summary text,
  narrative_md text,
  status text,
  strength numeric,
  confidence numeric,
  lexical_rank bigint,
  lexical_score real
)
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  with query as (
    select websearch_to_tsquery('english', coalesce(p_query, '')) as tsquery
  ),
  ranked as (
    select
      ca.id,
      ca.brain_id,
      ca.name,
      ca.summary,
      ca.narrative_md,
      ca.status,
      ca.strength,
      ca.confidence,
      ts_rank_cd(ca.search_vector, query.tsquery)::real as lexical_score
    from public.customer_avatars ca
    cross join query
    where ca.brain_id = p_brain_id
      and ca.status = 'active'
      and ca.search_vector @@ query.tsquery
  )
  select
    ranked.id,
    ranked.brain_id,
    ranked.name,
    ranked.summary,
    ranked.narrative_md,
    ranked.status,
    ranked.strength,
    ranked.confidence,
    row_number() over (order by ranked.lexical_score desc, ranked.strength desc nulls last, ranked.confidence desc nulls last) as lexical_rank,
    ranked.lexical_score
  from ranked
  order by ranked.lexical_score desc, ranked.strength desc nulls last, ranked.confidence desc nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

create or replace function public.search_avatar_discriminator_axes(
  p_org_id uuid,
  p_query_embedding vector,
  p_match_threshold numeric default 0.3,
  p_match_count integer default 10
)
returns table(
  id text,
  org_id uuid,
  name text,
  description text,
  high_end_signature text,
  low_end_signature text,
  status text,
  recurrence_count integer,
  similarity numeric
)
language sql
stable
set search_path to 'public', 'extensions', 'pg_temp'
as $$
  select
    a.id,
    a.org_id,
    a.name,
    a.description,
    a.high_end_signature,
    a.low_end_signature,
    a.status,
    a.recurrence_count,
    1 - (a.embedding <=> p_query_embedding) as similarity
  from public.avatar_discriminator_axes a
  where (a.org_id = p_org_id or a.org_id is null)
    and a.embedding is not null
    and a.status = 'active'
    and (1 - (a.embedding <=> p_query_embedding)) >= p_match_threshold
  order by a.embedding <=> p_query_embedding
  limit least(greatest(coalesce(p_match_count, 10), 1), 50);
$$;

create or replace function public.search_avatar_discriminator_axes_lexical(
  p_org_id uuid,
  p_query text,
  p_limit integer default 20
)
returns table(
  id text,
  org_id uuid,
  name text,
  description text,
  high_end_signature text,
  low_end_signature text,
  status text,
  recurrence_count integer,
  lexical_rank bigint,
  lexical_score real
)
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  with query as (
    select websearch_to_tsquery('english', coalesce(p_query, '')) as tsquery
  ),
  ranked as (
    select
      a.id,
      a.org_id,
      a.name,
      a.description,
      a.high_end_signature,
      a.low_end_signature,
      a.status,
      a.recurrence_count,
      ts_rank_cd(a.search_vector, query.tsquery)::real as lexical_score
    from public.avatar_discriminator_axes a
    cross join query
    where (a.org_id = p_org_id or a.org_id is null)
      and a.status = 'active'
      and a.search_vector @@ query.tsquery
  )
  select
    ranked.id,
    ranked.org_id,
    ranked.name,
    ranked.description,
    ranked.high_end_signature,
    ranked.low_end_signature,
    ranked.status,
    ranked.recurrence_count,
    row_number() over (order by ranked.lexical_score desc, ranked.recurrence_count desc nulls last) as lexical_rank,
    ranked.lexical_score
  from ranked
  order by ranked.lexical_score desc, ranked.recurrence_count desc nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

create or replace function public.search_company_cortex_signals(
  p_brain_id uuid,
  p_org_id uuid,
  p_query_embedding vector,
  p_match_threshold numeric default 0.3,
  p_match_count integer default 10
)
returns table(
  id uuid,
  brain_id uuid,
  org_id uuid,
  signal_type text,
  truth text,
  confidence numeric,
  reason text,
  context_form text,
  status text,
  source text,
  similarity numeric
)
language sql
stable
set search_path to 'public', 'extensions', 'pg_temp'
as $$
  select
    cs.id,
    cs.brain_id,
    cs.org_id,
    cs.signal_type,
    cs.truth,
    cs.confidence,
    cs.reason,
    cs.context_form,
    cs.status,
    cs.source,
    1 - (cs.embedding <=> p_query_embedding) as similarity
  from public.company_cortex_signals cs
  where cs.brain_id = p_brain_id
    and cs.org_id = p_org_id
    and cs.embedding is not null
    and cs.status in ('active', 'proposed')
    and (1 - (cs.embedding <=> p_query_embedding)) >= p_match_threshold
  order by cs.embedding <=> p_query_embedding
  limit least(greatest(coalesce(p_match_count, 10), 1), 50);
$$;

create or replace function public.search_company_cortex_signals_lexical(
  p_brain_id uuid,
  p_org_id uuid,
  p_query text,
  p_limit integer default 20
)
returns table(
  id uuid,
  brain_id uuid,
  org_id uuid,
  signal_type text,
  truth text,
  confidence numeric,
  reason text,
  context_form text,
  status text,
  source text,
  lexical_rank bigint,
  lexical_score real
)
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  with query as (
    select websearch_to_tsquery('english', coalesce(p_query, '')) as tsquery
  ),
  ranked as (
    select
      cs.id,
      cs.brain_id,
      cs.org_id,
      cs.signal_type,
      cs.truth,
      cs.confidence,
      cs.reason,
      cs.context_form,
      cs.status,
      cs.source,
      ts_rank_cd(cs.search_vector, query.tsquery)::real as lexical_score
    from public.company_cortex_signals cs
    cross join query
    where cs.brain_id = p_brain_id
      and cs.org_id = p_org_id
      and cs.status in ('active', 'proposed')
      and cs.search_vector @@ query.tsquery
  )
  select
    ranked.id,
    ranked.brain_id,
    ranked.org_id,
    ranked.signal_type,
    ranked.truth,
    ranked.confidence,
    ranked.reason,
    ranked.context_form,
    ranked.status,
    ranked.source,
    row_number() over (order by ranked.lexical_score desc, ranked.confidence desc) as lexical_rank,
    ranked.lexical_score
  from ranked
  order by ranked.lexical_score desc, ranked.confidence desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
