-- Platform-managed ScrapeCreators: legacy execution (agent-api proxies to main API with user JWT).
insert into public.project_composio_toolkit_config (
  integration_id,
  toolkit_slug,
  auth_config_id,
  auth_mode,
  enabled,
  metadata
)
values (
  'scrapecreators',
  'scrapecreators',
  null,
  'managed',
  true,
  jsonb_build_object('execution_mode', 'legacy')
)
on conflict (integration_id) do update set
  toolkit_slug = excluded.toolkit_slug,
  enabled = excluded.enabled,
  metadata = excluded.metadata,
  updated_at = now();

comment on column public.integration_capabilities.metadata is
  'JSON metadata. When manual_capability_copy is true, Composio syncCapabilities preserves display_name and description for that row.';
