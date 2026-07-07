-- Remove legacy Dashboards / Widgets feature (replaced by Projects)
-- Tables: user_workspaces, workspace_pages, user_widgets, user_widget_folders
-- Also: workspace_id FK on project_repos

-- 1. Drop workspace_id column from project_repos (FK → user_workspaces)
drop index if exists idx_project_repos_workspace;
alter table public.project_repos drop column if exists workspace_id;

-- 2. Drop child tables first (FK order)

-- user_widget_folders
drop policy if exists "Users can manage own widget folders" on public.user_widget_folders;
drop policy if exists "Org members can view widget folders" on public.user_widget_folders;
drop policy if exists "Org members can manage widget folders" on public.user_widget_folders;
drop table if exists public.user_widget_folders cascade;

-- user_widgets
drop policy if exists "Users can manage own widgets" on public.user_widgets;
drop policy if exists "Org members can view widgets" on public.user_widgets;
drop policy if exists "Org members can manage widgets" on public.user_widgets;
drop table if exists public.user_widgets cascade;

-- workspace_pages
drop policy if exists "Users can manage own workspace pages" on public.workspace_pages;
drop policy if exists "Org members can view workspace pages" on public.workspace_pages;
drop policy if exists "Org members can manage workspace pages" on public.workspace_pages;
drop table if exists public.workspace_pages cascade;

-- 3. Drop parent table
drop policy if exists "Users can manage own workspace" on public.user_workspaces;
drop policy if exists "Org members can view workspaces" on public.user_workspaces;
drop policy if exists "Org members can manage workspaces" on public.user_workspaces;
drop table if exists public.user_workspaces cascade;
