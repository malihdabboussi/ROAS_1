alter table public.user_widgets
  add column if not exists folder text;

create index if not exists idx_user_widgets_folder
  on public.user_widgets (user_id, folder) where folder is not null;
