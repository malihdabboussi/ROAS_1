alter table if exists public.ns_memories
  add column if not exists media_type text default 'text',
  add column if not exists media_url text,
  add column if not exists media_mime_type text;

alter table if exists public.campaign_nodes
  add column if not exists media_type text default 'text',
  add column if not exists media_url text,
  add column if not exists media_mime_type text;

alter table if exists public.ns_sk_entries
  add column if not exists media_type text default 'text',
  add column if not exists media_url text,
  add column if not exists media_mime_type text;
