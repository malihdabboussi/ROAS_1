-- Enable Open in Canva: catalog row + Composio toolkit auth config.
-- Without integrations_available.canva, user_integrations inserts fail FK.
-- Without project_composio_toolkit_config, connect returns "No Composio toolkit config".

INSERT INTO public.integrations_available (
  id,
  provider,
  name,
  description,
  auth_type,
  is_available,
  metadata
)
VALUES (
  'canva',
  'canva',
  'Canva',
  'Connect Canva to open Vibey images in the Canva editor.',
  'oauth2',
  true,
  jsonb_build_object('managed_by', 'composio')
)
ON CONFLICT (id) DO UPDATE
SET
  provider = EXCLUDED.provider,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  auth_type = EXCLUDED.auth_type,
  is_available = EXCLUDED.is_available,
  metadata = EXCLUDED.metadata,
  updated_at = now();

INSERT INTO public.project_composio_toolkit_config (
  integration_id,
  toolkit_slug,
  auth_config_id,
  enabled,
  auth_mode,
  metadata
)
VALUES (
  'canva',
  'canva',
  'ac_e32H0UL2jumI',
  true,
  'managed',
  jsonb_build_object('managed_by', 'composio')
)
ON CONFLICT (integration_id) DO UPDATE
SET
  toolkit_slug = EXCLUDED.toolkit_slug,
  auth_config_id = EXCLUDED.auth_config_id,
  enabled = EXCLUDED.enabled,
  auth_mode = EXCLUDED.auth_mode,
  metadata = EXCLUDED.metadata,
  updated_at = now();
