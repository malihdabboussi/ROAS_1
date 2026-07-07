-- Platform-managed SEO Research via DataForSEO: legacy execution through main API.
select setval(
  'public.project_composio_toolkit_config_id_seq',
  greatest(
    coalesce((select max(id) from public.project_composio_toolkit_config), 0),
    1
  ),
  true
);

select setval(
  'public.integration_capabilities_id_seq',
  greatest(
    coalesce((select max(id) from public.integration_capabilities), 0),
    1
  ),
  true
);

insert into public.project_composio_toolkit_config (
  integration_id,
  toolkit_slug,
  auth_config_id,
  auth_mode,
  enabled,
  metadata
)
values (
  'dataforseo',
  'dataforseo',
  null,
  'managed',
  true,
  jsonb_build_object('execution_mode', 'legacy', 'agent_facing_id', 'seo_research')
)
on conflict (integration_id) do update set
  toolkit_slug = excluded.toolkit_slug,
  auth_mode = excluded.auth_mode,
  enabled = excluded.enabled,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.integration_capabilities (
  integration_id,
  action_slug,
  execution_mode,
  display_name,
  description,
  parameters,
  examples,
  metadata,
  domains,
  route_config,
  updated_at
)
values
  (
    'dataforseo',
    'keyword_overview',
    'legacy',
    'SEO Research keyword overview',
    'Get Google keyword overview metrics for one or more keywords. No user connection required.',
    '{"keywords":{"type":"array","required":true,"items":{"type":"string"}},"location_code":{"type":"number"},"location_name":{"type":"string"},"language_code":{"type":"string"},"language_name":{"type":"string"}}'::jsonb,
    '[]'::jsonb,
    '{"manual_capability_copy":true,"agent_facing_integration_id":"seo_research"}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"POST","path":"/api/integrations/dataforseo/keyword/overview"}'::jsonb,
    now()
  ),
  (
    'dataforseo',
    'keyword_ideas',
    'legacy',
    'SEO Research keyword ideas',
    'Find related Google keyword ideas from seed keywords. No user connection required.',
    '{"keywords":{"type":"array","required":true,"items":{"type":"string"}},"location_code":{"type":"number"},"location_name":{"type":"string"},"language_code":{"type":"string"},"language_name":{"type":"string"},"limit":{"type":"number"},"offset":{"type":"number"}}'::jsonb,
    '[]'::jsonb,
    '{"manual_capability_copy":true,"agent_facing_integration_id":"seo_research"}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"POST","path":"/api/integrations/dataforseo/keyword/ideas"}'::jsonb,
    now()
  ),
  (
    'dataforseo',
    'google_serp',
    'legacy',
    'SEO Research Google organic SERP',
    'Fetch live advanced Google organic SERP results for a keyword. No user connection required.',
    '{"keyword":{"type":"string","required":true},"location_code":{"type":"number"},"location_name":{"type":"string"},"language_code":{"type":"string"},"language_name":{"type":"string"},"depth":{"type":"number"},"device":{"type":"string"},"os":{"type":"string"}}'::jsonb,
    '[]'::jsonb,
    '{"manual_capability_copy":true,"agent_facing_integration_id":"seo_research"}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"POST","path":"/api/integrations/dataforseo/serp/google/organic"}'::jsonb,
    now()
  ),
  (
    'dataforseo',
    'competitors_domain',
    'legacy',
    'SEO Research domain competitors',
    'Find organic Google competitor domains for a target domain. No user connection required.',
    '{"target":{"type":"string","required":true},"intersecting_domains":{"type":"array","items":{"type":"string"}},"filters":{"type":"array"},"location_code":{"type":"number"},"location_name":{"type":"string"},"language_code":{"type":"string"},"language_name":{"type":"string"},"limit":{"type":"number"},"offset":{"type":"number"}}'::jsonb,
    '[]'::jsonb,
    '{"manual_capability_copy":true,"agent_facing_integration_id":"seo_research"}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"POST","path":"/api/integrations/dataforseo/competitors/domain"}'::jsonb,
    now()
  ),
  (
    'dataforseo',
    'backlinks_summary',
    'legacy',
    'SEO Research backlinks summary',
    'Get backlink summary metrics for a target domain or URL. No user connection required.',
    '{"target":{"type":"string","required":true},"internal_list_limit":{"type":"number"},"include_subdomains":{"type":"boolean"},"backlinks_status_type":{"type":"string"}}'::jsonb,
    '[]'::jsonb,
    '{"manual_capability_copy":true,"agent_facing_integration_id":"seo_research"}'::jsonb,
    array['marketing','analyst']::text[],
    '{"method":"POST","path":"/api/integrations/dataforseo/backlinks/summary"}'::jsonb,
    now()
  )
on conflict (integration_id, action_slug) do update set
  execution_mode = excluded.execution_mode,
  display_name = excluded.display_name,
  description = excluded.description,
  parameters = excluded.parameters,
  examples = excluded.examples,
  metadata = excluded.metadata,
  domains = excluded.domains,
  route_config = excluded.route_config,
  updated_at = now();
