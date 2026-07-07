create table if not exists public.user_workspaces (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  menu_config jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.workspace_pages (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.user_workspaces(id) on delete cascade,
  title text not null,
  slug text not null,
  icon text not null default 'layout-dashboard',
  sort_order integer not null default 0,
  layout jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workspace_id, slug)
);

create table if not exists public.user_widgets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  tsx_source text not null,
  data_dependencies jsonb not null default '[]'::jsonb,
  config jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  tokens_spent integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_skill_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_key text not null,
  skill_key text not null,
  file_path text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, agent_key, skill_key, file_path)
);

create index if not exists idx_workspace_pages_workspace_sort
  on public.workspace_pages (workspace_id, sort_order);

create index if not exists idx_user_widgets_user_updated
  on public.user_widgets (user_id, updated_at desc);

create index if not exists idx_agent_skill_resources_lookup
  on public.agent_skill_resources (user_id, agent_key, skill_key);

alter table public.user_workspaces enable row level security;
alter table public.workspace_pages enable row level security;
alter table public.user_widgets enable row level security;
alter table public.agent_skill_resources enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_workspaces' and policyname = 'user_workspaces_select_own'
  ) then
    create policy user_workspaces_select_own
      on public.user_workspaces
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_workspaces' and policyname = 'user_workspaces_insert_own'
  ) then
    create policy user_workspaces_insert_own
      on public.user_workspaces
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_workspaces' and policyname = 'user_workspaces_update_own'
  ) then
    create policy user_workspaces_update_own
      on public.user_workspaces
      for update
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_workspaces' and policyname = 'user_workspaces_delete_own'
  ) then
    create policy user_workspaces_delete_own
      on public.user_workspaces
      for delete
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspace_pages' and policyname = 'workspace_pages_select_own'
  ) then
    create policy workspace_pages_select_own
      on public.workspace_pages
      for select
      using (
        exists (
          select 1
          from public.user_workspaces uw
          where uw.id = workspace_pages.workspace_id
            and uw.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspace_pages' and policyname = 'workspace_pages_insert_own'
  ) then
    create policy workspace_pages_insert_own
      on public.workspace_pages
      for insert
      with check (
        exists (
          select 1
          from public.user_workspaces uw
          where uw.id = workspace_pages.workspace_id
            and uw.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspace_pages' and policyname = 'workspace_pages_update_own'
  ) then
    create policy workspace_pages_update_own
      on public.workspace_pages
      for update
      using (
        exists (
          select 1
          from public.user_workspaces uw
          where uw.id = workspace_pages.workspace_id
            and uw.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workspace_pages' and policyname = 'workspace_pages_delete_own'
  ) then
    create policy workspace_pages_delete_own
      on public.workspace_pages
      for delete
      using (
        exists (
          select 1
          from public.user_workspaces uw
          where uw.id = workspace_pages.workspace_id
            and uw.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_widgets' and policyname = 'user_widgets_select_own'
  ) then
    create policy user_widgets_select_own
      on public.user_widgets
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_widgets' and policyname = 'user_widgets_insert_own'
  ) then
    create policy user_widgets_insert_own
      on public.user_widgets
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_widgets' and policyname = 'user_widgets_update_own'
  ) then
    create policy user_widgets_update_own
      on public.user_widgets
      for update
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'user_widgets' and policyname = 'user_widgets_delete_own'
  ) then
    create policy user_widgets_delete_own
      on public.user_widgets
      for delete
      using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'agent_skill_resources' and policyname = 'agent_skill_resources_select_own'
  ) then
    create policy agent_skill_resources_select_own
      on public.agent_skill_resources
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'agent_skill_resources' and policyname = 'agent_skill_resources_insert_own'
  ) then
    create policy agent_skill_resources_insert_own
      on public.agent_skill_resources
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'agent_skill_resources' and policyname = 'agent_skill_resources_update_own'
  ) then
    create policy agent_skill_resources_update_own
      on public.agent_skill_resources
      for update
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'agent_skill_resources' and policyname = 'agent_skill_resources_delete_own'
  ) then
    create policy agent_skill_resources_delete_own
      on public.agent_skill_resources
      for delete
      using (auth.uid() = user_id);
  end if;
end $$;
