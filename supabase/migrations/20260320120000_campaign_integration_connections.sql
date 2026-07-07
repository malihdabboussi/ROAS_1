-- Per-user multi-connect toggle + campaign-scoped Composio connection rows

alter table public.user_integrations
  add column if not exists multi_connect_enabled boolean not null default false;

create table if not exists public.campaign_integration_connections (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  integration_id text not null,
  provider text not null,
  status text not null default 'pending'
    check (status in ('pending', 'connected', 'error', 'disconnected')),
  composio_connected_account_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, integration_id)
);

create index if not exists idx_campaign_integration_connections_user_campaign
  on public.campaign_integration_connections (user_id, campaign_id);

alter table public.campaign_integration_connections enable row level security;

create policy "Users manage own campaign integration connections"
  on public.campaign_integration_connections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Service role full access campaign_integration_connections"
  on public.campaign_integration_connections
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop trigger if exists set_updated_at_campaign_integration_connections on public.campaign_integration_connections;
create trigger set_updated_at_campaign_integration_connections
  before update on public.campaign_integration_connections
  for each row execute function update_updated_at();
