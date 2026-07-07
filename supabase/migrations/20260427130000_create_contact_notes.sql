-- Contact notes: manual notes attached to a contact's activity timeline
create table if not exists contact_notes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references contacts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_notes_contact_id on contact_notes(contact_id);
create index if not exists idx_contact_notes_org_id on contact_notes(org_id);

alter table contact_notes enable row level security;

create policy "Users can read notes in their org or personal"
  on contact_notes for select
  using (
    (org_id is not null and org_id in (select om.org_id from org_members om where om.user_id = auth.uid()))
    or
    (org_id is null and user_id = auth.uid())
  );

create policy "Users can insert notes in their org or personal"
  on contact_notes for insert
  with check (
    auth.uid() = user_id
    and (
      (org_id is not null and org_id in (select om.org_id from org_members om where om.user_id = auth.uid()))
      or
      (org_id is null)
    )
  );
