-- Team members invite and permissions foundation
-- Includes: team tables, org shared skills, indexes, helper functions, and base RLS.

create table if not exists public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  role text not null check (role in ('editor', 'viewer')),
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  invited_by uuid references auth.users(id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('editor', 'viewer')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, user_id)
);

create table if not exists public.team_campaign_permissions (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  permission text not null check (permission in ('view', 'edit')),
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (team_member_id, campaign_id)
);

create table if not exists public.team_brain_permissions (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  brain_id uuid not null references public.ns_brains(id) on delete cascade,
  permission text not null check (permission in ('view', 'edit')),
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (team_member_id, brain_id)
);

create table if not exists public.team_member_credit_limits (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null unique references public.team_members(id) on delete cascade,
  limit_type text not null check (limit_type in ('daily', 'weekly', 'monthly')),
  limit_amount integer not null check (limit_amount >= 0),
  current_usage integer not null default 0 check (current_usage >= 0),
  period_start timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_member_credit_log (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid references public.team_members(id) on delete set null,
  owner_id uuid not null references public.profiles(id),
  credits_used integer not null check (credits_used >= 0),
  operation text not null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.org_shared_skills (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  skill_name text not null,
  skill_content text not null,
  skill_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, skill_name)
);

-- Indexes for helper-function and policy lookup paths.
create index if not exists idx_team_members_user_id on public.team_members(user_id) where status = 'active';
create index if not exists idx_team_members_owner_id on public.team_members(owner_id) where status = 'active';

create index if not exists idx_team_campaign_perms_member_campaign on public.team_campaign_permissions(team_member_id, campaign_id);
create index if not exists idx_team_campaign_perms_campaign on public.team_campaign_permissions(campaign_id);

create index if not exists idx_team_brain_perms_member on public.team_brain_permissions(team_member_id);
create index if not exists idx_team_brain_perms_brain on public.team_brain_permissions(brain_id);

create index if not exists idx_team_invitations_token_pending on public.team_invitations(token) where status = 'pending';
create index if not exists idx_team_invitations_email_status on public.team_invitations(email, status);
create index if not exists idx_team_invitations_owner_id on public.team_invitations(owner_id);

create index if not exists idx_team_credit_limits_member on public.team_member_credit_limits(team_member_id);
create index if not exists idx_team_credit_log_member_created on public.team_member_credit_log(team_member_id, created_at);
create index if not exists idx_team_credit_log_owner_created on public.team_member_credit_log(owner_id, created_at);

create index if not exists idx_org_shared_skills_owner on public.org_shared_skills(owner_id);

-- Existing table indexes needed for new permission checks.
create index if not exists idx_campaigns_user_id on public.campaigns(user_id);
create index if not exists idx_missions_campaign_id on public.missions(campaign_id) where campaign_id is not null;
create index if not exists idx_campaign_agents_campaign_id on public.campaign_agents(campaign_id);

-- Team helper functions.
create or replace function public.has_team_campaign_access(
  p_campaign_id uuid,
  p_min_permission text default 'view'
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.team_members tm
    join public.team_campaign_permissions tcp on tcp.team_member_id = tm.id
    where tm.user_id = auth.uid()
      and tm.status = 'active'
      and tcp.campaign_id = p_campaign_id
      and (p_min_permission = 'view' or tcp.permission = 'edit')
  );
$$;

create or replace function public.is_team_member_of(p_owner_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.team_members
    where user_id = auth.uid()
      and owner_id = p_owner_id
      and status = 'active'
  );
$$;

create or replace function public.get_campaign_owner(p_campaign_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select user_id
  from public.campaigns
  where id = p_campaign_id;
$$;

create or replace function public.has_team_brain_access(
  p_brain_id uuid,
  p_min_permission text default 'view'
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.team_members tm
    join public.team_brain_permissions tbp on tbp.team_member_id = tm.id
    where tm.user_id = auth.uid()
      and tm.status = 'active'
      and tbp.brain_id = p_brain_id
      and (p_min_permission = 'view' or tbp.permission = 'edit')
  );
$$;

create or replace function public.has_team_agent_brain_access(
  p_brain_id uuid,
  p_min_permission text default 'view'
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.ns_brains b
    join public.campaign_agents ca on ca.agent_key = b.agent_id and ca.user_id = b.owner_id
    join public.team_campaign_permissions tcp on tcp.campaign_id = ca.campaign_id
    join public.team_members tm on tm.id = tcp.team_member_id
    where b.id = p_brain_id
      and b.agent_id is not null
      and tm.user_id = auth.uid()
      and tm.status = 'active'
      and (p_min_permission = 'view' or tcp.permission = 'edit')
  );
$$;

alter table public.team_invitations enable row level security;
alter table public.team_members enable row level security;
alter table public.team_campaign_permissions enable row level security;
alter table public.team_brain_permissions enable row level security;
alter table public.team_member_credit_limits enable row level security;
alter table public.team_member_credit_log enable row level security;
alter table public.org_shared_skills enable row level security;

-- Invitations: owner manages invites; invitee can view own pending invite by email.
drop policy if exists team_invitations_owner_all on public.team_invitations;
create policy team_invitations_owner_all
  on public.team_invitations for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists team_invitations_invitee_read on public.team_invitations;
create policy team_invitations_invitee_read
  on public.team_invitations for select
  using (
    status = 'pending'
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- Team members: owner manages, member can read own membership rows.
drop policy if exists team_members_owner_all on public.team_members;
create policy team_members_owner_all
  on public.team_members for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists team_members_member_read on public.team_members;
create policy team_members_member_read
  on public.team_members for select
  using (user_id = auth.uid());

-- Campaign permissions: owner manages, member can read own permission rows.
drop policy if exists team_campaign_permissions_owner_all on public.team_campaign_permissions;
create policy team_campaign_permissions_owner_all
  on public.team_campaign_permissions for all
  using (
    exists (
      select 1
      from public.team_members tm
      where tm.id = team_member_id
        and tm.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.team_members tm
      where tm.id = team_member_id
        and tm.owner_id = auth.uid()
    )
  );

drop policy if exists team_campaign_permissions_member_read on public.team_campaign_permissions;
create policy team_campaign_permissions_member_read
  on public.team_campaign_permissions for select
  using (
    exists (
      select 1
      from public.team_members tm
      where tm.id = team_member_id
        and tm.user_id = auth.uid()
    )
  );

-- Brain permissions: owner manages, member can read own permission rows.
drop policy if exists team_brain_permissions_owner_all on public.team_brain_permissions;
create policy team_brain_permissions_owner_all
  on public.team_brain_permissions for all
  using (
    exists (
      select 1
      from public.team_members tm
      where tm.id = team_member_id
        and tm.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.team_members tm
      where tm.id = team_member_id
        and tm.owner_id = auth.uid()
    )
  );

drop policy if exists team_brain_permissions_member_read on public.team_brain_permissions;
create policy team_brain_permissions_member_read
  on public.team_brain_permissions for select
  using (
    exists (
      select 1
      from public.team_members tm
      where tm.id = team_member_id
        and tm.user_id = auth.uid()
    )
  );

-- Credit limits and logs: owner manages, member can read own usage/limits.
drop policy if exists team_member_credit_limits_owner_all on public.team_member_credit_limits;
create policy team_member_credit_limits_owner_all
  on public.team_member_credit_limits for all
  using (
    exists (
      select 1
      from public.team_members tm
      where tm.id = team_member_id
        and tm.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.team_members tm
      where tm.id = team_member_id
        and tm.owner_id = auth.uid()
    )
  );

drop policy if exists team_member_credit_limits_member_read on public.team_member_credit_limits;
create policy team_member_credit_limits_member_read
  on public.team_member_credit_limits for select
  using (
    exists (
      select 1
      from public.team_members tm
      where tm.id = team_member_id
        and tm.user_id = auth.uid()
    )
  );

drop policy if exists team_member_credit_log_owner_all on public.team_member_credit_log;
create policy team_member_credit_log_owner_all
  on public.team_member_credit_log for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists team_member_credit_log_member_read on public.team_member_credit_log;
create policy team_member_credit_log_member_read
  on public.team_member_credit_log for select
  using (
    exists (
      select 1
      from public.team_members tm
      where tm.id = team_member_id
        and tm.user_id = auth.uid()
    )
  );

-- Organization shared skills.
drop policy if exists org_shared_skills_owner_all on public.org_shared_skills;
create policy org_shared_skills_owner_all
  on public.org_shared_skills for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists org_shared_skills_team_read on public.org_shared_skills;
create policy org_shared_skills_team_read
  on public.org_shared_skills for select
  using (public.is_team_member_of(owner_id));
