alter table public.org_members
  add column if not exists ai_data_admin boolean not null default false;

update public.org_members
set ai_data_admin = true
where role = 'owner';

create table if not exists public.ai_data_access_audit (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  org_member_id uuid references public.org_members(id) on delete set null,
  user_id uuid,
  surface text not null check (surface in ('slack', 'ai_chat', 'api')),
  resource_type text not null,
  resource_id text,
  outcome text not null check (outcome in ('allowed', 'denied')),
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_data_access_audit_org_created
  on public.ai_data_access_audit(org_id, created_at desc);

create index if not exists idx_ai_data_access_audit_user_created
  on public.ai_data_access_audit(user_id, created_at desc);

alter table public.ai_data_access_audit enable row level security;

drop policy if exists "Service role manages AI data access audit"
  on public.ai_data_access_audit;

create policy "Service role manages AI data access audit"
  on public.ai_data_access_audit
  for all
  to service_role
  using (true)
  with check (true);
