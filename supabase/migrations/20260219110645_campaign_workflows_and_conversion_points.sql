-- Campaign Workflows + Funnel Conversion Points
--
-- Adds:
-- - campaign_workflows (campaign-scoped workflow container)
-- - campaign_workflow_edges (connections between artifacts)
-- - campaign_workflow_layouts (UI layout persistence)
-- - funnel_conversion_points (explicit "this page converts" declarations)
--
-- NOTE: This is intentionally explicit and does not attempt to infer conversion points from HTML.

-- ============================================================================
-- campaign_workflows
-- ============================================================================

create table if not exists public.campaign_workflows (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  name text not null default 'Main',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaign_workflows_campaign_id
  on public.campaign_workflows (campaign_id);

create index if not exists idx_campaign_workflows_user_id
  on public.campaign_workflows (user_id);

alter table public.campaign_workflows enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_workflows' and policyname = 'campaign_workflows_select_own'
  ) then
    create policy campaign_workflows_select_own
      on public.campaign_workflows
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_workflows' and policyname = 'campaign_workflows_insert_own'
  ) then
    create policy campaign_workflows_insert_own
      on public.campaign_workflows
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_workflows' and policyname = 'campaign_workflows_update_own'
  ) then
    create policy campaign_workflows_update_own
      on public.campaign_workflows
      for update
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_workflows' and policyname = 'campaign_workflows_delete_own'
  ) then
    create policy campaign_workflows_delete_own
      on public.campaign_workflows
      for delete
      using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================================
-- campaign_workflow_edges
-- ============================================================================

create table if not exists public.campaign_workflow_edges (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  workflow_id uuid not null references public.campaign_workflows(id) on delete cascade,

  from_type text not null check (from_type in ('funnel', 'sequence', 'lead_magnet')),
  from_id uuid not null,
  to_type text not null check (to_type in ('funnel', 'sequence', 'lead_magnet')),
  to_id uuid not null,

  edge_type text not null check (
    edge_type in (
      'funnel_conversion_to_sequence',
      'sequence_complete_to_sequence',
      'funnel_to_lead_magnet'
    )
  ),

  config jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'valid', 'invalid', 'active', 'paused')),
  validation_errors jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uniq_campaign_workflow_edges_identity
  on public.campaign_workflow_edges (workflow_id, edge_type, from_type, from_id, to_type, to_id);

create index if not exists idx_campaign_workflow_edges_campaign_id
  on public.campaign_workflow_edges (campaign_id);

create index if not exists idx_campaign_workflow_edges_workflow_id
  on public.campaign_workflow_edges (workflow_id);

create index if not exists idx_campaign_workflow_edges_from
  on public.campaign_workflow_edges (from_type, from_id);

create index if not exists idx_campaign_workflow_edges_to
  on public.campaign_workflow_edges (to_type, to_id);

alter table public.campaign_workflow_edges enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_workflow_edges' and policyname = 'campaign_workflow_edges_select_own'
  ) then
    create policy campaign_workflow_edges_select_own
      on public.campaign_workflow_edges
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_workflow_edges' and policyname = 'campaign_workflow_edges_insert_own'
  ) then
    create policy campaign_workflow_edges_insert_own
      on public.campaign_workflow_edges
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_workflow_edges' and policyname = 'campaign_workflow_edges_update_own'
  ) then
    create policy campaign_workflow_edges_update_own
      on public.campaign_workflow_edges
      for update
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_workflow_edges' and policyname = 'campaign_workflow_edges_delete_own'
  ) then
    create policy campaign_workflow_edges_delete_own
      on public.campaign_workflow_edges
      for delete
      using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================================
-- campaign_workflow_layouts
-- ============================================================================

create table if not exists public.campaign_workflow_layouts (
  workflow_id uuid primary key references public.campaign_workflows(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  layout jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaign_workflow_layouts_campaign_id
  on public.campaign_workflow_layouts (campaign_id);

alter table public.campaign_workflow_layouts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_workflow_layouts' and policyname = 'campaign_workflow_layouts_select_own'
  ) then
    create policy campaign_workflow_layouts_select_own
      on public.campaign_workflow_layouts
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_workflow_layouts' and policyname = 'campaign_workflow_layouts_insert_own'
  ) then
    create policy campaign_workflow_layouts_insert_own
      on public.campaign_workflow_layouts
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_workflow_layouts' and policyname = 'campaign_workflow_layouts_update_own'
  ) then
    create policy campaign_workflow_layouts_update_own
      on public.campaign_workflow_layouts
      for update
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'campaign_workflow_layouts' and policyname = 'campaign_workflow_layouts_delete_own'
  ) then
    create policy campaign_workflow_layouts_delete_own
      on public.campaign_workflow_layouts
      for delete
      using (auth.uid() = user_id);
  end if;
end $$;

-- ============================================================================
-- funnel_conversion_points
-- ============================================================================

create table if not exists public.funnel_conversion_points (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  funnel_id uuid not null references public.funnels(id) on delete cascade,
  funnel_page_id uuid not null references public.funnel_pages(id) on delete cascade,
  kind text not null check (kind in ('email_capture')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uniq_funnel_conversion_points_page_kind
  on public.funnel_conversion_points (funnel_page_id, kind);

create index if not exists idx_funnel_conversion_points_funnel_id
  on public.funnel_conversion_points (funnel_id);

alter table public.funnel_conversion_points enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'funnel_conversion_points' and policyname = 'funnel_conversion_points_select_own'
  ) then
    create policy funnel_conversion_points_select_own
      on public.funnel_conversion_points
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'funnel_conversion_points' and policyname = 'funnel_conversion_points_insert_own'
  ) then
    create policy funnel_conversion_points_insert_own
      on public.funnel_conversion_points
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'funnel_conversion_points' and policyname = 'funnel_conversion_points_update_own'
  ) then
    create policy funnel_conversion_points_update_own
      on public.funnel_conversion_points
      for update
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'funnel_conversion_points' and policyname = 'funnel_conversion_points_delete_own'
  ) then
    create policy funnel_conversion_points_delete_own
      on public.funnel_conversion_points
      for delete
      using (auth.uid() = user_id);
  end if;
end $$;
;
