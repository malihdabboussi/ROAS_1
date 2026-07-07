create table if not exists public.project_composio_toolkit_config (
  id bigserial primary key,
  integration_id text not null unique,
  toolkit_slug text not null,
  auth_config_id text,
  auth_mode text not null default 'managed' check (auth_mode in ('managed', 'custom')),
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on table public.project_composio_toolkit_config to authenticated;

insert into public.project_composio_toolkit_config (
  integration_id,
  toolkit_slug,
  auth_config_id,
  auth_mode,
  enabled,
  metadata
)
values
  ('github', 'github', 'ac_6TYl16SEzUsO', 'managed', true, '{}'::jsonb),
  ('slack', 'slack', 'ac_lTwP2-pZdStb', 'managed', true, '{}'::jsonb),
  ('google_drive', 'googledrive', 'ac_UUEYC42ZM1Zs', 'managed', true, '{}'::jsonb),
  ('linkedin', 'linkedin', 'ac_OhHD5NfBGuiB', 'managed', true, '{}'::jsonb),
  ('instagram', 'instagram', 'ac_gEL9MnEogftm', 'managed', true, '{}'::jsonb),
  ('youtube', 'youtube', 'ac_v1bqeED_NJeu', 'managed', true, '{}'::jsonb),
  ('twitter', 'twitter', null, 'custom', false, jsonb_build_object('reason', 'custom_auth_required')),
  ('tiktok', 'tiktok', null, 'custom', false, jsonb_build_object('reason', 'custom_auth_required'))
on conflict (integration_id)
do update set
  toolkit_slug = excluded.toolkit_slug,
  auth_config_id = excluded.auth_config_id,
  auth_mode = excluded.auth_mode,
  enabled = excluded.enabled,
  metadata = excluded.metadata,
  updated_at = now();
