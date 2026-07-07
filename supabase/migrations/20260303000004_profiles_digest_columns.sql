alter table if exists public.profiles
  add column if not exists daily_digest_enabled boolean not null default false;

alter table if exists public.profiles
  add column if not exists daily_digest_time text not null default '08:00';
