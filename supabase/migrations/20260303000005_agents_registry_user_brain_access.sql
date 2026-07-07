alter table if exists public.agents_registry
  add column if not exists user_brain_access boolean not null default false;
