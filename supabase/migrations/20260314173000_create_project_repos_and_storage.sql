create table if not exists public.project_repos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid references public.user_workspaces(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  name text not null,
  description text,
  storage_path text not null,
  entry_point text not null default 'src/App.tsx',
  dependencies jsonb not null default '{}'::jsonb,
  manifest jsonb not null default '{}'::jsonb,
  source text not null default 'agent' check (source in ('github', 'agent', 'upload')),
  source_meta jsonb not null default '{}'::jsonb,
  status text not null default 'ready' check (status in ('building', 'ready', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_project_repos_user_updated
  on public.project_repos (user_id, updated_at desc);

create index if not exists idx_project_repos_workspace
  on public.project_repos (workspace_id);

alter table public.project_repos enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'project_repos' and policyname = 'project_repos_select_own'
  ) then
    create policy project_repos_select_own
      on public.project_repos
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'project_repos' and policyname = 'project_repos_insert_own'
  ) then
    create policy project_repos_insert_own
      on public.project_repos
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'project_repos' and policyname = 'project_repos_update_own'
  ) then
    create policy project_repos_update_own
      on public.project_repos
      for update
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'project_repos' and policyname = 'project_repos_delete_own'
  ) then
    create policy project_repos_delete_own
      on public.project_repos
      for delete
      using (auth.uid() = user_id);
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit)
values ('projects', 'projects', false, 10485760)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'projects_bucket_user_folder_access'
  ) then
    create policy projects_bucket_user_folder_access
      on storage.objects
      for all
      using (
        bucket_id = 'projects' and
        auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'projects_bucket_service_role_access'
  ) then
    create policy projects_bucket_service_role_access
      on storage.objects
      for all
      using (
        bucket_id = 'projects' and
        auth.role() = 'service_role'
      );
  end if;
end $$;

create or replace function public.update_project_repos_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists project_repos_updated_at on public.project_repos;

create trigger project_repos_updated_at
  before update on public.project_repos
  for each row execute function public.update_project_repos_timestamp();
