-- Browser sessions rollout (Phase 1): state tracking + consent + server-driven domain config.

alter table public.browser_sessions
  add column if not exists disabled_at timestamptz,
  add column if not exists first_synced_at timestamptz,
  add column if not exists min_expires_at timestamptz;

create index if not exists browser_sessions_min_expires_at_idx
  on public.browser_sessions (min_expires_at)
  where min_expires_at is not null;

alter table public.profiles
  add column if not exists browser_session_consent_at timestamptz;

create table if not exists public.browser_session_domain_config (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  enabled boolean not null default true,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.browser_session_domain_config enable row level security;

create policy "Anyone authenticated can read domain config"
  on public.browser_session_domain_config for select
  to authenticated
  using (true);

insert into public.browser_session_domain_config (domain, enabled)
values
  ('instagram.com', true),
  ('facebook.com', true),
  ('x.com', true),
  ('twitter.com', true),
  ('tiktok.com', true),
  ('linkedin.com', true),
  ('youtube.com', true),
  ('reddit.com', true)
on conflict (domain) do nothing;
