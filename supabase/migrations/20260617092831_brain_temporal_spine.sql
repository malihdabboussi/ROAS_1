-- Temporal Brain Spine v1
--
-- created_at stays "row learned by Atlas"; occurred/asserted/valid/effective
-- fields model source time and knowledge validity.

create or replace function public.try_parse_timestamptz(p_value text)
returns timestamptz
language plpgsql
stable
set search_path = public, pg_temp
as $$
begin
  if p_value is null or btrim(p_value) = '' then
    return null;
  end if;
  return p_value::timestamptz;
exception when others then
  return null;
end;
$$;

create table if not exists public.brain_episodes (
  id uuid primary key default gen_random_uuid(),
  brain_id uuid not null references public.ns_brains(id) on delete cascade,
  source_type text not null,
  source_id text,
  source_title text,
  occurred_at timestamptz,
  occurred_until timestamptz,
  ingested_at timestamptz not null default now(),
  asserted_at timestamptz,
  temporal_confidence numeric not null default 1 check (temporal_confidence >= 0 and temporal_confidence <= 1),
  temporal_source text not null default 'source_payload',
  participants jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brain_episodes_window_check check (
    occurred_until is null or occurred_at is null or occurred_until >= occurred_at
  )
);

create unique index if not exists idx_brain_episodes_source
  on public.brain_episodes (brain_id, source_type, source_id)
  where source_id is not null;
create index if not exists idx_brain_episodes_brain_occurred
  on public.brain_episodes (brain_id, occurred_at desc nulls last);
create index if not exists idx_brain_episodes_brain_ingested
  on public.brain_episodes (brain_id, ingested_at desc);

alter table public.brain_episodes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'brain_episodes' and policyname = 'brain_episodes_select'
  ) then
    create policy brain_episodes_select on public.brain_episodes
      for select using (public.can_access_brain(brain_id, 'view'));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'brain_episodes' and policyname = 'brain_episodes_insert'
  ) then
    create policy brain_episodes_insert on public.brain_episodes
      for insert with check (public.can_access_brain(brain_id, 'train'));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'brain_episodes' and policyname = 'brain_episodes_update'
  ) then
    create policy brain_episodes_update on public.brain_episodes
      for update using (public.can_access_brain(brain_id, 'train'))
      with check (public.can_access_brain(brain_id, 'train'));
  end if;
end $$;

alter table if exists public.ns_memories
  add column if not exists episode_id uuid references public.brain_episodes(id) on delete set null,
  add column if not exists occurred_at timestamptz,
  add column if not exists occurred_until timestamptz,
  add column if not exists asserted_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)),
  add column if not exists temporal_source text;

alter table if exists public.ns_brain_evidence_chunks
  add column if not exists episode_id uuid references public.brain_episodes(id) on delete set null,
  add column if not exists occurred_at timestamptz,
  add column if not exists occurred_until timestamptz,
  add column if not exists asserted_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)),
  add column if not exists temporal_source text;

alter table if exists public.ns_sk_sources
  add column if not exists episode_id uuid references public.brain_episodes(id) on delete set null,
  add column if not exists occurred_at timestamptz,
  add column if not exists occurred_until timestamptz,
  add column if not exists asserted_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)),
  add column if not exists temporal_source text;

alter table if exists public.ns_sk_entries
  add column if not exists episode_id uuid references public.brain_episodes(id) on delete set null,
  add column if not exists occurred_at timestamptz,
  add column if not exists occurred_until timestamptz,
  add column if not exists asserted_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)),
  add column if not exists temporal_source text;

alter table if exists public.ns_snapshots
  add column if not exists evidence_started_at timestamptz,
  add column if not exists evidence_ended_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)),
  add column if not exists temporal_source text;

alter table if exists public.ns_belief_patterns
  add column if not exists evidence_started_at timestamptz,
  add column if not exists evidence_ended_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)),
  add column if not exists temporal_source text;

alter table if exists public.ns_perspectives
  add column if not exists evidence_started_at timestamptz,
  add column if not exists evidence_ended_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)),
  add column if not exists temporal_source text;

alter table if exists public.ns_narrative_pages
  add column if not exists evidence_started_at timestamptz,
  add column if not exists evidence_ended_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)),
  add column if not exists temporal_source text;

alter table if exists public.customer_avatars
  add column if not exists evidence_started_at timestamptz,
  add column if not exists evidence_ended_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)),
  add column if not exists temporal_source text;

alter table if exists public.company_cortex_signals
  add column if not exists evidence_started_at timestamptz,
  add column if not exists evidence_ended_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)),
  add column if not exists temporal_source text;

alter table if exists public.company_cortex_objects
  add column if not exists effective_from timestamptz,
  add column if not exists effective_until timestamptz,
  add column if not exists evidence_started_at timestamptz,
  add column if not exists evidence_ended_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)),
  add column if not exists temporal_source text;

create index if not exists idx_ns_memories_episode on public.ns_memories (episode_id);
create index if not exists idx_ns_memories_brain_occurred on public.ns_memories (brain_id, occurred_at desc nulls last);
create index if not exists idx_ns_memories_brain_temporal_status on public.ns_memories (brain_id, temporal_status);
create index if not exists idx_ns_memories_contact_occurred on public.ns_memories (contact_id, occurred_at desc nulls last) where contact_id is not null;

create index if not exists idx_ns_brain_evidence_chunks_episode on public.ns_brain_evidence_chunks (episode_id);
create index if not exists idx_ns_brain_evidence_chunks_brain_occurred on public.ns_brain_evidence_chunks (brain_id, occurred_at desc nulls last);
create index if not exists idx_ns_brain_evidence_chunks_brain_temporal_status on public.ns_brain_evidence_chunks (brain_id, temporal_status);

create index if not exists idx_ns_sk_sources_episode on public.ns_sk_sources (episode_id);
create index if not exists idx_ns_sk_sources_brain_occurred on public.ns_sk_sources (brain_id, occurred_at desc nulls last);
create index if not exists idx_ns_sk_sources_brain_temporal_status on public.ns_sk_sources (brain_id, temporal_status);

create index if not exists idx_ns_sk_entries_episode on public.ns_sk_entries (episode_id);
create index if not exists idx_ns_sk_entries_brain_occurred on public.ns_sk_entries (brain_id, occurred_at desc nulls last);
create index if not exists idx_ns_sk_entries_brain_temporal_status on public.ns_sk_entries (brain_id, temporal_status);

create index if not exists idx_ns_belief_patterns_brain_valid on public.ns_belief_patterns (brain_id, valid_from, valid_until);
create index if not exists idx_ns_perspectives_brain_valid on public.ns_perspectives (brain_id, valid_from, valid_until);
create index if not exists idx_customer_avatars_brain_valid on public.customer_avatars (brain_id, valid_from, valid_until);
create index if not exists idx_company_cortex_signals_effective
  on public.company_cortex_signals (brain_id, evidence_started_at desc nulls last, valid_from, valid_until);
create index if not exists idx_company_cortex_objects_effective
  on public.company_cortex_objects (brain_id, effective_from, effective_until);

update public.ns_memories
set asserted_at = coalesce(asserted_at, created_at),
    temporal_status = coalesce(nullif(temporal_status, ''), 'current')
where asserted_at is null or temporal_status is null or temporal_status = '';

update public.ns_brain_evidence_chunks
set asserted_at = coalesce(asserted_at, created_at),
    temporal_status = coalesce(nullif(temporal_status, ''), 'current')
where asserted_at is null or temporal_status is null or temporal_status = '';

update public.ns_sk_sources
set asserted_at = coalesce(asserted_at, created_at),
    temporal_status = coalesce(nullif(temporal_status, ''), 'current')
where asserted_at is null or temporal_status is null or temporal_status = '';

update public.ns_sk_entries
set asserted_at = coalesce(asserted_at, created_at),
    temporal_status = coalesce(nullif(temporal_status, ''), 'current')
where asserted_at is null or temporal_status is null or temporal_status = '';

update public.ns_memories
set occurred_at = coalesce(
      occurred_at,
      public.try_parse_timestamptz(metadata #>> '{interaction_window,from}')
    ),
    occurred_until = coalesce(
      occurred_until,
      public.try_parse_timestamptz(metadata #>> '{interaction_window,to}')
    ),
    temporal_source = coalesce(temporal_source, 'interaction_window')
where metadata ? 'interaction_window'
  and (occurred_at is null or occurred_until is null);

update public.ns_brain_evidence_chunks
set occurred_at = coalesce(
      occurred_at,
      public.try_parse_timestamptz(metadata #>> '{interaction_window,from}')
    ),
    occurred_until = coalesce(
      occurred_until,
      public.try_parse_timestamptz(metadata #>> '{interaction_window,to}')
    ),
    temporal_source = coalesce(temporal_source, 'interaction_window')
where metadata ? 'interaction_window'
  and (occurred_at is null or occurred_until is null);

update public.ns_memories
set occurred_at = coalesce(
      occurred_at,
      to_timestamp(nullif(split_part(source_id, ':', 4), '')::double precision)
    ),
    occurred_until = coalesce(
      occurred_until,
      to_timestamp(nullif(split_part(source_id, ':', 5), '')::double precision)
    ),
    temporal_source = coalesce(temporal_source, 'slack_period')
where source_id like 'slack:%'
  and split_part(source_id, ':', 4) ~ '^[0-9]+(\.[0-9]+)?$';

insert into public.brain_episodes (
  brain_id,
  source_type,
  source_id,
  source_title,
  occurred_at,
  occurred_until,
  ingested_at,
  asserted_at,
  temporal_confidence,
  temporal_source,
  metadata
)
select
  source.brain_id,
  source.source_type,
  source.source_id,
  max(source.source_title) filter (where source.source_title is not null),
  min(source.occurred_at),
  max(source.occurred_until),
  min(source.created_at),
  min(source.asserted_at),
  coalesce(max(source.temporal_confidence), 1),
  coalesce(max(source.temporal_source), 'legacy_backfill'),
  jsonb_build_object('backfill', 'brain_temporal_spine_v1')
from (
  select brain_id, source_type, source_id, source_title, occurred_at, occurred_until, created_at, asserted_at, temporal_confidence, temporal_source
  from public.ns_memories
  where source_id is not null and source_type is not null
  union all
  select brain_id, source_type, source_id, source_title, occurred_at, occurred_until, created_at, asserted_at, temporal_confidence, temporal_source
  from public.ns_brain_evidence_chunks
  where source_id is not null and source_type is not null
  union all
  select brain_id, source_type, id::text as source_id, title as source_title, occurred_at, occurred_until, created_at, asserted_at, temporal_confidence, temporal_source
  from public.ns_sk_sources
) source
group by source.brain_id, source.source_type, source.source_id
on conflict (brain_id, source_type, source_id) where source_id is not null do update
set source_title = coalesce(excluded.source_title, public.brain_episodes.source_title),
    occurred_at = coalesce(public.brain_episodes.occurred_at, excluded.occurred_at),
    occurred_until = coalesce(public.brain_episodes.occurred_until, excluded.occurred_until),
    asserted_at = coalesce(public.brain_episodes.asserted_at, excluded.asserted_at),
    updated_at = now();

update public.ns_memories m
set episode_id = e.id
from public.brain_episodes e
where m.episode_id is null
  and m.brain_id = e.brain_id
  and m.source_type = e.source_type
  and m.source_id = e.source_id;

update public.ns_brain_evidence_chunks c
set episode_id = e.id
from public.brain_episodes e
where c.episode_id is null
  and c.brain_id = e.brain_id
  and c.source_type = e.source_type
  and c.source_id = e.source_id;

update public.ns_sk_sources s
set episode_id = e.id
from public.brain_episodes e
where s.episode_id is null
  and s.brain_id = e.brain_id
  and s.source_type = e.source_type
  and s.id::text = e.source_id;

update public.ns_sk_entries entry
set episode_id = source.episode_id,
    occurred_at = coalesce(entry.occurred_at, source.occurred_at),
    occurred_until = coalesce(entry.occurred_until, source.occurred_until),
    asserted_at = coalesce(entry.asserted_at, source.asserted_at),
    valid_from = coalesce(entry.valid_from, source.valid_from),
    valid_until = coalesce(entry.valid_until, source.valid_until),
    temporal_status = coalesce(nullif(entry.temporal_status, ''), source.temporal_status, 'current'),
    temporal_confidence = coalesce(entry.temporal_confidence, source.temporal_confidence),
    temporal_source = coalesce(entry.temporal_source, source.temporal_source)
from public.ns_sk_sources source
where entry.source_id = source.id;

drop function if exists public.search_ns_memories(uuid, vector, numeric, integer, numeric);
create function public.search_ns_memories(
  p_brain_id uuid,
  p_query_embedding vector,
  p_match_threshold numeric default 0.5,
  p_match_count integer default 10,
  p_min_significance numeric default 0,
  p_as_of timestamptz default null,
  p_occurred_from timestamptz default null,
  p_occurred_to timestamptz default null,
  p_include_historical boolean default true
)
returns table(
  id uuid,
  brain_id uuid,
  content text,
  memory_type text,
  source_type text,
  source_id text,
  source_title text,
  speaker text,
  significance numeric,
  confidence numeric,
  tags text[],
  metadata jsonb,
  source_emotion text,
  emotional_valence numeric,
  emotional_intensity numeric,
  episode_id uuid,
  occurred_at timestamptz,
  occurred_until timestamptz,
  asserted_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  temporal_status text,
  temporal_confidence numeric,
  temporal_source text,
  similarity numeric
)
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select
    m.id,
    m.brain_id,
    m.content,
    m.memory_type,
    m.source_type,
    m.source_id,
    m.source_title,
    m.speaker,
    m.significance,
    m.confidence,
    m.tags,
    m.metadata,
    m.source_emotion,
    m.emotional_valence,
    m.emotional_intensity,
    m.episode_id,
    m.occurred_at,
    m.occurred_until,
    m.asserted_at,
    m.valid_from,
    m.valid_until,
    m.temporal_status,
    m.temporal_confidence,
    m.temporal_source,
    1 - (m.embedding <=> p_query_embedding) as similarity
  from public.ns_memories m
  where m.brain_id = p_brain_id
    and m.embedding is not null
    and (1 - (m.embedding <=> p_query_embedding)) >= p_match_threshold
    and m.significance >= p_min_significance
    and (p_include_historical or coalesce(m.temporal_status, 'current') = 'current')
    and (p_as_of is null or (coalesce(m.valid_from, m.occurred_at, m.asserted_at, m.created_at) <= p_as_of and (m.valid_until is null or m.valid_until > p_as_of)))
    and (p_occurred_from is null or coalesce(m.occurred_until, m.occurred_at) >= p_occurred_from)
    and (p_occurred_to is null or coalesce(m.occurred_at, m.occurred_until) <= p_occurred_to)
  order by m.embedding <=> p_query_embedding
  limit least(greatest(coalesce(p_match_count, 10), 1), 50);
$$;

drop function if exists public.search_ns_memories_lexical(uuid, text, integer);
create function public.search_ns_memories_lexical(
  p_brain_id uuid,
  p_query text,
  p_limit integer default 20,
  p_as_of timestamptz default null,
  p_occurred_from timestamptz default null,
  p_occurred_to timestamptz default null,
  p_include_historical boolean default true
)
returns table (
  id uuid,
  brain_id uuid,
  content text,
  memory_type text,
  source_type text,
  source_id text,
  source_title text,
  significance double precision,
  confidence double precision,
  tags text[],
  metadata jsonb,
  episode_id uuid,
  occurred_at timestamptz,
  occurred_until timestamptz,
  asserted_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  temporal_status text,
  temporal_confidence numeric,
  temporal_source text,
  lexical_rank bigint,
  lexical_score real
)
language sql
stable
set search_path = public, pg_temp
as $$
  with query as (
    select websearch_to_tsquery('english', coalesce(p_query, '')) as tsquery
  ),
  ranked as (
    select
      m.id,
      m.brain_id,
      m.content,
      m.memory_type,
      m.source_type,
      m.source_id,
      m.source_title,
      m.significance,
      m.confidence,
      m.tags,
      m.metadata,
      m.episode_id,
      m.occurred_at,
      m.occurred_until,
      m.asserted_at,
      m.valid_from,
      m.valid_until,
      m.temporal_status,
      m.temporal_confidence,
      m.temporal_source,
      ts_rank_cd(m.search_vector, query.tsquery)::real as lexical_score
    from public.ns_memories m
    cross join query
    where m.brain_id = p_brain_id
      and m.search_vector @@ query.tsquery
      and (p_include_historical or coalesce(m.temporal_status, 'current') = 'current')
      and (p_as_of is null or (coalesce(m.valid_from, m.occurred_at, m.asserted_at, m.created_at) <= p_as_of and (m.valid_until is null or m.valid_until > p_as_of)))
      and (p_occurred_from is null or coalesce(m.occurred_until, m.occurred_at) >= p_occurred_from)
      and (p_occurred_to is null or coalesce(m.occurred_at, m.occurred_until) <= p_occurred_to)
  )
  select
    ranked.id,
    ranked.brain_id,
    ranked.content,
    ranked.memory_type,
    ranked.source_type,
    ranked.source_id,
    ranked.source_title,
    ranked.significance,
    ranked.confidence,
    ranked.tags,
    ranked.metadata,
    ranked.episode_id,
    ranked.occurred_at,
    ranked.occurred_until,
    ranked.asserted_at,
    ranked.valid_from,
    ranked.valid_until,
    ranked.temporal_status,
    ranked.temporal_confidence,
    ranked.temporal_source,
    row_number() over (
      order by ranked.lexical_score desc, ranked.significance desc, ranked.confidence desc
    ) as lexical_rank,
    ranked.lexical_score
  from ranked
  order by ranked.lexical_score desc, ranked.significance desc, ranked.confidence desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

drop function if exists public.search_sk_entries(uuid, vector, numeric, integer, text, numeric);
create function public.search_sk_entries(
  p_brain_id uuid,
  p_query_embedding vector,
  p_match_threshold numeric default 0.5,
  p_match_count integer default 10,
  p_domain text default null,
  p_min_mastery numeric default 0,
  p_as_of timestamptz default null,
  p_occurred_from timestamptz default null,
  p_occurred_to timestamptz default null,
  p_include_historical boolean default true
)
returns table(
  id uuid,
  brain_id uuid,
  title text,
  content text,
  entry_type text,
  domain text,
  complexity text,
  confidence numeric,
  mastery numeric,
  recall_count integer,
  tags text[],
  source_id uuid,
  metadata jsonb,
  episode_id uuid,
  occurred_at timestamptz,
  occurred_until timestamptz,
  asserted_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  temporal_status text,
  temporal_confidence numeric,
  temporal_source text,
  similarity numeric
)
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select
    e.id,
    e.brain_id,
    e.title,
    e.content,
    e.entry_type,
    e.domain,
    e.complexity,
    e.confidence,
    e.mastery,
    e.recall_count,
    e.tags,
    e.source_id,
    e.metadata,
    e.episode_id,
    e.occurred_at,
    e.occurred_until,
    e.asserted_at,
    e.valid_from,
    e.valid_until,
    e.temporal_status,
    e.temporal_confidence,
    e.temporal_source,
    1 - (e.embedding <=> p_query_embedding) as similarity
  from public.ns_sk_entries e
  where e.brain_id = p_brain_id
    and e.embedding is not null
    and (1 - (e.embedding <=> p_query_embedding)) >= p_match_threshold
    and e.mastery >= p_min_mastery
    and (p_domain is null or e.domain = p_domain)
    and (p_include_historical or coalesce(e.temporal_status, 'current') = 'current')
    and (p_as_of is null or (coalesce(e.valid_from, e.occurred_at, e.asserted_at, e.created_at) <= p_as_of and (e.valid_until is null or e.valid_until > p_as_of)))
    and (p_occurred_from is null or coalesce(e.occurred_until, e.occurred_at) >= p_occurred_from)
    and (p_occurred_to is null or coalesce(e.occurred_at, e.occurred_until) <= p_occurred_to)
  order by e.embedding <=> p_query_embedding
  limit least(greatest(coalesce(p_match_count, 10), 1), 50);
$$;

drop function if exists public.search_brain_evidence_chunks(uuid, vector, numeric, integer);
create function public.search_brain_evidence_chunks(
  p_brain_id uuid,
  p_query_embedding vector,
  p_match_threshold numeric default 0.25,
  p_match_count integer default 10,
  p_as_of timestamptz default null,
  p_occurred_from timestamptz default null,
  p_occurred_to timestamptz default null,
  p_include_historical boolean default true
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
  episode_id uuid,
  occurred_at timestamptz,
  occurred_until timestamptz,
  asserted_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  temporal_status text,
  temporal_confidence numeric,
  temporal_source text,
  similarity numeric
)
language sql
stable
set search_path = public, extensions, pg_temp
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
    c.episode_id,
    c.occurred_at,
    c.occurred_until,
    c.asserted_at,
    c.valid_from,
    c.valid_until,
    c.temporal_status,
    c.temporal_confidence,
    c.temporal_source,
    1 - (c.embedding <=> p_query_embedding) as similarity
  from public.ns_brain_evidence_chunks c
  where c.brain_id = p_brain_id
    and c.embedding is not null
    and (1 - (c.embedding <=> p_query_embedding)) >= p_match_threshold
    and (p_include_historical or coalesce(c.temporal_status, 'current') = 'current')
    and (p_as_of is null or (coalesce(c.valid_from, c.occurred_at, c.asserted_at, c.created_at) <= p_as_of and (c.valid_until is null or c.valid_until > p_as_of)))
    and (p_occurred_from is null or coalesce(c.occurred_until, c.occurred_at) >= p_occurred_from)
    and (p_occurred_to is null or coalesce(c.occurred_at, c.occurred_until) <= p_occurred_to)
  order by c.embedding <=> p_query_embedding
  limit least(greatest(coalesce(p_match_count, 10), 1), 50);
$$;

drop function if exists public.search_narrative_pages(uuid, vector, numeric, integer);
create function public.search_narrative_pages(
  p_brain_id uuid,
  p_query_embedding vector,
  p_match_threshold numeric default 0.3,
  p_match_count integer default 5,
  p_as_of timestamptz default null,
  p_include_historical boolean default true
)
returns table(
  id uuid,
  slug text,
  title text,
  page_type text,
  summary text,
  content_md text,
  evidence_started_at timestamptz,
  evidence_ended_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  temporal_status text,
  temporal_confidence numeric,
  temporal_source text,
  similarity numeric
)
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select
    np.id,
    np.slug,
    np.title,
    np.page_type,
    np.summary,
    np.content_md,
    np.evidence_started_at,
    np.evidence_ended_at,
    np.valid_from,
    np.valid_until,
    np.temporal_status,
    np.temporal_confidence,
    np.temporal_source,
    1 - (np.embedding <=> p_query_embedding) as similarity
  from public.ns_narrative_pages np
  where np.brain_id = p_brain_id
    and np.status = 'active'
    and np.embedding is not null
    and (1 - (np.embedding <=> p_query_embedding)) >= p_match_threshold
    and (p_include_historical or coalesce(np.temporal_status, 'current') = 'current')
    and (p_as_of is null or (coalesce(np.valid_from, np.evidence_started_at, np.last_synthesis_at, np.created_at) <= p_as_of and (np.valid_until is null or np.valid_until > p_as_of)))
  order by np.embedding <=> p_query_embedding
  limit least(greatest(coalesce(p_match_count, 5), 1), 50);
$$;

drop function if exists public.search_ns_belief_patterns(uuid, vector, numeric, integer);
create function public.search_ns_belief_patterns(
  p_brain_id uuid,
  p_query_embedding vector,
  p_match_threshold numeric default 0.3,
  p_match_count integer default 10,
  p_as_of timestamptz default null,
  p_include_historical boolean default true
)
returns table(
  id uuid,
  brain_id uuid,
  pattern_name text,
  description text,
  status text,
  strength numeric,
  supporting_memories uuid[],
  evidence_started_at timestamptz,
  evidence_ended_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  temporal_status text,
  temporal_confidence numeric,
  temporal_source text,
  similarity numeric
)
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select
    bp.id,
    bp.brain_id,
    bp.pattern_name,
    bp.description,
    bp.status,
    bp.strength,
    bp.supporting_memories,
    bp.evidence_started_at,
    bp.evidence_ended_at,
    bp.valid_from,
    bp.valid_until,
    bp.temporal_status,
    bp.temporal_confidence,
    bp.temporal_source,
    1 - (bp.embedding <=> p_query_embedding) as similarity
  from public.ns_belief_patterns bp
  where bp.brain_id = p_brain_id
    and bp.embedding is not null
    and bp.status in ('emerging', 'active', 'challenged')
    and (1 - (bp.embedding <=> p_query_embedding)) >= p_match_threshold
    and (p_include_historical or coalesce(bp.temporal_status, 'current') = 'current')
    and (p_as_of is null or (coalesce(bp.valid_from, bp.evidence_started_at, bp.detected_at, bp.created_at) <= p_as_of and (bp.valid_until is null or bp.valid_until > p_as_of)))
  order by bp.embedding <=> p_query_embedding
  limit least(greatest(coalesce(p_match_count, 10), 1), 50);
$$;

drop function if exists public.search_ns_belief_patterns_lexical(uuid, text, integer);
create function public.search_ns_belief_patterns_lexical(
  p_brain_id uuid,
  p_query text,
  p_limit integer default 20,
  p_as_of timestamptz default null,
  p_include_historical boolean default true
)
returns table(
  id uuid,
  brain_id uuid,
  pattern_name text,
  description text,
  status text,
  strength numeric,
  supporting_memories uuid[],
  evidence_started_at timestamptz,
  evidence_ended_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  temporal_status text,
  temporal_confidence numeric,
  temporal_source text,
  lexical_rank bigint,
  lexical_score real
)
language sql
stable
set search_path = public, pg_temp
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
      bp.evidence_started_at,
      bp.evidence_ended_at,
      bp.valid_from,
      bp.valid_until,
      bp.temporal_status,
      bp.temporal_confidence,
      bp.temporal_source,
      ts_rank_cd(bp.search_vector, query.tsquery)::real as lexical_score
    from public.ns_belief_patterns bp
    cross join query
    where bp.brain_id = p_brain_id
      and bp.status in ('emerging', 'active', 'challenged')
      and bp.search_vector @@ query.tsquery
      and (p_include_historical or coalesce(bp.temporal_status, 'current') = 'current')
      and (p_as_of is null or (coalesce(bp.valid_from, bp.evidence_started_at, bp.detected_at, bp.created_at) <= p_as_of and (bp.valid_until is null or bp.valid_until > p_as_of)))
  )
  select
    ranked.id,
    ranked.brain_id,
    ranked.pattern_name,
    ranked.description,
    ranked.status,
    ranked.strength,
    ranked.supporting_memories,
    ranked.evidence_started_at,
    ranked.evidence_ended_at,
    ranked.valid_from,
    ranked.valid_until,
    ranked.temporal_status,
    ranked.temporal_confidence,
    ranked.temporal_source,
    row_number() over (order by ranked.lexical_score desc, ranked.strength desc nulls last) as lexical_rank,
    ranked.lexical_score
  from ranked
  order by ranked.lexical_score desc, ranked.strength desc nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

drop function if exists public.search_ns_perspectives(uuid, vector, numeric, integer);
create function public.search_ns_perspectives(
  p_brain_id uuid,
  p_query_embedding vector,
  p_match_threshold numeric default 0.3,
  p_match_count integer default 10,
  p_as_of timestamptz default null,
  p_include_historical boolean default true
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
  evidence_started_at timestamptz,
  evidence_ended_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  temporal_status text,
  temporal_confidence numeric,
  temporal_source text,
  similarity numeric
)
language sql
stable
set search_path = public, extensions, pg_temp
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
    p.evidence_started_at,
    p.evidence_ended_at,
    p.valid_from,
    p.valid_until,
    p.temporal_status,
    p.temporal_confidence,
    p.temporal_source,
    1 - (p.embedding <=> p_query_embedding) as similarity
  from public.ns_perspectives p
  where p.brain_id = p_brain_id
    and p.embedding is not null
    and p.status in ('emerging', 'active')
    and (1 - (p.embedding <=> p_query_embedding)) >= p_match_threshold
    and (p_include_historical or coalesce(p.temporal_status, 'current') = 'current')
    and (p_as_of is null or (coalesce(p.valid_from, p.evidence_started_at, p.created_at) <= p_as_of and (p.valid_until is null or p.valid_until > p_as_of)))
  order by p.embedding <=> p_query_embedding
  limit least(greatest(coalesce(p_match_count, 10), 1), 50);
$$;

drop function if exists public.search_ns_perspectives_lexical(uuid, text, integer);
create function public.search_ns_perspectives_lexical(
  p_brain_id uuid,
  p_query text,
  p_limit integer default 20,
  p_as_of timestamptz default null,
  p_include_historical boolean default true
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
  evidence_started_at timestamptz,
  evidence_ended_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  temporal_status text,
  temporal_confidence numeric,
  temporal_source text,
  lexical_rank bigint,
  lexical_score real
)
language sql
stable
set search_path = public, pg_temp
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
      p.evidence_started_at,
      p.evidence_ended_at,
      p.valid_from,
      p.valid_until,
      p.temporal_status,
      p.temporal_confidence,
      p.temporal_source,
      ts_rank_cd(p.search_vector, query.tsquery)::real as lexical_score
    from public.ns_perspectives p
    cross join query
    where p.brain_id = p_brain_id
      and p.status in ('emerging', 'active')
      and p.search_vector @@ query.tsquery
      and (p_include_historical or coalesce(p.temporal_status, 'current') = 'current')
      and (p_as_of is null or (coalesce(p.valid_from, p.evidence_started_at, p.created_at) <= p_as_of and (p.valid_until is null or p.valid_until > p_as_of)))
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
    ranked.evidence_started_at,
    ranked.evidence_ended_at,
    ranked.valid_from,
    ranked.valid_until,
    ranked.temporal_status,
    ranked.temporal_confidence,
    ranked.temporal_source,
    row_number() over (order by ranked.lexical_score desc, ranked.strength desc nulls last) as lexical_rank,
    ranked.lexical_score
  from ranked
  order by ranked.lexical_score desc, ranked.strength desc nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

drop function if exists public.search_customer_avatars(uuid, vector, numeric, integer);
create function public.search_customer_avatars(
  p_brain_id uuid,
  p_query_embedding vector,
  p_match_threshold numeric default 0.3,
  p_match_count integer default 10,
  p_as_of timestamptz default null,
  p_include_historical boolean default true
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
  evidence_started_at timestamptz,
  evidence_ended_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  temporal_status text,
  temporal_confidence numeric,
  temporal_source text,
  similarity numeric
)
language sql
stable
set search_path = public, extensions, pg_temp
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
    ca.evidence_started_at,
    ca.evidence_ended_at,
    ca.valid_from,
    ca.valid_until,
    ca.temporal_status,
    ca.temporal_confidence,
    ca.temporal_source,
    1 - (ca.embedding <=> p_query_embedding) as similarity
  from public.customer_avatars ca
  where ca.brain_id = p_brain_id
    and ca.embedding is not null
    and ca.status = 'active'
    and (1 - (ca.embedding <=> p_query_embedding)) >= p_match_threshold
    and (p_include_historical or coalesce(ca.temporal_status, 'current') = 'current')
    and (p_as_of is null or (coalesce(ca.valid_from, ca.evidence_started_at, ca.created_at) <= p_as_of and (ca.valid_until is null or ca.valid_until > p_as_of)))
  order by ca.embedding <=> p_query_embedding
  limit least(greatest(coalesce(p_match_count, 10), 1), 50);
$$;

drop function if exists public.search_customer_avatars_lexical(uuid, text, integer);
create function public.search_customer_avatars_lexical(
  p_brain_id uuid,
  p_query text,
  p_limit integer default 20,
  p_as_of timestamptz default null,
  p_include_historical boolean default true
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
  evidence_started_at timestamptz,
  evidence_ended_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  temporal_status text,
  temporal_confidence numeric,
  temporal_source text,
  lexical_rank bigint,
  lexical_score real
)
language sql
stable
set search_path = public, pg_temp
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
      ca.evidence_started_at,
      ca.evidence_ended_at,
      ca.valid_from,
      ca.valid_until,
      ca.temporal_status,
      ca.temporal_confidence,
      ca.temporal_source,
      ts_rank_cd(ca.search_vector, query.tsquery)::real as lexical_score
    from public.customer_avatars ca
    cross join query
    where ca.brain_id = p_brain_id
      and ca.status = 'active'
      and ca.search_vector @@ query.tsquery
      and (p_include_historical or coalesce(ca.temporal_status, 'current') = 'current')
      and (p_as_of is null or (coalesce(ca.valid_from, ca.evidence_started_at, ca.created_at) <= p_as_of and (ca.valid_until is null or ca.valid_until > p_as_of)))
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
    ranked.evidence_started_at,
    ranked.evidence_ended_at,
    ranked.valid_from,
    ranked.valid_until,
    ranked.temporal_status,
    ranked.temporal_confidence,
    ranked.temporal_source,
    row_number() over (order by ranked.lexical_score desc, ranked.strength desc nulls last, ranked.confidence desc nulls last) as lexical_rank,
    ranked.lexical_score
  from ranked
  order by ranked.lexical_score desc, ranked.strength desc nulls last, ranked.confidence desc nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

drop function if exists public.search_company_cortex_objects(uuid, uuid, vector, integer, double precision);
create function public.search_company_cortex_objects(
  p_brain_id uuid,
  p_org_id uuid,
  p_query_embedding vector(768),
  p_match_count integer default 10,
  p_match_threshold double precision default 0.35,
  p_as_of timestamptz default null,
  p_include_historical boolean default true
)
returns table (
  id uuid,
  brain_id uuid,
  org_id uuid,
  object_type text,
  title text,
  truth text,
  status text,
  confidence numeric,
  evidence_refs jsonb,
  retrieval_rule jsonb,
  metadata jsonb,
  effective_from timestamptz,
  effective_until timestamptz,
  evidence_started_at timestamptz,
  evidence_ended_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  temporal_status text,
  temporal_confidence numeric,
  temporal_source text,
  updated_at timestamptz,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions, pg_temp
as $$
  select
    o.id,
    o.brain_id,
    o.org_id,
    o.object_type,
    o.title,
    o.truth,
    o.status,
    o.confidence,
    o.evidence_refs,
    o.retrieval_rule,
    o.metadata,
    o.effective_from,
    o.effective_until,
    o.evidence_started_at,
    o.evidence_ended_at,
    o.valid_from,
    o.valid_until,
    o.temporal_status,
    o.temporal_confidence,
    o.temporal_source,
    o.updated_at,
    1 - (o.embedding <=> p_query_embedding) as similarity
  from public.company_cortex_objects o
  where o.brain_id = p_brain_id
    and o.org_id = p_org_id
    and o.status <> 'retired'
    and o.embedding is not null
    and 1 - (o.embedding <=> p_query_embedding) >= p_match_threshold
    and (p_include_historical or coalesce(o.temporal_status, 'current') = 'current')
    and (p_as_of is null or (coalesce(o.effective_from, o.valid_from, o.evidence_started_at, o.created_at) <= p_as_of and (coalesce(o.effective_until, o.valid_until) is null or coalesce(o.effective_until, o.valid_until) > p_as_of)))
  order by o.embedding <=> p_query_embedding
  limit least(greatest(p_match_count, 1), 50);
$$;

drop function if exists public.search_company_cortex_signals(uuid, uuid, vector, numeric, integer);
create function public.search_company_cortex_signals(
  p_brain_id uuid,
  p_org_id uuid,
  p_query_embedding vector,
  p_match_threshold numeric default 0.3,
  p_match_count integer default 10,
  p_as_of timestamptz default null,
  p_include_historical boolean default true
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
  evidence_started_at timestamptz,
  evidence_ended_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  temporal_status text,
  temporal_confidence numeric,
  temporal_source text,
  similarity numeric
)
language sql
stable
set search_path = public, extensions, pg_temp
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
    cs.evidence_started_at,
    cs.evidence_ended_at,
    cs.valid_from,
    cs.valid_until,
    cs.temporal_status,
    cs.temporal_confidence,
    cs.temporal_source,
    1 - (cs.embedding <=> p_query_embedding) as similarity
  from public.company_cortex_signals cs
  where cs.brain_id = p_brain_id
    and cs.org_id = p_org_id
    and cs.embedding is not null
    and cs.status in ('active', 'proposed')
    and (1 - (cs.embedding <=> p_query_embedding)) >= p_match_threshold
    and (p_include_historical or coalesce(cs.temporal_status, 'current') = 'current')
    and (p_as_of is null or (coalesce(cs.valid_from, cs.evidence_started_at, cs.created_at) <= p_as_of and (cs.valid_until is null or cs.valid_until > p_as_of)))
  order by cs.embedding <=> p_query_embedding
  limit least(greatest(coalesce(p_match_count, 10), 1), 50);
$$;

drop function if exists public.search_company_cortex_signals_lexical(uuid, uuid, text, integer);
create function public.search_company_cortex_signals_lexical(
  p_brain_id uuid,
  p_org_id uuid,
  p_query text,
  p_limit integer default 20,
  p_as_of timestamptz default null,
  p_include_historical boolean default true
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
  evidence_started_at timestamptz,
  evidence_ended_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  temporal_status text,
  temporal_confidence numeric,
  temporal_source text,
  lexical_rank bigint,
  lexical_score real
)
language sql
stable
set search_path = public, pg_temp
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
      cs.evidence_started_at,
      cs.evidence_ended_at,
      cs.valid_from,
      cs.valid_until,
      cs.temporal_status,
      cs.temporal_confidence,
      cs.temporal_source,
      ts_rank_cd(cs.search_vector, query.tsquery)::real as lexical_score
    from public.company_cortex_signals cs
    cross join query
    where cs.brain_id = p_brain_id
      and cs.org_id = p_org_id
      and cs.status in ('active', 'proposed')
      and cs.search_vector @@ query.tsquery
      and (p_include_historical or coalesce(cs.temporal_status, 'current') = 'current')
      and (p_as_of is null or (coalesce(cs.valid_from, cs.evidence_started_at, cs.created_at) <= p_as_of and (cs.valid_until is null or cs.valid_until > p_as_of)))
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
    ranked.evidence_started_at,
    ranked.evidence_ended_at,
    ranked.valid_from,
    ranked.valid_until,
    ranked.temporal_status,
    ranked.temporal_confidence,
    ranked.temporal_source,
    row_number() over (order by ranked.lexical_score desc, ranked.confidence desc) as lexical_rank,
    ranked.lexical_score
  from ranked
  order by ranked.lexical_score desc, ranked.confidence desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
