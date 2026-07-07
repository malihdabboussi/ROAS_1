-- ============================================================================
-- Migration: Contacts CRM fields
-- Purpose:
-- - Support legacy-style Contacts/CRM UI (status pills, filters, columns)
-- - Keep source-of-truth in `contacts` (not `leads`)
-- ============================================================================

alter table public.contacts
add column if not exists contact_type text not null default 'lead';

alter table public.contacts
add column if not exists contact_source text;

alter table public.contacts
add column if not exists is_archived boolean not null default false;

alter table public.contacts
add column if not exists archived_at timestamptz;

-- Optional fields surfaced in legacy UI filters/columns
alter table public.contacts
add column if not exists business_name text;

alter table public.contacts
add column if not exists website text;

alter table public.contacts
add column if not exists city text;

alter table public.contacts
add column if not exists state text;

alter table public.contacts
add column if not exists country text;

