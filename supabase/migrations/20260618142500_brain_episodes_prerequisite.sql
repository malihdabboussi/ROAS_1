-- Brain Episodes prerequisite for Cortex timelines.
--
-- This is intentionally narrow and idempotent so timeline tables can be applied
-- before the full temporal spine migration in environments where that spine has
-- not landed yet.

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
    where schemaname = 'public'
      and tablename = 'brain_episodes'
      and policyname = 'brain_episodes_select'
  ) then
    create policy brain_episodes_select on public.brain_episodes
      for select using (public.can_access_brain(brain_id, 'view'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'brain_episodes'
      and policyname = 'brain_episodes_insert'
  ) then
    create policy brain_episodes_insert on public.brain_episodes
      for insert with check (public.can_access_brain(brain_id, 'train'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'brain_episodes'
      and policyname = 'brain_episodes_update'
  ) then
    create policy brain_episodes_update on public.brain_episodes
      for update using (public.can_access_brain(brain_id, 'train'))
      with check (public.can_access_brain(brain_id, 'train'));
  end if;
end $$;
