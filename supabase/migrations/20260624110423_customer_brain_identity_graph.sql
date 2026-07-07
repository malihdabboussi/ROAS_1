-- ============================================================================
-- Customer Brain Identity Graph
-- Adds first-class customer units and source identities so Customer Brain memory
-- can be contact-linked, account/source-linked, or unlinked-but-durable.
-- ============================================================================

create table if not exists public.customer_entities (
  id uuid primary key default gen_random_uuid(),
  brain_id uuid not null references public.ns_brains(id) on delete cascade,
  owner_id uuid not null,
  org_id uuid,
  entity_key text not null,
  entity_type text not null default 'source_identity',
  display_name text,
  primary_contact_id uuid references public.contacts(id) on delete set null,
  status text not null default 'active',
  merged_into_entity_id uuid references public.customer_entities(id) on delete set null,
  confidence numeric not null default 0.65,
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_entities_entity_type_check
    check (entity_type in ('contact', 'account', 'source_identity', 'anonymous', 'synthetic')),
  constraint customer_entities_status_check
    check (status in ('active', 'merged', 'archived')),
  constraint customer_entities_confidence_check
    check (confidence >= 0 and confidence <= 1),
  constraint customer_entities_brain_entity_key_key unique (brain_id, entity_key)
);

create unique index if not exists customer_entities_brain_primary_contact_key
  on public.customer_entities (brain_id, primary_contact_id)
  where primary_contact_id is not null;

create index if not exists idx_customer_entities_brain_status
  on public.customer_entities (brain_id, status);

create index if not exists idx_customer_entities_contact
  on public.customer_entities (primary_contact_id)
  where primary_contact_id is not null;

alter table public.customer_entities enable row level security;

drop policy if exists customer_entities_access_select on public.customer_entities;
create policy customer_entities_access_select on public.customer_entities
  for select to authenticated
  using (public.can_access_brain(brain_id, 'view'));

drop policy if exists customer_entities_train_insert on public.customer_entities;
create policy customer_entities_train_insert on public.customer_entities
  for insert to authenticated
  with check (public.can_access_brain(brain_id, 'train'));

drop policy if exists customer_entities_train_update on public.customer_entities;
create policy customer_entities_train_update on public.customer_entities
  for update to authenticated
  using (public.can_access_brain(brain_id, 'train'))
  with check (public.can_access_brain(brain_id, 'train'));

drop policy if exists customer_entities_train_delete on public.customer_entities;
create policy customer_entities_train_delete on public.customer_entities
  for delete to authenticated
  using (public.can_access_brain(brain_id, 'train'));

create table if not exists public.customer_source_identities (
  id uuid primary key default gen_random_uuid(),
  brain_id uuid not null references public.ns_brains(id) on delete cascade,
  customer_entity_id uuid references public.customer_entities(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  source_type text not null,
  source_id text not null,
  identity_kind text not null default 'source_id',
  source_label text,
  confidence numeric not null default 0.65,
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_source_identities_confidence_check
    check (confidence >= 0 and confidence <= 1),
  constraint customer_source_identities_brain_source_key
    unique (brain_id, source_type, source_id)
);

create index if not exists idx_customer_source_identities_entity
  on public.customer_source_identities (customer_entity_id)
  where customer_entity_id is not null;

create index if not exists idx_customer_source_identities_contact
  on public.customer_source_identities (contact_id)
  where contact_id is not null;

create index if not exists idx_customer_source_identities_brain_kind
  on public.customer_source_identities (brain_id, identity_kind);

alter table public.customer_source_identities enable row level security;

drop policy if exists customer_source_identities_access_select on public.customer_source_identities;
create policy customer_source_identities_access_select on public.customer_source_identities
  for select to authenticated
  using (public.can_access_brain(brain_id, 'view'));

drop policy if exists customer_source_identities_train_insert on public.customer_source_identities;
create policy customer_source_identities_train_insert on public.customer_source_identities
  for insert to authenticated
  with check (public.can_access_brain(brain_id, 'train'));

drop policy if exists customer_source_identities_train_update on public.customer_source_identities;
create policy customer_source_identities_train_update on public.customer_source_identities
  for update to authenticated
  using (public.can_access_brain(brain_id, 'train'))
  with check (public.can_access_brain(brain_id, 'train'));

drop policy if exists customer_source_identities_train_delete on public.customer_source_identities;
create policy customer_source_identities_train_delete on public.customer_source_identities
  for delete to authenticated
  using (public.can_access_brain(brain_id, 'train'));

alter table public.ns_memories
  add column if not exists customer_entity_id uuid references public.customer_entities(id) on delete set null,
  add column if not exists customer_source_identity_id uuid references public.customer_source_identities(id) on delete set null,
  add column if not exists customer_resolution_status text not null default 'unresolved';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ns_memories_customer_resolution_status_check'
      and conrelid = 'public.ns_memories'::regclass
  ) then
    alter table public.ns_memories
      add constraint ns_memories_customer_resolution_status_check
      check (customer_resolution_status in (
        'linked_contact',
        'linked_entity',
        'unlinked_source',
        'unresolved'
      ));
  end if;
end $$;

create index if not exists idx_ns_memories_customer_entity
  on public.ns_memories (customer_entity_id)
  where customer_entity_id is not null;

create index if not exists idx_ns_memories_customer_source_identity
  on public.ns_memories (customer_source_identity_id)
  where customer_source_identity_id is not null;

create index if not exists idx_ns_memories_brain_customer_resolution
  on public.ns_memories (brain_id, customer_resolution_status);

insert into public.customer_entities (
  brain_id,
  owner_id,
  org_id,
  entity_key,
  entity_type,
  display_name,
  primary_contact_id,
  confidence,
  metadata,
  first_seen_at,
  last_seen_at
)
select
  m.brain_id,
  b.owner_id,
  b.org_id,
  'contact:' || m.contact_id::text,
  'contact',
  coalesce(nullif(trim(c.business_name), ''), nullif(trim(c.email), ''), 'Contact ' || left(m.contact_id::text, 8)),
  m.contact_id,
  1,
  jsonb_build_object('backfilled_from', 'ns_memories.contact_id'),
  min(m.created_at),
  max(m.created_at)
from public.ns_memories m
join public.ns_brains b on b.id = m.brain_id and b.scope = 'customer'
left join public.contacts c on c.id = m.contact_id
where m.contact_id is not null
group by m.brain_id, b.owner_id, b.org_id, m.contact_id, c.business_name, c.email
on conflict (brain_id, entity_key) do update
set
  primary_contact_id = excluded.primary_contact_id,
  display_name = coalesce(public.customer_entities.display_name, excluded.display_name),
  last_seen_at = greatest(public.customer_entities.last_seen_at, excluded.last_seen_at),
  updated_at = now();

with source_rows as (
  select
    m.brain_id,
    b.owner_id,
    b.org_id,
    m.source_type,
    trim(m.source_id) as source_id,
    max(nullif(trim(m.source_title), '')) as source_title,
    min(m.created_at) as first_seen_at,
    max(m.created_at) as last_seen_at
  from public.ns_memories m
  join public.ns_brains b on b.id = m.brain_id and b.scope = 'customer'
  where m.contact_id is null
    and m.source_id is not null
    and trim(m.source_id) <> ''
  group by m.brain_id, b.owner_id, b.org_id, m.source_type, trim(m.source_id)
)
insert into public.customer_entities (
  brain_id,
  owner_id,
  org_id,
  entity_key,
  entity_type,
  display_name,
  confidence,
  metadata,
  first_seen_at,
  last_seen_at
)
select
  brain_id,
  owner_id,
  org_id,
  'source:' || source_type || ':' || source_id,
  'source_identity',
  coalesce(source_title, source_type || ':' || left(source_id, 48)),
  0.65,
  jsonb_build_object(
    'backfilled_from', 'ns_memories.source_id',
    'source_type', source_type,
    'source_id', source_id
  ),
  first_seen_at,
  last_seen_at
from source_rows
on conflict (brain_id, entity_key) do update
set
  display_name = coalesce(public.customer_entities.display_name, excluded.display_name),
  last_seen_at = greatest(public.customer_entities.last_seen_at, excluded.last_seen_at),
  updated_at = now();

with memory_source_groups as (
  select
    m.brain_id,
    m.source_type,
    trim(m.source_id) as source_id,
    max(nullif(trim(m.source_title), '')) as source_label,
    min(m.created_at) as first_seen_at,
    max(m.created_at) as last_seen_at,
    array_remove(array_agg(distinct m.contact_id), null) as contact_ids
  from public.ns_memories m
  join public.ns_brains b on b.id = m.brain_id and b.scope = 'customer'
  where m.source_id is not null
    and trim(m.source_id) <> ''
  group by m.brain_id, m.source_type, trim(m.source_id)
),
memory_sources as (
  select
    brain_id,
    case
      when cardinality(contact_ids) = 1 then contact_ids[1]
      else null
    end as contact_id,
    source_type,
    source_id,
    source_label,
    first_seen_at,
    last_seen_at,
    case
      when cardinality(contact_ids) = 1 then 'contact:' || contact_ids[1]::text
      else 'source:' || source_type || ':' || source_id
    end as entity_key
  from memory_source_groups
)
insert into public.customer_source_identities (
  brain_id,
  customer_entity_id,
  contact_id,
  source_type,
  source_id,
  identity_kind,
  source_label,
  confidence,
  metadata,
  first_seen_at,
  last_seen_at
)
select
  ms.brain_id,
  ce.id,
  ms.contact_id,
  ms.source_type,
  ms.source_id,
  'source_id',
  ms.source_label,
  case when ms.contact_id is not null then 0.9 else 0.65 end,
  jsonb_build_object('backfilled_from', 'ns_memories.source_id'),
  ms.first_seen_at,
  ms.last_seen_at
from memory_sources ms
left join public.customer_entities ce
  on ce.brain_id = ms.brain_id
 and ce.entity_key = ms.entity_key
on conflict (brain_id, source_type, source_id) do update
set
  customer_entity_id = coalesce(public.customer_source_identities.customer_entity_id, excluded.customer_entity_id),
  contact_id = coalesce(public.customer_source_identities.contact_id, excluded.contact_id),
  source_label = coalesce(public.customer_source_identities.source_label, excluded.source_label),
  last_seen_at = greatest(public.customer_source_identities.last_seen_at, excluded.last_seen_at),
  updated_at = now();

update public.ns_memories m
set
  customer_entity_id = ce.id,
  customer_resolution_status = case
    when m.contact_id is not null then 'linked_contact'
    when m.source_id is not null and trim(m.source_id) <> '' then 'unlinked_source'
    else customer_resolution_status
  end
from public.ns_brains b
join public.customer_entities ce on ce.brain_id = b.id
where b.id = m.brain_id
  and b.scope = 'customer'
  and ce.entity_key = case
    when m.contact_id is not null then 'contact:' || m.contact_id::text
    when m.source_id is not null and trim(m.source_id) <> '' then 'source:' || m.source_type || ':' || trim(m.source_id)
    else null
  end;

update public.ns_memories m
set
  customer_source_identity_id = csi.id,
  customer_entity_id = coalesce(m.customer_entity_id, csi.customer_entity_id),
  customer_resolution_status = case
    when m.contact_id is not null then 'linked_contact'
    else 'unlinked_source'
  end
from public.customer_source_identities csi
join public.ns_brains b on b.id = csi.brain_id and b.scope = 'customer'
where csi.brain_id = m.brain_id
  and csi.source_type = m.source_type
  and csi.source_id = m.source_id;

create or replace view public.customer_memory_identity_view
with (security_invoker = true)
as
select
  m.id as memory_id,
  m.brain_id,
  m.content,
  m.memory_type,
  m.contact_id,
  m.customer_entity_id,
  m.customer_source_identity_id,
  m.customer_resolution_status,
  coalesce(ce.entity_key, case
    when m.contact_id is not null then 'contact:' || m.contact_id::text
    when m.source_id is not null and trim(m.source_id) <> '' then 'source:' || m.source_type || ':' || trim(m.source_id)
    else 'memory:' || m.id::text
  end) as customer_unit_key,
  ce.entity_type as customer_unit_type,
  ce.display_name as customer_unit_name,
  csi.identity_kind,
  m.source_type,
  m.source_id,
  m.source_title,
  m.created_at
from public.ns_memories m
join public.ns_brains b on b.id = m.brain_id and b.scope = 'customer'
left join public.customer_entities ce on ce.id = m.customer_entity_id
left join public.customer_source_identities csi on csi.id = m.customer_source_identity_id;

create or replace view public.customer_brain_units
with (security_invoker = true)
as
select
  ce.id,
  ce.brain_id,
  ce.entity_key,
  ce.entity_type,
  ce.display_name,
  ce.primary_contact_id,
  ce.status,
  ce.confidence,
  count(m.id)::integer as memory_count,
  max(m.created_at) as last_memory_at,
  ce.first_seen_at,
  ce.last_seen_at,
  ce.metadata
from public.customer_entities ce
left join public.ns_memories m on m.customer_entity_id = ce.id
group by ce.id;
