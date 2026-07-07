create table if not exists public.user_widget_folders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, name)
);

create index if not exists idx_user_widget_folders_user
  on public.user_widget_folders (user_id, sort_order);

alter table public.user_widgets
  add column if not exists folder_id uuid references public.user_widget_folders(id) on delete set null;

create index if not exists idx_user_widgets_folder_id
  on public.user_widgets (folder_id) where folder_id is not null;

alter table public.user_widget_folders enable row level security;

create policy "Users can manage their own widget folders"
  on public.user_widget_folders for all using (auth.uid() = user_id);
