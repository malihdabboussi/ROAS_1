-- Runtime repair for Temporal Brain Spine and Cortex timelines.
--
-- Production received the timeline tables before the temporal spine columns.
-- Staging had neither the temporal spine nor timeline RPCs. This forward
-- migration is intentionally idempotent and only adds missing runtime surfaces.

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
  temporal_confidence numeric not null default 1 check (
    temporal_confidence >= 0 and temporal_confidence <= 1
  ),
  temporal_source text not null default 'source_payload',
  participants jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brain_episodes_window_check check (
    occurred_until is null or occurred_at is null or occurred_until >= occurred_at
  )
);

create table if not exists public.brain_timelines (
  id uuid primary key default gen_random_uuid(),
  brain_id uuid not null references public.ns_brains(id) on delete cascade,
  timeline_type text not null,
  target_type text not null,
  target_id text,
  title text not null,
  summary text,
  status text not null default 'active',
  evidence_started_at timestamptz,
  evidence_ended_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  temporal_status text not null default 'current',
  temporal_confidence numeric check (
    temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)
  ),
  temporal_source text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_agent_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brain_timeline_items (
  id uuid primary key default gen_random_uuid(),
  timeline_id uuid not null references public.brain_timelines(id) on delete cascade,
  brain_id uuid not null references public.ns_brains(id) on delete cascade,
  episode_id uuid,
  item_type text not null,
  title text not null,
  description text,
  occurred_at timestamptz,
  occurred_until timestamptz,
  asserted_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  temporal_status text not null default 'current',
  temporal_confidence numeric check (
    temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)
  ),
  temporal_source text,
  importance numeric not null default 0.5 check (importance >= 0 and importance <= 1),
  confidence numeric not null default 0.5 check (confidence >= 0 and confidence <= 1),
  source_type text,
  source_id text,
  source_title text,
  related_node_type text,
  related_node_id text,
  evidence_refs jsonb not null default '[]'::jsonb,
  dedupe_key text,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(768),
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(source_title, '')), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.brain_timeline_items
  add column if not exists embedding vector(768),
  add column if not exists search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(source_title, '')), 'C')
  ) stored;

alter table if exists public.ns_memories
  add column if not exists episode_id uuid references public.brain_episodes(id) on delete set null,
  add column if not exists occurred_at timestamptz,
  add column if not exists occurred_until timestamptz,
  add column if not exists asserted_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (
    temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)
  ),
  add column if not exists temporal_source text;

alter table if exists public.ns_brain_evidence_chunks
  add column if not exists episode_id uuid references public.brain_episodes(id) on delete set null,
  add column if not exists occurred_at timestamptz,
  add column if not exists occurred_until timestamptz,
  add column if not exists asserted_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (
    temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)
  ),
  add column if not exists temporal_source text;

alter table if exists public.ns_sk_sources
  add column if not exists episode_id uuid references public.brain_episodes(id) on delete set null,
  add column if not exists occurred_at timestamptz,
  add column if not exists occurred_until timestamptz,
  add column if not exists asserted_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (
    temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)
  ),
  add column if not exists temporal_source text;

alter table if exists public.ns_sk_entries
  add column if not exists episode_id uuid references public.brain_episodes(id) on delete set null,
  add column if not exists occurred_at timestamptz,
  add column if not exists occurred_until timestamptz,
  add column if not exists asserted_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (
    temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)
  ),
  add column if not exists temporal_source text;

alter table if exists public.ns_snapshots
  add column if not exists evidence_started_at timestamptz,
  add column if not exists evidence_ended_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (
    temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)
  ),
  add column if not exists temporal_source text;

alter table if exists public.ns_belief_patterns
  add column if not exists evidence_started_at timestamptz,
  add column if not exists evidence_ended_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (
    temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)
  ),
  add column if not exists temporal_source text;

alter table if exists public.ns_perspectives
  add column if not exists evidence_started_at timestamptz,
  add column if not exists evidence_ended_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (
    temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)
  ),
  add column if not exists temporal_source text;

alter table if exists public.ns_narrative_pages
  add column if not exists evidence_started_at timestamptz,
  add column if not exists evidence_ended_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (
    temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)
  ),
  add column if not exists temporal_source text;

alter table if exists public.customer_avatars
  add column if not exists evidence_started_at timestamptz,
  add column if not exists evidence_ended_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (
    temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)
  ),
  add column if not exists temporal_source text;

alter table if exists public.company_cortex_signals
  add column if not exists evidence_started_at timestamptz,
  add column if not exists evidence_ended_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (
    temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)
  ),
  add column if not exists temporal_source text;

alter table if exists public.company_cortex_objects
  add column if not exists effective_from timestamptz,
  add column if not exists effective_until timestamptz,
  add column if not exists evidence_started_at timestamptz,
  add column if not exists evidence_ended_at timestamptz,
  add column if not exists valid_from timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists temporal_status text not null default 'current',
  add column if not exists temporal_confidence numeric check (
    temporal_confidence is null or (temporal_confidence >= 0 and temporal_confidence <= 1)
  ),
  add column if not exists temporal_source text;

create unique index if not exists idx_brain_episodes_source
  on public.brain_episodes (brain_id, source_type, source_id)
  where source_id is not null;
create index if not exists idx_brain_episodes_brain_occurred
  on public.brain_episodes (brain_id, occurred_at desc nulls last);
create index if not exists idx_brain_episodes_brain_ingested
  on public.brain_episodes (brain_id, ingested_at desc);
create index if not exists idx_ns_memories_episode on public.ns_memories (episode_id);
create index if not exists idx_ns_memories_brain_occurred
  on public.ns_memories (brain_id, occurred_at desc nulls last);
create index if not exists idx_ns_brain_evidence_chunks_episode
  on public.ns_brain_evidence_chunks (episode_id);
create index if not exists idx_ns_sk_sources_episode on public.ns_sk_sources (episode_id);
create index if not exists idx_ns_sk_entries_episode on public.ns_sk_entries (episode_id);
create index if not exists idx_ns_belief_patterns_brain_valid
  on public.ns_belief_patterns (brain_id, valid_from, valid_until);
create index if not exists idx_ns_perspectives_brain_valid
  on public.ns_perspectives (brain_id, valid_from, valid_until);
create index if not exists idx_customer_avatars_brain_valid
  on public.customer_avatars (brain_id, valid_from, valid_until);
create index if not exists idx_company_cortex_signals_effective
  on public.company_cortex_signals (brain_id, evidence_started_at desc nulls last, valid_from, valid_until);
create index if not exists idx_company_cortex_objects_effective
  on public.company_cortex_objects (brain_id, effective_from, effective_until);
create unique index if not exists idx_brain_timeline_items_dedupe
  on public.brain_timeline_items (timeline_id, dedupe_key)
  where dedupe_key is not null;
create index if not exists idx_brain_timelines_brain on public.brain_timelines (brain_id);
create index if not exists idx_brain_timelines_brain_type
  on public.brain_timelines (brain_id, timeline_type);
create index if not exists idx_brain_timelines_target
  on public.brain_timelines (brain_id, target_type, target_id);
create index if not exists idx_brain_timeline_items_timeline_occurred
  on public.brain_timeline_items (timeline_id, occurred_at asc nulls last);
create index if not exists idx_brain_timeline_items_brain_occurred
  on public.brain_timeline_items (brain_id, occurred_at asc nulls last);
create index if not exists idx_brain_timeline_items_episode
  on public.brain_timeline_items (episode_id);
create index if not exists idx_brain_timeline_items_related_node
  on public.brain_timeline_items (brain_id, related_node_type, related_node_id);
create index if not exists idx_brain_timeline_items_search_vector
  on public.brain_timeline_items using gin (search_vector);

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

alter table public.brain_episodes enable row level security;
alter table public.brain_timelines enable row level security;
alter table public.brain_timeline_items enable row level security;

do $$
begin
  if to_regclass('public.brain_episodes') is not null
    and not exists (
      select 1
      from pg_constraint
      where conname = 'brain_timeline_items_episode_id_fkey'
        and conrelid = 'public.brain_timeline_items'::regclass
    )
  then
    alter table public.brain_timeline_items
      add constraint brain_timeline_items_episode_id_fkey
      foreign key (episode_id) references public.brain_episodes(id) on delete set null;
  end if;

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
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'brain_timelines' and policyname = 'brain_timelines_select'
  ) then
    create policy brain_timelines_select on public.brain_timelines
      for select using (public.can_access_brain(brain_id, 'view'));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'brain_timelines' and policyname = 'brain_timelines_insert'
  ) then
    create policy brain_timelines_insert on public.brain_timelines
      for insert with check (public.can_access_brain(brain_id, 'train'));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'brain_timelines' and policyname = 'brain_timelines_update'
  ) then
    create policy brain_timelines_update on public.brain_timelines
      for update using (public.can_access_brain(brain_id, 'train'))
      with check (public.can_access_brain(brain_id, 'train'));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'brain_timeline_items' and policyname = 'brain_timeline_items_select'
  ) then
    create policy brain_timeline_items_select on public.brain_timeline_items
      for select using (public.can_access_brain(brain_id, 'view'));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'brain_timeline_items' and policyname = 'brain_timeline_items_insert'
  ) then
    create policy brain_timeline_items_insert on public.brain_timeline_items
      for insert with check (public.can_access_brain(brain_id, 'train'));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'brain_timeline_items' and policyname = 'brain_timeline_items_update'
  ) then
    create policy brain_timeline_items_update on public.brain_timeline_items
      for update using (public.can_access_brain(brain_id, 'train'))
      with check (public.can_access_brain(brain_id, 'train'));
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'brain_timeline_items' and policyname = 'brain_timeline_items_delete'
  ) then
    create policy brain_timeline_items_delete on public.brain_timeline_items
      for delete using (public.can_access_brain(brain_id, 'train'));
  end if;
end $$;

drop function if exists public.search_brain_timeline_items(
  uuid,
  vector,
  numeric,
  integer,
  timestamptz,
  timestamptz,
  timestamptz,
  boolean
);

create function public.search_brain_timeline_items(
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
  timeline_id uuid,
  episode_id uuid,
  item_type text,
  title text,
  description text,
  occurred_at timestamptz,
  occurred_until timestamptz,
  asserted_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  temporal_status text,
  temporal_confidence numeric,
  temporal_source text,
  importance numeric,
  confidence numeric,
  source_type text,
  source_id text,
  source_title text,
  related_node_type text,
  related_node_id text,
  evidence_refs jsonb,
  metadata jsonb,
  timeline_type text,
  timeline_title text,
  similarity numeric
)
language sql
stable
set search_path = public, extensions, pg_temp
as $$
  select
    item.id,
    item.brain_id,
    item.timeline_id,
    item.episode_id,
    item.item_type,
    item.title,
    item.description,
    item.occurred_at,
    item.occurred_until,
    item.asserted_at,
    item.valid_from,
    item.valid_until,
    item.temporal_status,
    item.temporal_confidence,
    item.temporal_source,
    item.importance,
    item.confidence,
    item.source_type,
    item.source_id,
    item.source_title,
    item.related_node_type,
    item.related_node_id,
    item.evidence_refs,
    item.metadata,
    timeline.timeline_type,
    timeline.title,
    1 - (item.embedding <=> p_query_embedding)
  from public.brain_timeline_items item
  join public.brain_timelines timeline on timeline.id = item.timeline_id
  where item.brain_id = p_brain_id
    and timeline.status = 'active'
    and item.embedding is not null
    and (1 - (item.embedding <=> p_query_embedding)) >= p_match_threshold
    and (p_include_historical or coalesce(item.temporal_status, 'current') = 'current')
    and (
      p_as_of is null
      or (
        coalesce(item.valid_from, item.occurred_at, item.asserted_at, item.created_at) <= p_as_of
        and (item.valid_until is null or item.valid_until > p_as_of)
      )
    )
    and (p_occurred_from is null or coalesce(item.occurred_until, item.occurred_at) >= p_occurred_from)
    and (p_occurred_to is null or coalesce(item.occurred_at, item.occurred_until) <= p_occurred_to)
  order by item.embedding <=> p_query_embedding
  limit least(greatest(coalesce(p_match_count, 10), 1), 50);
$$;

drop function if exists public.search_brain_timeline_items_lexical(
  uuid,
  text,
  integer,
  timestamptz,
  timestamptz,
  timestamptz,
  boolean
);

create function public.search_brain_timeline_items_lexical(
  p_brain_id uuid,
  p_query text,
  p_limit integer default 20,
  p_as_of timestamptz default null,
  p_occurred_from timestamptz default null,
  p_occurred_to timestamptz default null,
  p_include_historical boolean default true
)
returns table(
  id uuid,
  brain_id uuid,
  timeline_id uuid,
  episode_id uuid,
  item_type text,
  title text,
  description text,
  occurred_at timestamptz,
  occurred_until timestamptz,
  asserted_at timestamptz,
  valid_from timestamptz,
  valid_until timestamptz,
  temporal_status text,
  temporal_confidence numeric,
  temporal_source text,
  importance numeric,
  confidence numeric,
  source_type text,
  source_id text,
  source_title text,
  related_node_type text,
  related_node_id text,
  evidence_refs jsonb,
  metadata jsonb,
  timeline_type text,
  timeline_title text,
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
      item.id,
      item.brain_id,
      item.timeline_id,
      item.episode_id,
      item.item_type,
      item.title,
      item.description,
      item.occurred_at,
      item.occurred_until,
      item.asserted_at,
      item.valid_from,
      item.valid_until,
      item.temporal_status,
      item.temporal_confidence,
      item.temporal_source,
      item.importance,
      item.confidence,
      item.source_type,
      item.source_id,
      item.source_title,
      item.related_node_type,
      item.related_node_id,
      item.evidence_refs,
      item.metadata,
      timeline.timeline_type,
      timeline.title as timeline_title,
      ts_rank_cd(item.search_vector, query.tsquery)::real as lexical_score
    from public.brain_timeline_items item
    join public.brain_timelines timeline on timeline.id = item.timeline_id
    cross join query
    where item.brain_id = p_brain_id
      and timeline.status = 'active'
      and item.search_vector @@ query.tsquery
      and (p_include_historical or coalesce(item.temporal_status, 'current') = 'current')
      and (
        p_as_of is null
        or (
          coalesce(item.valid_from, item.occurred_at, item.asserted_at, item.created_at) <= p_as_of
          and (item.valid_until is null or item.valid_until > p_as_of)
        )
      )
      and (p_occurred_from is null or coalesce(item.occurred_until, item.occurred_at) >= p_occurred_from)
      and (p_occurred_to is null or coalesce(item.occurred_at, item.occurred_until) <= p_occurred_to)
  )
  select
    ranked.id,
    ranked.brain_id,
    ranked.timeline_id,
    ranked.episode_id,
    ranked.item_type,
    ranked.title,
    ranked.description,
    ranked.occurred_at,
    ranked.occurred_until,
    ranked.asserted_at,
    ranked.valid_from,
    ranked.valid_until,
    ranked.temporal_status,
    ranked.temporal_confidence,
    ranked.temporal_source,
    ranked.importance,
    ranked.confidence,
    ranked.source_type,
    ranked.source_id,
    ranked.source_title,
    ranked.related_node_type,
    ranked.related_node_id,
    ranked.evidence_refs,
    ranked.metadata,
    ranked.timeline_type,
    ranked.timeline_title,
    row_number() over (order by ranked.lexical_score desc, ranked.occurred_at asc nulls last)::bigint,
    ranked.lexical_score
  from ranked
  order by ranked.lexical_score desc, ranked.occurred_at asc nulls last
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;
