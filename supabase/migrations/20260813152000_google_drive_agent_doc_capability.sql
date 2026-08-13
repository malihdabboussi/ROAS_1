BEGIN;

INSERT INTO public.integration_capabilities (
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
VALUES (
  'google_drive',
  'create_google_doc',
  'legacy',
  'Create Google Doc',
  'Create a native Google Doc through the connected Google Drive account and return its document ID and shareable URL.',
  '{"title":{"type":"string","required":true,"description":"Google Doc title"},"html":{"type":"string","required":true,"description":"Document body as semantic HTML"}}'::jsonb,
  '[{"title":"VIP script","html":"<h1>VIP script</h1><p>Final copy.</p>"}]'::jsonb,
  '{"manual_capability_copy":true,"connection_provider":"google_drive","output_contract":{"required_any":["file.id","file.webViewLink"]}}'::jsonb,
  array['shared']::text[],
  '{"method":"POST","path":"/api/integrations/google-drive/files/google-doc"}'::jsonb,
  now()
)
ON CONFLICT (integration_id, action_slug) DO UPDATE SET
  execution_mode = EXCLUDED.execution_mode,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  parameters = EXCLUDED.parameters,
  examples = EXCLUDED.examples,
  metadata = EXCLUDED.metadata,
  domains = EXCLUDED.domains,
  route_config = EXCLUDED.route_config,
  updated_at = now();

COMMIT;
