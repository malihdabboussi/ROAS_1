-- Per-action HTTP routing for legacy integrations (agent-api use_integration → main API).
alter table public.integration_capabilities
  add column if not exists route_config jsonb;

comment on column public.integration_capabilities.route_config is
  'JSON: { method, path, query_params?, fixed_query?, alt_path?, alt_when?, query_remainder? }. Used by agent-api to proxy legacy integration actions.';
