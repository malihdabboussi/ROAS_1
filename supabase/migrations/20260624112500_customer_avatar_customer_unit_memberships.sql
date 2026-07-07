-- ============================================================================
-- Customer Avatar Customer-Unit Memberships
-- Keeps legacy member_contact_ids as a projection while adding source-aware
-- customer-unit membership for contactless Customer Brain synthesis.
-- ============================================================================

alter table public.customer_avatars
  add column if not exists member_customer_unit_ids uuid[] not null default '{}';

create index if not exists idx_customer_avatars_member_customer_units
  on public.customer_avatars using gin (member_customer_unit_ids);

create table if not exists public.customer_avatar_memberships (
  id uuid primary key default gen_random_uuid(),
  avatar_id uuid not null references public.customer_avatars(id) on delete cascade,
  brain_id uuid not null references public.ns_brains(id) on delete cascade,
  member_key text not null,
  member_kind text not null default 'customer_entity',
  customer_entity_id uuid references public.customer_entities(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  customer_source_identity_id uuid references public.customer_source_identities(id) on delete set null,
  strength numeric not null default 0.7,
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_avatar_memberships_kind_check
    check (member_kind in ('contact', 'customer_entity', 'source_identity')),
  constraint customer_avatar_memberships_strength_check
    check (strength >= 0 and strength <= 1),
  constraint customer_avatar_memberships_avatar_member_key
    unique (avatar_id, member_key)
);

create index if not exists idx_customer_avatar_memberships_brain
  on public.customer_avatar_memberships (brain_id);

create index if not exists idx_customer_avatar_memberships_entity
  on public.customer_avatar_memberships (customer_entity_id)
  where customer_entity_id is not null;

create index if not exists idx_customer_avatar_memberships_contact
  on public.customer_avatar_memberships (contact_id)
  where contact_id is not null;

create index if not exists idx_customer_avatar_memberships_source_identity
  on public.customer_avatar_memberships (customer_source_identity_id)
  where customer_source_identity_id is not null;

alter table public.customer_avatar_memberships enable row level security;

drop policy if exists customer_avatar_memberships_access_select on public.customer_avatar_memberships;
create policy customer_avatar_memberships_access_select on public.customer_avatar_memberships
  for select to authenticated
  using (public.can_access_brain(brain_id, 'view'));

drop policy if exists customer_avatar_memberships_train_insert on public.customer_avatar_memberships;
create policy customer_avatar_memberships_train_insert on public.customer_avatar_memberships
  for insert to authenticated
  with check (public.can_access_brain(brain_id, 'train'));

drop policy if exists customer_avatar_memberships_train_update on public.customer_avatar_memberships;
create policy customer_avatar_memberships_train_update on public.customer_avatar_memberships
  for update to authenticated
  using (public.can_access_brain(brain_id, 'train'))
  with check (public.can_access_brain(brain_id, 'train'));

drop policy if exists customer_avatar_memberships_train_delete on public.customer_avatar_memberships;
create policy customer_avatar_memberships_train_delete on public.customer_avatar_memberships
  for delete to authenticated
  using (public.can_access_brain(brain_id, 'train'));

with avatar_contacts as (
  select
    ca.id as avatar_id,
    ca.brain_id,
    unnest(coalesce(ca.member_contact_ids, '{}'::uuid[])) as contact_id
  from public.customer_avatars ca
)
insert into public.customer_avatar_memberships (
  avatar_id,
  brain_id,
  member_key,
  member_kind,
  customer_entity_id,
  contact_id,
  strength,
  metadata,
  first_seen_at,
  last_seen_at
)
select
  ac.avatar_id,
  ac.brain_id,
  coalesce(ce.id::text, ac.contact_id::text) as member_key,
  case when ce.id is not null then 'customer_entity' else 'contact' end as member_kind,
  ce.id as customer_entity_id,
  ac.contact_id,
  0.7,
  jsonb_build_object('backfilled_from', 'customer_avatars.member_contact_ids'),
  now(),
  now()
from avatar_contacts ac
left join public.customer_entities ce
  on ce.brain_id = ac.brain_id
  and ce.primary_contact_id = ac.contact_id
on conflict (avatar_id, member_key) do update
set
  customer_entity_id = coalesce(public.customer_avatar_memberships.customer_entity_id, excluded.customer_entity_id),
  contact_id = coalesce(public.customer_avatar_memberships.contact_id, excluded.contact_id),
  last_seen_at = greatest(public.customer_avatar_memberships.last_seen_at, excluded.last_seen_at),
  updated_at = now();

update public.customer_avatars ca
set
  member_customer_unit_ids = coalesce(unit_ids.ids, '{}'::uuid[]),
  updated_at = now()
from (
  select
    avatar_id,
    array_agg(customer_entity_id order by customer_entity_id) filter (where customer_entity_id is not null) as ids
  from public.customer_avatar_memberships
  group by avatar_id
) unit_ids
where ca.id = unit_ids.avatar_id;

