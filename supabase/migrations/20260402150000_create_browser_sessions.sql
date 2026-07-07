create table if not exists public.browser_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  domain text not null,
  encrypted_cookies text not null,
  cookie_count int not null default 0,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists browser_sessions_user_domain_idx
  on public.browser_sessions (user_id, domain) where org_id is null;
create unique index if not exists browser_sessions_user_org_domain_idx
  on public.browser_sessions (user_id, org_id, domain) where org_id is not null;

alter table public.browser_sessions enable row level security;

create policy "Users can manage their own browser sessions"
  on public.browser_sessions for all
  using (auth.uid() = user_id);
