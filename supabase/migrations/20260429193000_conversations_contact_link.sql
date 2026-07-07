-- Link agent conversations to CRM contacts when identity is known.
alter table public.conversations
  add column if not exists contact_id uuid references public.contacts(id) on delete set null;

create index if not exists idx_conversations_contact_id
  on public.conversations(contact_id)
  where contact_id is not null;
